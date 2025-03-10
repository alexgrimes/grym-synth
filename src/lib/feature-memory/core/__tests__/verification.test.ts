import { MetricsCollector } from '../metrics-collector';
import { PatternRecognizer } from '../pattern-recognizer';
import { PatternStorage } from '../pattern-storage';
import { HealthMonitor } from '../health-monitor';
import { Pattern, SearchCriteria } from '../types';

const calculateP95 = (samples: number[]): number => {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index];
};

const createTestPattern = (id: number): Pattern => ({
  id: `test_${id}`,
  features: new Map<string, any>([
    ['type', 'test'],
    ['category', 'unit_test'],
    ['value', id.toString()]
  ]),
  confidence: 0.9,
  timestamp: new Date(),
  metadata: {
    source: 'test',
    category: 'test',
    frequency: 1,
    lastUpdated: new Date()
  }
});

describe('Feature Memory System Verification', () => {
  let metrics: MetricsCollector;
  let recognizer: PatternRecognizer;
  let storage: PatternStorage;
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    metrics = new MetricsCollector();
    recognizer = new PatternRecognizer({
      cacheSize: 1000,
      threshold: 0.8,
      maxPatterns: 10000
    });
    storage = new PatternStorage({
      cacheSizeLimit: 1000,
      persistenceEnabled: false
    });
    healthMonitor = new HealthMonitor(metrics);
  });

  describe('Performance Metrics Verification', () => {
    it('should meet recognition latency targets', async () => {
      const samples: number[] = [];
      const pattern = createTestPattern(1);

      // Warm-up phase
      await recognizer.recognizePatterns(pattern.features);

      // Test phase
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        await recognizer.recognizePatterns(pattern.features);
        samples.push(performance.now() - start);
      }

      const average = samples.reduce((a, b) => a + b) / samples.length;
      const p95 = calculateP95(samples);

      expect(average).toBeLessThan(50); // 50ms target
      expect(p95).toBeLessThan(100); // 100ms P95 target
    });

    it('should meet storage latency targets', async () => {
      const samples: number[] = [];
      
      // Warm-up phase
      await storage.store(createTestPattern(0));

      // Test phase
      for (let i = 0; i < 1000; i++) {
        const pattern = createTestPattern(i + 1);
        const start = performance.now();
        await storage.store(pattern);
        samples.push(performance.now() - start);
      }

      const average = samples.reduce((a, b) => a + b) / samples.length;
      const p95 = calculateP95(samples);

      expect(average).toBeLessThan(20); // 20ms target
      expect(p95).toBeLessThan(50); // 50ms P95 target
    });
  });

  describe('Memory Management Verification', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const patterns = Array.from({ length: 10000 }, (_, i) => createTestPattern(i));

      // Process patterns in batches to measure memory stability
      for (let i = 0; i < patterns.length; i += 100) {
        const batch = patterns.slice(i, i + 100);
        await Promise.all(batch.map(p => storage.store(p)));

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (currentMemory - initialMemory) / 1024 / 1024; // MB
        
        expect(memoryIncrease).toBeLessThan(200); // 200MB limit
      }
    });

    it('should properly manage cache size', async () => {
      const cacheSizeLimit = 1000;
      const patterns = Array.from({ length: cacheSizeLimit * 2 }, (_, i) => 
        createTestPattern(i)
      );

      // Fill cache beyond limit
      await Promise.all(patterns.map(p => storage.store(p)));

      // Verify recently stored patterns are accessible
      const recentPattern = patterns[patterns.length - 1];
      const result = await storage.retrieve(recentPattern.id);
      expect(result.data).toBeDefined();

      // Verify old patterns were evicted
      const oldPattern = patterns[0];
      const oldResult = await storage.retrieve(oldPattern.id);
      expect(oldResult.data).toBeNull();
    });
  });

  describe('Error Handling Verification', () => {
    it('should maintain performance during error recovery', async () => {
      const validPattern = createTestPattern(1);
      const invalidPattern = { ...validPattern, confidence: 2 };
      const samples: number[] = [];

      // Generate errors
      for (let i = 0; i < 50; i++) {
        await storage.store(invalidPattern).catch(() => {});
      }

      // Measure performance during recovery
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await storage.store(validPattern);
        samples.push(performance.now() - start);
      }

      const average = samples.reduce((a, b) => a + b) / samples.length;
      expect(average).toBeLessThan(30); // 30ms during recovery
    });

    it('should handle concurrent errors gracefully', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        i % 2 === 0
          ? storage.store({ ...createTestPattern(i), confidence: 2 }).catch(() => {})
          : storage.store(createTestPattern(i))
      );

      const results = await Promise.all(operations);
      const validResults = results.filter(r => r !== undefined);
      
      expect(validResults.length).toBe(50); // Half of operations should succeed
      expect(healthMonitor.checkHealth().status).not.toBe('unhealthy');
    });
  });

  describe('Load Testing Verification', () => {
    it('should handle high concurrent load', async () => {
      const concurrentOperations = 1000;
      const startTime = performance.now();
      
      const operations = Array.from({ length: concurrentOperations }, (_, i) => 
        Promise.all([
          storage.store(createTestPattern(i)),
          recognizer.recognizePatterns(createTestPattern(i).features),
          storage.search({ metadata: { category: 'test' } })
        ])
      );

      await Promise.all(operations);
      
      const totalTime = performance.now() - startTime;
      const avgTimePerOperation = totalTime / (concurrentOperations * 3); // 3 operations per iteration
      
      expect(avgTimePerOperation).toBeLessThan(10); // 10ms per operation under load
      expect(healthMonitor.checkHealth().status).not.toBe('unhealthy');
    });

    it('should maintain performance during sustained load', async () => {
      const batchSize = 100;
      const batchCount = 10;
      const samples: number[] = [];

      for (let batch = 0; batch < batchCount; batch++) {
        const startTime = performance.now();
        
        await Promise.all(Array.from({ length: batchSize }, (_, i) => {
          const pattern = createTestPattern(batch * batchSize + i);
          return storage.store(pattern);
        }));

        const batchTime = performance.now() - startTime;
        samples.push(batchTime / batchSize);

        // Allow system to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgBatchLatency = samples.reduce((a, b) => a + b) / samples.length;
      expect(avgBatchLatency).toBeLessThan(15); // 15ms average during sustained load
      expect(healthMonitor.checkHealth().status).toBe('healthy');
    });
  });
});