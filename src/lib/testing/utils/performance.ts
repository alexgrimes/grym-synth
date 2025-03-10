import type { PerformanceResult, PerformanceLimits, PerformanceOptions } from '../types/jest';
import '../matchers/jest-matchers';

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

  // Check operation duration
  if (limits.maxDurationPerOp) {
    const message = description ? 
      `${description} operation time` :
      'Operation time';
    
    expect(durationPerOp).toBeLessThanWithMessage(
      limits.maxDurationPerOp,
      message
    );
  }

  // Check memory usage
  if (limits.maxMemoryGrowthMB) {
    const heapGrowth = memoryAfter.heapUsed - memoryBefore.heapUsed;
    const message = description ?
      `${description} memory growth` :
      'Memory growth';
    
    expect(heapGrowth).toHaveAcceptableMemoryGrowth(
      limits.maxMemoryGrowthMB,
      message
    );
  }
}

/**
 * Format a duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format memory size in bytes
 */
export function formatMemorySize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
}

/**
 * Calculate memory growth between two heap snapshots
 */
export function calculateMemoryGrowth(
  before: NodeJS.MemoryUsage,
  after: NodeJS.MemoryUsage
): number {
  return after.heapUsed - before.heapUsed;
}

/**
 * Format performance results for logging
 */
export function formatPerformanceResult(
  result: PerformanceResult,
  description?: string
): string {
  const { duration, operations, memoryBefore, memoryAfter } = result;
  const durationPerOp = duration / operations;
  const memoryGrowth = calculateMemoryGrowth(memoryBefore, memoryAfter);

  return [
    description ? `${description}:` : '',
    `Total time: ${formatDuration(duration)}`,
    `Per operation: ${formatDuration(durationPerOp)}`,
    `Memory growth: ${formatMemorySize(memoryGrowth)}`,
    `Operations: ${operations}`
  ].filter(Boolean).join('\n');
}