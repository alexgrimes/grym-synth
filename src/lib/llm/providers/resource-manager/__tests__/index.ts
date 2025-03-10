export * from './test-config';
export * from '../test-helpers';

// Test constants
export const TEST_TIMEOUTS = {
  SHORT: 100,
  MEDIUM: 1000,
  LONG: 5000
} as const;

export const TEST_MEMORY_SIZES = {
  SMALL: 1000,  // 1GB
  MEDIUM: 5000, // 5GB
  LARGE: 10000  // 10GB
} as const;

export const TEST_THRESHOLDS = {
  LOW: 0.1,
  MEDIUM: 0.5,
  HIGH: 0.8,
  CRITICAL: 0.9
} as const;

// Helper function to wait for a specific duration
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to simulate async operations
export const simulateAsyncOperation = async <T>(result: T, delay = TEST_TIMEOUTS.SHORT): Promise<T> => {
  await wait(delay);
  return result;
};

// Helper function to create a promise that rejects after a timeout
export const createTimeoutPromise = (ms: number): Promise<never> => 
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );

// Helper function to run an operation with timeout
export const withTimeout = async <T>(
  operation: Promise<T>,
  timeout: number = TEST_TIMEOUTS.MEDIUM
): Promise<T> => {
  return Promise.race([
    operation,
    createTimeoutPromise(timeout)
  ]);
};

// Helper function to measure execution time
export const measureExecutionTime = async <T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  return { result, duration };
};