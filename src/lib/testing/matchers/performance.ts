declare global {
  namespace jest {
    interface Matchers<R> {
      toBeLessThanTime(expectedTime: number, description?: string): R;
      toHaveStableMemoryUsage(maxGrowthMB?: number): R;
    }
  }
}

/**
 * Custom matchers for performance testing
 */
const performanceMatchers = {
  toBeLessThanTime(received: number, expected: number, description?: string) {
    const pass = received < expected;
    const message = () =>
      `${description || 'Operation'} took ${received.toFixed(2)}ms, ` +
      `${pass ? 'less' : 'more'} than expected ${expected}ms`;

    return { pass, message };
  },

  toHaveStableMemoryUsage(initialHeap: number, finalHeap: number, maxGrowthMB = 50) {
    const heapGrowth = finalHeap - initialHeap;
    const maxGrowthBytes = maxGrowthMB * 1024 * 1024;
    const pass = heapGrowth < maxGrowthBytes;

    const message = () =>
      `Memory growth was ${(heapGrowth / 1024 / 1024).toFixed(2)}MB, ` +
      `${pass ? 'less' : 'more'} than limit of ${maxGrowthMB}MB`;

    return { pass, message };
  }
};

expect.extend(performanceMatchers);

export { performanceMatchers };