import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeGreaterThan(expected: number): R;
      toBeLessThan(expected: number): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeLessThanOrEqual(expected: number): R;
    }
  }
}

// Extend window type for performance.memory
interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

type MockPerformance = Omit<Performance, 'memory'> & {
  memory?: PerformanceMemory;
};

type MockNavigator = Omit<Navigator, 'hardwareConcurrency'> & {
  hardwareConcurrency: number | undefined;
};

interface CustomGlobal extends NodeJS.Global {
  performance: MockPerformance;
  navigator: MockNavigator;
}

// Make TypeScript recognize our custom global
declare const global: CustomGlobal;

// Store original values
const originalPerformance = global.performance;
const originalNavigator = global.navigator;

// Helper functions for tests
export const mockPerformance = (memory?: Partial<PerformanceMemory>) => {
  const mockedPerformance = {
    ...originalPerformance,
    memory: memory ? {
      jsHeapSizeLimit: memory.jsHeapSizeLimit ?? 0,
      totalJSHeapSize: memory.totalJSHeapSize ?? 0,
      usedJSHeapSize: memory.usedJSHeapSize ?? 0
    } : undefined
  };

  Object.defineProperty(global, 'performance', {
    value: mockedPerformance,
    writable: true,
    configurable: true
  });

  return mockedPerformance;
};

export const mockNavigator = (hardwareConcurrency?: number) => {
  const mockedNavigator = {
    ...originalNavigator,
    hardwareConcurrency
  };

  Object.defineProperty(global, 'navigator', {
    value: mockedNavigator,
    writable: true,
    configurable: true
  });

  return mockedNavigator;
};

export const resetMocks = () => {
  Object.defineProperty(global, 'performance', {
    value: originalPerformance,
    writable: true,
    configurable: true
  });

  Object.defineProperty(global, 'navigator', {
    value: originalNavigator,
    writable: true,
    configurable: true
  });
};

// Initialize default mocks if needed
if (!global.performance.memory) {
  mockPerformance();
}

// Ensure hardwareConcurrency is defined
if (typeof global.navigator.hardwareConcurrency === 'undefined') {
  mockNavigator(1);
}
