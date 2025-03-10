/// <reference types="jest" />

/**
 * Extend Jest's expect with custom matchers
 */
declare global {
  namespace jest {
    interface Expect {
      /**
       * Check if value is less than expected with optional failure message
       */
      toBeLessThanWithMessage(expected: number, message?: string): void;
      
      /**
       * Check if memory growth is within limits
       */
      toHaveAcceptableMemoryGrowth(maxGrowthMB: number, message?: string): void;
    }
  }
}

/**
 * Custom matcher extensions for Jest
 */
const customMatchers = {
  toBeLessThanWithMessage(received: number, expected: number, message?: string) {
    const pass = received < expected;
    const defaultMessage = `Expected ${received} to be less than ${expected}`;
    
    return {
      pass,
      message: () => message || defaultMessage
    };
  },

  toHaveAcceptableMemoryGrowth(heapGrowth: number, maxGrowthMB: number, message?: string) {
    const maxGrowthBytes = maxGrowthMB * 1024 * 1024;
    const pass = heapGrowth < maxGrowthBytes;
    
    const defaultMessage = 
      `Memory growth of ${(heapGrowth / 1024 / 1024).toFixed(2)}MB ` +
      `exceeds limit of ${maxGrowthMB}MB`;

    return {
      pass,
      message: () => message || defaultMessage
    };
  }
};

// Add custom matchers to Jest
expect.extend(customMatchers);

export { customMatchers };