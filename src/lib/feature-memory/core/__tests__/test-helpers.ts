import { Pattern, StorageOperationResult, ValidationResult } from '../types';

export interface TestMetrics {
  average: number;
  p95: number;
  min: number;
  max: number;
  totalSamples: number;
}

export async function warmupSystem(operation: () => Promise<any>, iterations = 100): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await operation();
  }
  // Allow system to stabilize
  await new Promise(resolve => setTimeout(resolve, 100));
}

export function calculateMetrics(samples: number[]): TestMetrics {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    average: samples.reduce((a, b) => a + b, 0) / samples.length,
    p95: sorted[Math.floor(sorted.length * 0.95)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    totalSamples: samples.length
  };
}

export async function measureOperations<T>(
  operation: () => Promise<T>,
  count: number,
  concurrency = 1
): Promise<number[]> {
  const latencies: number[] = [];
  const batchSize = Math.min(count, concurrency);
  const batches = Math.ceil(count / batchSize);

  for (let i = 0; i < batches; i++) {
    const batchOperations = Array.from({ length: batchSize }, async () => {
      const start = performance.now();
      await operation();
      return performance.now() - start;
    });

    const batchLatencies = await Promise.all(batchOperations);
    latencies.push(...batchLatencies);
  }

  return latencies;
}

export async function generateLoad<T>(
  operation: () => Promise<T>,
  duration: number,
  concurrency: number
): Promise<TestMetrics> {
  const startTime = Date.now();
  const latencies: number[] = [];

  while (Date.now() - startTime < duration) {
    const batchLatencies = await measureOperations(operation, concurrency, concurrency);
    latencies.push(...batchLatencies);
  }

  return calculateMetrics(latencies);
}

export function createTestPattern(id: number): Pattern {
  return {
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
  };
}

export function monitorMemory(): () => number {
  const initial = process.memoryUsage().heapUsed;
  return () => {
    const current = process.memoryUsage().heapUsed;
    return (current - initial) / (1024 * 1024); // Return MB difference
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function measureConcurrentOperations<T>(
  operations: (() => Promise<T>)[],
  batchSize: number
): Promise<TestMetrics> {
  const latencies: number[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const startTime = performance.now();
    await Promise.all(batch.map(op => op().catch(error => {
      console.error('Operation failed:', error);
      return null;
    })));
    latencies.push(performance.now() - startTime);
  }

  return calculateMetrics(latencies);
}

export async function verifySystemStability<T>(
  operation: () => Promise<T>,
  duration: number,
  samplingInterval = 1000
): Promise<boolean> {
  const startTime = Date.now();
  const measurements: TestMetrics[] = [];
  
  while (Date.now() - startTime < duration) {
    const metrics = await generateLoad(operation, samplingInterval, 10);
    measurements.push(metrics);
    await sleep(100); // Prevent overwhelming the system
  }

  // Check for stability
  const averages = measurements.map(m => m.average);
  const variance = calculateVariance(averages);
  return variance < 0.25; // Less than 25% variance considered stable
}

function calculateVariance(samples: number[]): number {
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const squareDiffs = samples.map(x => (x - mean) ** 2);
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff) / mean; // Coefficient of variation
}