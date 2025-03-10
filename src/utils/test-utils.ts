/**
 * Test utilities for the learning system
 * These are only available in development mode
 */

import {
  generateRandomFeatures,
  createTestPattern,
  createSimilarFeatures,
  measureTime,
  isWithinRange,
} from "../services/learning/__tests__/setup";

export const TEST_UTILS = {
  generateRandomFeatures,
  createTestPattern,
  createSimilarFeatures,
  measureTime,
  isWithinRange,
};

/**
 * Initialize test environment with custom settings
 */
export function initializeTestEnvironment(options = {}) {
  const isTestEnvironment =
    process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";

  if (!isTestEnvironment) {
    console.warn(
      "Test utilities should only be used in test or development environments"
    );
  }

  // Return configured test utilities
  return {
    ...TEST_UTILS,
    cleanup: async () => {
      // Any cleanup logic needed
    },
    isTestEnvironment,
  };
}

/**
 * Test helper for waiting
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test helper for measuring operation duration
 */
export async function measureDuration<T>(
  operation: () => Promise<T>
): Promise<[T, number]> {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  return [result, duration];
}

/**
 * Test helper for comparing durations
 */
export function isDurationWithinRange(
  actual: number,
  expected: number,
  tolerancePercent: number = 20
): boolean {
  const tolerance = expected * (tolerancePercent / 100);
  return actual >= expected - tolerance && actual <= expected + tolerance;
}

// Conditional exports based on environment
const testUtils =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    ? { ...TEST_UTILS }
    : {};

export default testUtils;
