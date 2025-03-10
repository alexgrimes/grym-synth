import { HealthState, createDefaultHealthState, createErrorHealthState } from '../types/health';

describe('Error Performance Tests', () => {
  let healthState: HealthState;

  beforeEach(() => {
    healthState = createDefaultHealthState();
  });

  describe('Error Processing Performance', () => {
    it('should handle errors efficiently', () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        try {
          throw new Error(`Test error ${i}`);
        } catch (error) {
          healthState = createErrorHealthState(error as Error);
          healthState.metrics.totalOperations++;
        }
      }

      const duration = Date.now() - startTime;
      const avgProcessingTime = duration / iterations;

      expect(avgProcessingTime).toBeLessThan(1); // Less than 1ms per error
      expect(healthState.health.errorRate).toBe(1);
      expect(healthState.errorCount).toBe(1);
    });

    it('should maintain performance under error load', () => {
      const errors = Array(100).fill(null).map((_, i) => 
        new Error(`Load test error ${i}`)
      );

      const timings: number[] = [];

      errors.forEach(error => {
        const start = performance.now();
        healthState = createErrorHealthState(error);
        healthState.metrics.totalOperations++;
        timings.push(performance.now() - start);
      });

      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      const maxTime = Math.max(...timings);

      expect(avgTime).toBeLessThan(0.5); // Average under 0.5ms
      expect(maxTime).toBeLessThan(2); // No single operation over 2ms
    });

    it('should efficiently track error patterns', () => {
      const errorTypes = ['TypeError', 'RangeError', 'ReferenceError'];
      const iterations = 100;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const ErrorClass = globalThis[
          errorTypes[i % errorTypes.length] as keyof typeof globalThis
        ] as ErrorConstructor;

        healthState = createErrorHealthState(
          new ErrorClass(`Pattern test error ${i}`)
        );
        healthState.metrics.totalOperations++;
      }

      const duration = performance.now() - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(1);
      expect(healthState.errors?.errorTypes.size).toBeLessThanOrEqual(errorTypes.length);
    });

    it('should handle concurrent errors', async () => {
      const concurrentErrors = 10;
      const errorPromises = Array(concurrentErrors).fill(null).map(async (_, i) => {
        try {
          throw new Error(`Concurrent error ${i}`);
        } catch (error) {
          return createErrorHealthState(error as Error);
        }
      });

      const startTime = performance.now();
      const results = await Promise.all(errorPromises);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // All errors processed under 50ms
      expect(results).toHaveLength(concurrentErrors);
      results.forEach(state => {
        expect(state.status).toBe('error');
        expect(state.health.errorRate).toBe(1);
      });
    });
  });

  describe('Error Metrics Performance', () => {
    it('should efficiently update metrics', () => {
      const updates = 1000;
      const startTime = performance.now();

      for (let i = 0; i < updates; i++) {
        healthState.metrics.totalOperations++;
        healthState.metrics.errorRate = healthState.errorCount / healthState.metrics.totalOperations;
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Metric updates should be fast
    });
  });
});