import { FeatureMemorySystem } from '../feature-memory-system';
import { Pattern } from '../types';

export interface PerformanceTestConfig {
  operation: () => Promise<any>;
  samples: number;
  targetAvg: number;
  targetP95: number;
  warmupSamples?: number;
  cooldownMs?: number;
}

export interface ConcurrentTestConfig {
  operation: () => Promise<any>;
  concurrentOps: number;
  targetAvg: number;
  batchSize?: number;
  cooldownMs?: number;
}

export interface PerformanceResults {
  avgLatency: number;
  p95Latency: number;
  minLatency: number;
  maxLatency: number;
  samples: number;
  failures: number;
  failureRate: number;
  memoryDelta: number;
  recentLatencies: number[];
  errorTypes: Map<string, number>;
  throughput: number;
  duration: number;
}

// Jest's expect type
type JestExpect = {
  toBeLessThan: (n: number) => void;
  toBeLessThanOrEqual: (n: number) => void;
  toBeGreaterThan: (n: number) => void;
  toBeGreaterThanOrEqual: (n: number) => void;
  toBe: (value: any) => void;
};

export function createTestPattern(id: number): Pattern {
  return {
    id: `test_${id}`,
    features: new Map([
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
  };
}

export async function warmupSystem(system: FeatureMemorySystem): Promise<void> {
  const warmupPattern = createTestPattern(0);
  const warmupOperations = [];

  // Run more warmup operations to ensure system is stable
  for (let i = 0; i < 100; i++) {
    warmupOperations.push(
      system.storePattern({ ...warmupPattern, id: `warmup_${i}` }),
      system.recognizePattern(warmupPattern.features)
    );
  }

  await Promise.all(warmupOperations);
  
  // Allow system to stabilize and cleanup
  await new Promise(resolve => setTimeout(resolve, 200));
  if (global.gc) {
    global.gc();
  }
}

export async function runPerformanceTest(config: PerformanceTestConfig): Promise<PerformanceResults> {
  const latencies: number[] = [];
  const recentLatencies: number[] = [];
  const errorTypes = new Map<string, number>();
  let failures = 0;
  const initialMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  // Optional warmup phase
  if (config.warmupSamples) {
    for (let i = 0; i < config.warmupSamples; i++) {
      try {
        await config.operation();
      } catch (error) {
        // Ignore warmup errors
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  for (let i = 0; i < config.samples; i++) {
    try {
      const start = performance.now();
      await config.operation();
      const duration = performance.now() - start;
      latencies.push(duration);
      recentLatencies.push(duration);
      
      // Keep recent latencies window at 1000 samples
      if (recentLatencies.length > 1000) {
        recentLatencies.shift();
      }

      // Add cooldown between operations if specified
      if (config.cooldownMs) {
        await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
      }
    } catch (error) {
      failures++;
      const errorType = error instanceof Error ? error.name : 'UnknownError';
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    }
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const finalMemory = process.memoryUsage().heapUsed;

  return {
    avgLatency: latencies.reduce((a, b) => a + b) / latencies.length,
    p95Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
    minLatency: sortedLatencies[0],
    maxLatency: sortedLatencies[sortedLatencies.length - 1],
    samples: config.samples,
    failures,
    failureRate: failures / config.samples,
    memoryDelta: (finalMemory - initialMemory) / (1024 * 1024), // MB
    recentLatencies,
    errorTypes,
    throughput: (config.samples / duration) * 1000, // ops/sec
    duration
  };
}

export async function runConcurrentTest(config: ConcurrentTestConfig): Promise<PerformanceResults> {
  const startTime = performance.now();
  const initialMemory = process.memoryUsage().heapUsed;
  const batchSize = config.batchSize || 50;
  const latencies: number[] = [];
  const recentLatencies: number[] = [];
  const errorTypes = new Map<string, number>();
  let failures = 0;

  // Run operations in batches to avoid overwhelming the system
  for (let i = 0; i < config.concurrentOps; i += batchSize) {
    const batchCount = Math.min(batchSize, config.concurrentOps - i);
    const batchStart = performance.now();
    
    const results = await Promise.allSettled(
      Array(batchCount).fill(null).map(async () => {
        const opStart = performance.now();
        try {
          await config.operation();
          const duration = performance.now() - opStart;
          latencies.push(duration);
          recentLatencies.push(duration);
          if (recentLatencies.length > 1000) {
            recentLatencies.shift();
          }
        } catch (error) {
          failures++;
          const errorType = error instanceof Error ? error.name : 'UnknownError';
          errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
          throw error;
        }
      })
    );

    failures += results.filter(r => r.status === 'rejected').length;

    // Add cooldown between batches if specified
    if (config.cooldownMs) {
      await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
    }
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  const finalMemory = process.memoryUsage().heapUsed;
  const sortedLatencies = [...latencies].sort((a, b) => a - b);

  return {
    avgLatency: latencies.reduce((a, b) => a + b) / latencies.length,
    p95Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
    minLatency: sortedLatencies[0],
    maxLatency: sortedLatencies[sortedLatencies.length - 1],
    samples: config.concurrentOps,
    failures,
    failureRate: failures / config.concurrentOps,
    memoryDelta: (finalMemory - initialMemory) / (1024 * 1024), // MB
    recentLatencies,
    errorTypes,
    throughput: (config.concurrentOps / duration) * 1000, // ops/sec
    duration
  };
}

export function formatResults(results: PerformanceResults): string {
  const errorSummary = Array.from(results.errorTypes.entries())
    .map(([type, count]) => `${type}: ${count}`)
    .join('\n  ');

  return `
Performance Results:
-------------------
Average Latency: ${results.avgLatency.toFixed(2)}ms
P95 Latency: ${results.p95Latency.toFixed(2)}ms
Min Latency: ${results.minLatency.toFixed(2)}ms
Max Latency: ${results.maxLatency.toFixed(2)}ms
Throughput: ${results.throughput.toFixed(2)} ops/sec
Duration: ${(results.duration / 1000).toFixed(2)}s
Samples: ${results.samples}
Failures: ${results.failures} (${(results.failureRate * 100).toFixed(2)}%)
Memory Delta: ${results.memoryDelta.toFixed(2)}MB
Error Types:
  ${errorSummary || 'None'}
`;
}

export function verifyResults(
  results: PerformanceResults,
  config: Pick<PerformanceTestConfig, 'targetAvg' | 'targetP95'>,
  jestExpect: (actual: number) => JestExpect
): void {
  // Verify latency targets
  jestExpect(results.avgLatency).toBeLessThanOrEqual(
    config.targetAvg
  );
  
  jestExpect(results.p95Latency).toBeLessThanOrEqual(
    config.targetP95
  );
  
  // Verify error rates
  jestExpect(results.failureRate).toBeLessThan(0.01);

  // Verify throughput is reasonable
  jestExpect(results.throughput).toBeGreaterThan(0);

  // Verify memory usage is stable
  jestExpect(results.memoryDelta).toBeLessThan(200); // Less than 200MB growth
}