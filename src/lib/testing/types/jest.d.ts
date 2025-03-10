/// <reference types="jest" />

declare namespace jest {
  interface Matchers<R> {
    /**
     * Check if operation duration is less than expected time
     * @param expectedTime Maximum allowed time in milliseconds
     * @param description Optional description for the error message
     */
    toBeLessThanTime(expectedTime: number, description?: string): R;

    /**
     * Check if memory usage remains stable
     * @param finalHeap Final heap usage to compare against
     * @param maxGrowthMB Optional maximum allowed growth in MB
     */
    toHaveStableMemoryUsage(finalHeap: number, maxGrowthMB?: number): R;
  }
}

/**
 * Performance test result
 */
export interface PerformanceResult {
  /** Total duration in milliseconds */
  duration: number;
  /** Memory usage before operation */
  memoryBefore: NodeJS.MemoryUsage;
  /** Memory usage after operation */
  memoryAfter: NodeJS.MemoryUsage;
  /** Number of operations performed */
  operations: number;
}

/**
 * Performance test limits
 */
export interface PerformanceLimits {
  /** Maximum allowed duration per operation in milliseconds */
  maxDurationPerOp?: number;
  /** Maximum allowed memory growth in MB */
  maxMemoryGrowthMB?: number;
}

/**
 * Performance measurement options
 */
export interface PerformanceOptions {
  /** Number of iterations to run */
  iterations?: number;
  /** Custom description for error messages */
  description?: string;
}