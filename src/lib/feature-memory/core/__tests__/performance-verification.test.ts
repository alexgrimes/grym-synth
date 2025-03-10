import { FeatureMemorySystem } from '../feature-memory-system';
import { createTestPattern } from './test-helpers';

interface LoadTestConfig {
  concurrentOperations: number;
  totalOperations: number;
  targetOpsPerSecond: number;
}

interface LoadTestResult {
  averageLatency: number;
  p95Latency: number;
  operationsPerSecond: number;
  errorRate: number;
  totalOperations: number;
}

async function runLoadTest(
  operation: () => Promise<any>,
  config: LoadTestConfig
): Promise<LoadTestResult> {
  const latencies: number[] = [];
  const errors: Error[] = [];
  const startTime = Date.now();
  const batchSize = config.concurrentOperations;
  const batches = Math.ceil(config.totalOperations / batchSize);
  const targetBatchInterval = (batchSize / config.targetOpsPerSecond) * 1000;

  for (let i = 0; i < batches; i++) {
    const batchStart = Date.now();
    const operations = Array(Math.min(batchSize, config.totalOperations - i * batchSize))
      .fill(null)
      .map(async () => {
        try {
          const opStart = Date.now();
          await operation();
          latencies.push(Date.now() - opStart);
        } catch (error) {
          errors.push(error as Error);
        }
      });

    await Promise.all(operations);

    // Rate limiting
    const batchDuration = Date.now() - batchStart;
    if (batchDuration < targetBatchInterval) {
      await new Promise(resolve => setTimeout(resolve, targetBatchInterval - batchDuration));
    }
  }

  const totalDuration = (Date.now() - startTime) / 1000; // in seconds
  const sortedLatencies = [...latencies].sort((a, b) => a - b);

  return {
    averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p95Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
    operationsPerSecond: latencies.length / totalDuration,
    errorRate: errors.length / config.totalOperations,
    totalOperations: latencies.length + errors.length
  };
}

describe('Performance Verification', () => {
  let system: FeatureMemorySystem;
  const testPattern = createTestPattern(1);

  beforeEach(async () => {
    system = new FeatureMemorySystem({
      cacheSize: 1000,
      maxPatterns: 10000,
      persistenceEnabled: false
    });

    // Warm up the system
    for (let i = 0; i < 100; i++) {
      await system.storePattern(createTestPattern(i));
    }
  });

  afterEach(async () => {
    await system.destroy();
  });

  describe('Core Performance', () => {
    it('should meet pattern recognition latency targets', async () => {
      const result = await runLoadTest(
        () => system.recognizePattern(testPattern.features),
        {
          concurrentOperations: 10,
          totalOperations: 1000,
          targetOpsPerSecond: 100
        }
      );

      expect(result.averageLatency).toBeLessThan(50);
      expect(result.p95Latency).toBeLessThan(100);
      expect(result.errorRate).toBe(0);
      
      console.log('Recognition Performance:', {
        averageLatency: `${result.averageLatency.toFixed(2)}ms`,
        p95Latency: `${result.p95Latency.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2)
      });
    });

    it('should meet pattern storage latency targets', async () => {
      const result = await runLoadTest(
        () => system.storePattern({ ...testPattern, id: `test_${Date.now()}` }),
        {
          concurrentOperations: 10,
          totalOperations: 1000,
          targetOpsPerSecond: 100
        }
      );

      expect(result.averageLatency).toBeLessThan(20);
      expect(result.p95Latency).toBeLessThan(50);
      expect(result.errorRate).toBe(0);

      console.log('Storage Performance:', {
        averageLatency: `${result.averageLatency.toFixed(2)}ms`,
        p95Latency: `${result.p95Latency.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2)
      });
    });
  });

  describe('Load Testing', () => {
    it('should handle sustained high throughput', async () => {
      const result = await runLoadTest(
        () => system.storePattern({ ...testPattern, id: `test_${Date.now()}` }),
        {
          concurrentOperations: 50,
          totalOperations: 5000,
          targetOpsPerSecond: 200
        }
      );

      expect(result.averageLatency).toBeLessThan(30);
      expect(result.operationsPerSecond).toBeGreaterThan(150);
      expect(result.errorRate).toBeLessThan(0.01);

      console.log('Load Test Results:', {
        averageLatency: `${result.averageLatency.toFixed(2)}ms`,
        p95Latency: `${result.p95Latency.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2),
        errorRate: `${(result.errorRate * 100).toFixed(2)}%`
      });
    });

    it('should maintain performance during concurrent operations', async () => {
      const mixed = async () => {
        await Promise.all([
          system.storePattern({ ...testPattern, id: `test_${Date.now()}` }),
          system.recognizePattern(testPattern.features),
          system.searchPatterns({ metadata: { category: 'test' } })
        ]);
      };

      const result = await runLoadTest(mixed, {
        concurrentOperations: 20,
        totalOperations: 1000,
        targetOpsPerSecond: 50
      });

      expect(result.averageLatency).toBeLessThan(100);
      expect(result.errorRate).toBeLessThan(0.01);

      console.log('Concurrent Operations:', {
        averageLatency: `${result.averageLatency.toFixed(2)}ms`,
        p95Latency: `${result.p95Latency.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2)
      });
    });
  });

  describe('Memory Management', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      await runLoadTest(
        () => system.storePattern({ ...testPattern, id: `test_${Date.now()}` }),
        {
          concurrentOperations: 50,
          totalOperations: 10000,
          targetOpsPerSecond: 200
        }
      );

      const memoryIncreaseMB = (process.memoryUsage().heapUsed - initialMemory) / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(200);

      console.log('Memory Usage:', {
        increaseMB: memoryIncreaseMB.toFixed(2)
      });
    });
  });
});