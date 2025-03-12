import {
  measureExecutionTime,
  isWithinPerformanceBudget,
  benchmarkFunction,
  generateTestLoad,
  simulateCPULoad,
  checkMemoryUsage,
  measureFrameStability,
  createTestField,
  createTestParameters
} from '../performanceTestHelpers';
import { mockPerformance, resetMocks } from '../../setup/testEnvironment';
import { PERFORMANCE_CONFIG } from '../../../config/performance';

describe('Performance Test Helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    resetMocks();
  });

  describe('measureExecutionTime', () => {
    it('should measure async function execution time', async () => {
      const delay = 100;
      const fn = () => new Promise(resolve => setTimeout(resolve, delay));

      const start = Date.now();
      const { duration } = await measureExecutionTime(fn);

      expect(duration).toBeGreaterThanOrEqual(delay);
      expect(duration).toBeLessThan(delay + 50); // Allow some overhead
    });

    it('should measure sync function execution time', async () => {
      const fn = () => {
        let sum = 0;
        for (let i = 0; i < 1000000; i++) sum += i;
        return sum;
      };

      const { duration } = await measureExecutionTime(fn);
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('isWithinPerformanceBudget', () => {
    it('should check if execution time is within budget', () => {
      expect(isWithinPerformanceBudget(90, 100)).toBe(true);
      expect(isWithinPerformanceBudget(110, 100, 0.1)).toBe(true);
      expect(isWithinPerformanceBudget(120, 100, 0.1)).toBe(false);
    });
  });

  describe('benchmarkFunction', () => {
    it('should run multiple iterations and calculate statistics', async () => {
      const fn = () => Math.random() * 10;
      const iterations = 10;

      const result = await benchmarkFunction(fn, iterations);

      expect(result.samples).toHaveLength(iterations);
      expect(result.average).toBeGreaterThan(0);
      expect(result.min).toBeLessThanOrEqual(result.average);
      expect(result.max).toBeGreaterThanOrEqual(result.average);
      expect(result.stdDev).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateTestLoad', () => {
    it('should generate buffer of specified size', () => {
      const size = 1024;
      const buffer = generateTestLoad(size);

      expect(buffer.byteLength).toBe(size);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('should generate random data', () => {
      const buffer1 = generateTestLoad(100);
      const buffer2 = generateTestLoad(100);

      const view1 = new Uint8Array(buffer1);
      const view2 = new Uint8Array(buffer2);

      // Buffers should be different (very low probability of being equal)
      expect(Buffer.from(view1).equals(Buffer.from(view2))).toBe(false);
    });
  });

  describe('simulateCPULoad', () => {
    it('should simulate load for specified duration', async () => {
      const duration = 100;
      const start = Date.now();

      await simulateCPULoad(duration);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(duration);
    });
  });

  describe('checkMemoryUsage', () => {
    it('should check memory usage against limits', () => {
      const usedHeapSize = 50 * 1024 * 1024; // 50MB
      mockPerformance({
        usedJSHeapSize: usedHeapSize,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024
      });

      const result = checkMemoryUsage();
      expect(result.isWithinLimits).toBe(true);
      expect(result.currentUsage).toBe(usedHeapSize);
      expect(result.limit).toBe(PERFORMANCE_CONFIG.memory.maxHeapSize);
    });

    it('should handle missing performance.memory', () => {
      mockPerformance(undefined);

      const result = checkMemoryUsage();
      expect(result.isWithinLimits).toBe(true);
      expect(result.currentUsage).toBe(0);
    });
  });

  describe('measureFrameStability', () => {
    it('should measure frame stability metrics', async () => {
      let frameCallback: FrameRequestCallback = () => {};
      const mockRaf = (cb: FrameRequestCallback) => {
        frameCallback = cb;
        return 1;
      };

      const rafSpy = jest.spyOn(window, 'requestAnimationFrame')
        .mockImplementation(mockRaf);

      const stabilityPromise = measureFrameStability(100);

      // Simulate some frames
      const frameCount = 10;
      for (let i = 0; i < frameCount; i++) {
        const now = i * 16.67; // ~60fps
        jest.spyOn(performance, 'now').mockReturnValue(now);
        frameCallback(now);
      }

      const result = await stabilityPromise;

      expect(result.averageFPS).toBeGreaterThan(0);
      expect(result.minFPS).toBeLessThanOrEqual(result.averageFPS);
      expect(result.maxFPS).toBeGreaterThanOrEqual(result.averageFPS);
      expect(result.dropped).toBeGreaterThanOrEqual(0);
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createTestField', () => {
    it('should create field with default values', () => {
      const field = createTestField();

      expect(field.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(field.strength).toBe(1.0);
      expect(field.radius).toBe(0.5);
      expect(field.decay).toBe(0.95);
    });

    it('should create field with custom values', () => {
      const field = createTestField(
        { x: 1, y: 2, z: 3 },
        2.0,
        0.75,
        0.8
      );

      expect(field.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(field.strength).toBe(2.0);
      expect(field.radius).toBe(0.75);
      expect(field.decay).toBe(0.8);
    });
  });

  describe('createTestParameters', () => {
    it('should create specified number of parameters', () => {
      const count = 5;
      const parameters = createTestParameters(count);

      expect(parameters).toHaveLength(count);
      parameters.forEach((param, i) => {
        expect(param.id).toBe(`param-${i}`);
        expect(param.value).toBeGreaterThanOrEqual(0);
        expect(param.value).toBeLessThanOrEqual(1);
        expect(param.type).toBe('continuous');
      });
    });
  });
});
