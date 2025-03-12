import { PERFORMANCE_CONFIG } from '../../config/performance';

/**
 * Helper function to measure execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Check if execution time is within performance budget
 */
export function isWithinPerformanceBudget(
  duration: number,
  budget: number,
  tolerance = 0.1 // 10% tolerance by default
): boolean {
  return duration <= budget * (1 + tolerance);
}

/**
 * Helper to run multiple iterations and get average execution time
 */
export async function benchmarkFunction<T>(
  fn: () => Promise<T> | T,
  iterations: number = 100
): Promise<{
  average: number;
  min: number;
  max: number;
  stdDev: number;
  samples: number[];
}> {
  const samples: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn);
    samples.push(duration);
  }

  const average = samples.reduce((a, b) => a + b) / samples.length;
  const min = Math.min(...samples);
  const max = Math.max(...samples);

  // Calculate standard deviation
  const variance = samples.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / samples.length;
  const stdDev = Math.sqrt(variance);

  return { average, min, max, stdDev, samples };
}

/**
 * Helper to generate test load for performance testing
 */
export function generateTestLoad(size: number = 1000): ArrayBuffer {
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);

  for (let i = 0; i < size; i++) {
    view.setUint8(i, Math.random() * 256);
  }

  return buffer;
}

/**
 * Helper to simulate CPU load
 */
export function simulateCPULoad(durationMs: number): Promise<void> {
  return new Promise(resolve => {
    const start = performance.now();
    while (performance.now() - start < durationMs) {
      // Busy loop to simulate CPU load
    }
    resolve();
  });
}

/**
 * Helper to check if memory usage is within limits
 */
export function checkMemoryUsage(): {
  isWithinLimits: boolean;
  currentUsage: number;
  limit: number;
} {
  const memory = performance?.memory;
  if (!memory) {
    return {
      isWithinLimits: true, // Assume within limits if we can't measure
      currentUsage: 0,
      limit: PERFORMANCE_CONFIG.memory.maxHeapSize
    };
  }

  return {
    isWithinLimits: memory.usedJSHeapSize <= PERFORMANCE_CONFIG.memory.maxHeapSize,
    currentUsage: memory.usedJSHeapSize,
    limit: PERFORMANCE_CONFIG.memory.maxHeapSize
  };
}

/**
 * Helper to measure frame rate stability
 */
export function measureFrameStability(
  durationMs: number = 1000
): Promise<{
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  dropped: number;
}> {
  return new Promise(resolve => {
    const frames: number[] = [];
    let lastFrame = performance.now();
    let rafId: number;

    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastFrame;
      frames.push(1000 / delta); // Convert to FPS
      lastFrame = now;

      if (now - lastFrame < durationMs) {
        rafId = requestAnimationFrame(measureFrame);
      } else {
        const averageFPS = frames.reduce((a, b) => a + b) / frames.length;
        const minFPS = Math.min(...frames);
        const maxFPS = Math.max(...frames);
        const dropped = frames.filter(fps => fps < 58).length; // Count frames below 58fps as dropped

        resolve({ averageFPS, minFPS, maxFPS, dropped });
      }
    };

    rafId = requestAnimationFrame(measureFrame);
  });
}

/**
 * Helper to create a test parameter field
 */
export function createTestField(
  position = { x: 0, y: 0, z: 0 },
  strength = 1.0,
  radius = 0.5,
  decay = 0.95
) {
  return {
    position,
    strength,
    radius,
    decay
  };
}

/**
 * Helper to create test parameters
 */
export function createTestParameters(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `param-${i}`,
    value: Math.random(),
    min: 0,
    max: 1,
    default: 0.5,
    type: 'continuous' as const
  }));
}
