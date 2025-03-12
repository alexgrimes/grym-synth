import { PerformanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let originalPerformanceNow: () => number;
  let mockTime: number;

  beforeEach(() => {
    mockTime = 0;
    originalPerformanceNow = performance.now;
    performance.now = jest.fn(() => mockTime);
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    performance.now = originalPerformanceNow;
  });

  describe('Basic Metrics Recording', () => {
    it('should record and average metrics correctly', () => {
      // Record some test metrics
      for (let i = 0; i < 10; i++) {
        mockTime = i * 16.67; // Simulate 60fps timing
        monitor.recordMetrics({
          frameTime: 16.67,
          updateTime: 8,
          physicsTime: 4,
          renderTime: 4,
          fieldCount: 10,
          parameterCount: 100
        });
      }

      const averages = monitor.getAverageMetrics(10);
      expect(averages.frameTime).toBeCloseTo(16.67);
      expect(averages.updateTime).toBeCloseTo(8);
      expect(averages.physicsTime).toBeCloseTo(4);
      expect(averages.renderTime).toBeCloseTo(4);
      expect(averages.fieldCount).toBe(10);
      expect(averages.parameterCount).toBe(100);
    });

    it('should maintain maximum sample size', () => {
      // Record more than maxSamples metrics
      for (let i = 0; i < 1000; i++) {
        mockTime = i * 16.67;
        monitor.recordMetrics({ frameTime: 16.67 });
      }

      const report = monitor.getPerformanceReport();
      expect(report).toContain('Avg Frame Time: 16.67');
    });
  });

  describe('Performance Warnings', () => {
    it('should emit warnings when thresholds are exceeded', () => {
      const warningCallback = jest.fn();
      monitor.onWarning(warningCallback);

      monitor.recordMetrics({
        frameTime: 20, // Above 16.67ms threshold
        updateTime: 10, // Above 8ms threshold
        physicsTime: 5, // Above 4ms threshold
        renderTime: 5 // Above 4ms threshold
      });

      expect(warningCallback).toHaveBeenCalledTimes(4);
      expect(warningCallback).toHaveBeenCalledWith(expect.stringContaining('Frame time exceeded'));
      expect(warningCallback).toHaveBeenCalledWith(expect.stringContaining('Update time exceeded'));
      expect(warningCallback).toHaveBeenCalledWith(expect.stringContaining('Physics time exceeded'));
      expect(warningCallback).toHaveBeenCalledWith(expect.stringContaining('Render time exceeded'));
    });

    it('should allow custom thresholds', () => {
      const monitor = new PerformanceMonitor({
        maxFrameTime: 33.33, // 30fps
        maxUpdateTime: 16,
        maxPhysicsTime: 8,
        maxRenderTime: 8
      });

      const warningCallback = jest.fn();
      monitor.onWarning(warningCallback);

      monitor.recordMetrics({
        frameTime: 20, // Below new threshold
        updateTime: 10, // Below new threshold
        physicsTime: 5, // Below new threshold
        renderTime: 5 // Below new threshold
      });

      expect(warningCallback).not.toHaveBeenCalled();
    });
  });

  describe('Memory Monitoring', () => {
    beforeEach(() => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024
        },
        configurable: true
      });
    });

    it('should track memory usage when available', () => {
      monitor.recordMetrics({});
      const report = monitor.getPerformanceReport();

      expect(report).toContain('Memory Usage: 50.0MB');
      expect(report).toContain('100.0MB');
      expect(report).toContain('Limit: 200.0MB');
    });

    it('should emit warning when memory usage exceeds threshold', () => {
      const warningCallback = jest.fn();
      monitor.onWarning(warningCallback);

      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 150 * 1024 * 1024, // Above 100MB threshold
          totalJSHeapSize: 200 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024
        }
      });

      monitor.recordMetrics({});

      expect(warningCallback).toHaveBeenCalledWith(
        expect.stringContaining('Memory usage exceeded')
      );
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate formatted performance report', () => {
      for (let i = 0; i < 10; i++) {
        mockTime = i * 16.67;
        monitor.recordMetrics({
          frameTime: 16.67,
          updateTime: 8,
          physicsTime: 4,
          renderTime: 4,
          fieldCount: 10,
          parameterCount: 100
        });
      }

      const report = monitor.getPerformanceReport();

      expect(report).toContain('Performance Report:');
      expect(report).toContain('Avg Frame Time: 16.67');
      expect(report).toContain('Avg Update Time: 8.00');
      expect(report).toContain('Avg Physics Time: 4.00');
      expect(report).toContain('Avg Render Time: 4.00');
      expect(report).toContain('Field Count: 10');
      expect(report).toContain('Parameter Count: 100');
    });
  });

  describe('Reset Functionality', () => {
    it('should clear all recorded metrics', () => {
      // Record some metrics
      monitor.recordMetrics({
        frameTime: 16.67,
        fieldCount: 10
      });

      // Reset
      monitor.resetMetrics();

      // Check that metrics were cleared
      const averages = monitor.getAverageMetrics();
      expect(Object.keys(averages).length).toBe(0);
    });
  });
});
