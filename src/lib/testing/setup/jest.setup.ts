import type { PerformanceResult, PerformanceLimits, PerformanceOptions } from '../types/jest';
import '../matchers/performance';

// Configure test environment
beforeAll(() => {
  // Set test timeouts
  jest.setTimeout(30000); // 30 seconds
});

// Clean up after all tests
afterAll(() => {
  // Add any global cleanup here
});

/**
 * Measure performance of an operation
 */
export async function measurePerformance(
  operation: () => Promise<void>,
  options: PerformanceOptions = {}
): Promise<PerformanceResult> {
  const { iterations = 1, description } = options;
  const memoryBefore = process.memoryUsage();
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await operation();
  }

  const duration = performance.now() - start;
  const memoryAfter = process.memoryUsage();

  if (description) {
    console.log(`${description}: ${duration.toFixed(2)}ms`);
  }

  return {
    duration,
    memoryBefore,
    memoryAfter,
    operations: iterations
  };
}

/**
 * Assert performance requirements
 */
export function assertPerformance(
  result: PerformanceResult,
  limits: PerformanceLimits,
  description?: string
): void {
  const { duration, operations, memoryBefore, memoryAfter } = result;
  const durationPerOp = duration / operations;

  if (limits.maxDurationPerOp) {
    expect(durationPerOp).toBeLessThanTime(
      limits.maxDurationPerOp,
      description ? `${description} per operation` : undefined
    );
  }

  if (limits.maxMemoryGrowthMB) {
    const heapGrowth = memoryAfter.heapUsed - memoryBefore.heapUsed;
    expect(heapGrowth).toBeLessThan(
      limits.maxMemoryGrowthMB * 1024 * 1024,
      description ? `${description} memory growth` : undefined
    );
  }
}

/**
 * Setup performance test helpers
 */
expect.extend({
  toBeLessThanTime(received: number, expected: number, description?: string) {
    const pass = received < expected;
    const message = () =>
      `${description || 'Operation'} took ${received.toFixed(2)}ms, ` +
      `${pass ? 'less' : 'more'} than expected ${expected}ms`;

    return { pass, message };
  },

  toHaveStableMemoryUsage(initialHeap: number, maxGrowthMB = 50) {
    const finalHeap = process.memoryUsage().heapUsed;
    const heapGrowth = finalHeap - initialHeap;
    const maxGrowthBytes = maxGrowthMB * 1024 * 1024;
    const pass = heapGrowth < maxGrowthBytes;

    const message = () =>
      `Memory growth was ${(heapGrowth / 1024 / 1024).toFixed(2)}MB, ` +
      `${pass ? 'less' : 'more'} than limit of ${maxGrowthMB}MB`;

    return { pass, message };
  }
});