import { MetricsCollector } from '../metrics-collector';
import { PatternRecognizer } from '../pattern-recognizer';
import { PatternStorage } from '../pattern-storage';
import { HealthMonitor } from '../health-monitor';
import { Pattern, SearchCriteria } from '../types';
import { LRUCache } from '../lru-cache';

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

describe('System Integration Tests', () => {
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

  describe('System Load Tests', () => {
    it('should handle mixed operations under load', async () => {
      const operations = [];
      const startTime = performance.now();

      // Generate mixed operations
      for (let i = 0; i < 1000; i++) {
        const pattern = createTestPattern(i);
        operations.push(
          storage.store(pattern),
          recognizer.recognizePatterns(pattern.features),
          storage.search({ metadata: { category: 'test' } })
        );
      }

      await Promise.all(operations);
      const totalTime = performance.now() - startTime;
      const avgTimePerOperation = totalTime / operations.length;

      expect(avgTimePerOperation).toBeLessThan(10);
      expect(healthMonitor.checkHealth().status).toBe('healthy');
    });

    it('should maintain performance during cache eviction', async () => {
      const patterns = Array.from({ length: 2000 }, (_, i) => createTestPattern(i));
      const operationTimes: number[] = [];

      // Fill beyond cache capacity while measuring performance
      for (let i = 0; i < patterns.length; i++) {
        const startTime = performance.now();
        await storage.store(patterns[i]);
        operationTimes.push(performance.now() - startTime);

        if (i > 0 && i % 100 === 0) {
          const recentAvg = operationTimes.slice(-100).reduce((a, b) => a + b) / 100;
          expect(recentAvg).toBeLessThan(20);
        }
      }

      const health = healthMonitor.checkHealth();
      expect(health.status).not.toBe('unhealthy');
    });

    it('should handle burst operations effectively', async () => {
      const burstSize = 100;
      const burstCount = 10;
      const results = [];

      for (let burst = 0; burst < burstCount; burst++) {
        const startTime = performance.now();
        const operations = Array.from({ length: burstSize }, (_, i) => {
          const pattern = createTestPattern(burst * burstSize + i);
          return Promise.all([
            storage.store(pattern),
            recognizer.recognizePatterns(pattern.features)
          ]);
        });

        results.push(await Promise.all(operations));
        const burstTime = performance.now() - startTime;
        
        expect(burstTime / burstSize).toBeLessThan(15);
        
        // Allow system to stabilize between bursts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalHealth = healthMonitor.checkHealth();
      expect(finalHealth.status).not.toBe('unhealthy');
    });
  });

  describe('System Recovery Tests', () => {
    it('should recover from error conditions', async () => {
      // Simulate error conditions
      const errorPatterns = Array.from({ length: 50 }, (_, i) => ({
        ...createTestPattern(i),
        confidence: 2 // Invalid value
      }));

      await Promise.all(errorPatterns.map(p => 
        storage.store(p).catch(() => {}))
      );

      const health = healthMonitor.checkHealth();
      expect(health.status).toBe('degraded');

      // Test recovery
      const validPatterns = Array.from({ length: 100 }, (_, i) => 
        createTestPattern(i + 1000)
      );

      const recoveryStartTime = performance.now();
      await Promise.all(validPatterns.map(p => storage.store(p)));
      const recoveryTime = performance.now() - recoveryStartTime;

      expect(recoveryTime / validPatterns.length).toBeLessThan(20);
      expect(healthMonitor.checkHealth().status).toBe('healthy');
    });
  });

  describe('Resource Management Tests', () => {
    it('should manage memory effectively under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const operationBatches = Array.from({ length: 10 }, (_, batchIndex) => 
        Array.from({ length: 100 }, (_, i) => {
          const pattern = createTestPattern(batchIndex * 100 + i);
          return Promise.all([
            storage.store(pattern),
            recognizer.recognizePatterns(pattern.features),
            storage.search({ metadata: { category: 'test' } })
          ]);
        })
      );

      for (const batch of operationBatches) {
        await Promise.all(batch.flat());
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (currentMemory - initialMemory) / 1024 / 1024; // MB
        
        expect(memoryIncrease).toBeLessThan(200); // Less than 200MB increase
        
        // Check cache sizes
        const metrics = await storage.store(createTestPattern(0));
        expect(metrics.metrics.resourceUsage.storageUsage).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('System Metrics Tests', () => {
    it('should maintain accurate metrics under load', async () => {
      const operationResults = [];
      
      // Perform mixed operations
      for (let i = 0; i < 100; i++) {
        const pattern = createTestPattern(i);
        operationResults.push(
          await storage.store(pattern),
          await recognizer.recognizePatterns(pattern.features)
        );
      }

      const allMetrics = operationResults.map(result => result.metrics);
      
      // Verify metrics consistency
      allMetrics.forEach(metrics => {
        expect(metrics.patternRecognitionLatency).toBeDefined();
        expect(metrics.storageOperationLatency).toBeDefined();
        expect(metrics.optimizationEffectiveness).toBeGreaterThan(0);
        expect(metrics.resourceUsage).toBeDefined();
        expect(metrics.healthStatus.status).toBeDefined();
      });

      // Verify metrics collector accuracy
      const collectorMetrics = metrics.getMetrics();
      expect(collectorMetrics.healthStatus.metrics.errorRate).toBeDefined();
      expect(collectorMetrics.resourceUsage.memoryUsage).toBeGreaterThan(0);
    });
  });
});