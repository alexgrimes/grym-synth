import { MemoryProfiler } from './memory-profile';
import { MemoryVisualizer } from './memory-viz';

export interface TestEnvironment {
  memoryProfiler: MemoryProfiler;
  memoryVisualizer: MemoryVisualizer;
  MEMORY_LIMIT: number;
  forceGC: () => Promise<void>;
}

export const MEMORY_LIMIT = 16 * 1024 * 1024 * 1024; // 16GB

export async function forceGC(): Promise<void> {
  if (global.gc) {
    global.gc();
    // Wait a bit for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export function createTestEnvironment(): TestEnvironment {
  return {
    memoryProfiler: new MemoryProfiler(MEMORY_LIMIT),
    memoryVisualizer: new MemoryVisualizer(),
    MEMORY_LIMIT,
    forceGC
  };
}

// Extend jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinMemoryLimit(limit: number): R;
      toHaveAcceptableMemoryGrowth(initialMemory: number, threshold?: number): R;
    }
  }
}

// Custom matchers
export const customMatchers = {
  toBeWithinMemoryLimit(received: number, limit: number) {
    const pass = received <= limit;
    return {
      message: () =>
        `expected ${received} to ${pass ? 'not ' : ''}be within memory limit ${limit}`,
      pass,
    };
  },

  toHaveAcceptableMemoryGrowth(received: number, initialMemory: number, threshold = 0.1) {
    const growth = received - initialMemory;
    const percentGrowth = growth / initialMemory;
    const pass = percentGrowth <= threshold;
    
    return {
      message: () =>
        `expected memory growth ${(percentGrowth * 100).toFixed(2)}% to ${pass ? 'not ' : ''}be within threshold ${(threshold * 100).toFixed(2)}%`,
      pass,
    };
  },
};