import { PERFORMANCE_CONFIG, PERFORMANCE_CONSTANTS, getDeviceAdjustedThresholds } from '../performance';
import { mockPerformance, mockNavigator, resetMocks } from '../../test/setup/testEnvironment';

describe('Performance Configuration', () => {
  describe('PERFORMANCE_CONFIG', () => {
    it('should define all required timing thresholds', () => {
      expect(PERFORMANCE_CONFIG.timing).toEqual(
        expect.objectContaining({
          targetFrameTime: 16.67,
          maxFrameTime: 33.33,
          maxUpdateTime: 8,
          maxPhysicsTime: 4,
          maxRenderTime: 4
        })
      );
    });

    it('should define memory thresholds in bytes', () => {
      expect(PERFORMANCE_CONFIG.memory.maxHeapSize).toBe(100 * 1024 * 1024); // 100MB
      expect(PERFORMANCE_CONFIG.memory.warningHeapSize).toBe(80 * 1024 * 1024); // 80MB
      expect(PERFORMANCE_CONFIG.memory.gcTriggerSize).toBe(90 * 1024 * 1024); // 90MB
    });

    it('should define reasonable physics system limits', () => {
      const { physics } = PERFORMANCE_CONFIG;

      expect(physics.maxFields).toBeGreaterThan(0);
      expect(physics.maxParameters).toBeGreaterThan(physics.maxFields);
      expect(physics.maxFieldStrength).toBeGreaterThan(1);
      expect(physics.minFieldRadius).toBeLessThan(physics.maxFieldRadius);
      expect(physics.defaultFieldDecay).toBeGreaterThan(0);
      expect(physics.defaultFieldDecay).toBeLessThan(1);
    });

    it('should define appropriate update rates', () => {
      const { updates } = PERFORMANCE_CONFIG;

      expect(updates.visualizationRefreshRate).toBeLessThanOrEqual(1000 / 30); // At least 30fps
      expect(updates.parameterUpdateRate).toBeLessThanOrEqual(updates.visualizationRefreshRate);
      expect(updates.minimumUpdateInterval).toBeGreaterThan(0);
      expect(updates.batchSize).toBeGreaterThan(0);
    });

    it('should configure WebAssembly memory appropriately', () => {
      const { wasm } = PERFORMANCE_CONFIG;

      expect(wasm.initialMemoryPages).toBeLessThan(wasm.maximumMemoryPages);
      expect(wasm.stackSize).toBeGreaterThan(0);
      expect(wasm.tableSize).toBeGreaterThan(0);
    });
  });

  describe('PERFORMANCE_CONSTANTS', () => {
    it('should derive valid minimum update interval', () => {
      expect(PERFORMANCE_CONSTANTS.MIN_UPDATE_INTERVAL).toBeGreaterThanOrEqual(
        PERFORMANCE_CONFIG.updates.minimumUpdateInterval
      );
      expect(PERFORMANCE_CONSTANTS.MIN_UPDATE_INTERVAL).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.timing.targetFrameTime
      );
    });

    it('should calculate reasonable max updates per second', () => {
      expect(PERFORMANCE_CONSTANTS.MAX_UPDATES_PER_SECOND).toBeGreaterThanOrEqual(60);
      expect(PERFORMANCE_CONSTANTS.MAX_UPDATES_PER_SECOND).toBeLessThanOrEqual(1000);
    });

    it('should maintain appropriate update buffer size', () => {
      expect(PERFORMANCE_CONSTANTS.UPDATE_BUFFER_SIZE).toBe(
        PERFORMANCE_CONFIG.updates.batchSize * 2
      );
    });

    it('should limit maximum field radius', () => {
      expect(PERFORMANCE_CONSTANTS.MAX_FIELD_RADIUS).toBeLessThanOrEqual(
        Math.sqrt(2) // Maximum possible in normalized space
      );
      expect(PERFORMANCE_CONSTANTS.MAX_FIELD_RADIUS).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.physics.maxFieldRadius
      );
    });
  });

  describe('Device Adjusted Thresholds', () => {
    afterEach(() => {
      resetMocks();
    });

    it('should adjust memory limits based on device capabilities', () => {
      const mockJsHeapSizeLimit = 50 * 1024 * 1024; // 50MB
      mockPerformance({
        jsHeapSizeLimit: mockJsHeapSizeLimit,
        totalJSHeapSize: mockJsHeapSizeLimit,
        usedJSHeapSize: 0
      });

      const adjusted = getDeviceAdjustedThresholds();
      expect(adjusted.memory.maxHeapSize).toBe(mockJsHeapSizeLimit * 0.8);
    });

    it('should use default memory limits when performance.memory is unavailable', () => {
      mockPerformance(undefined);

      const adjusted = getDeviceAdjustedThresholds();
      expect(adjusted.memory.maxHeapSize).toBe(PERFORMANCE_CONFIG.memory.maxHeapSize);
    });

    it('should adjust worker count based on hardware concurrency', () => {
      mockNavigator(8);

      const adjusted = getDeviceAdjustedThresholds();
      expect(adjusted.resources.maxWorkers).toBe(7); // hardwareConcurrency - 1
    });

    it('should handle missing hardware concurrency gracefully', () => {
      mockNavigator(undefined);

      const adjusted = getDeviceAdjustedThresholds();
      expect(adjusted.resources.maxWorkers).toBe(1); // Minimum value
    });

    it('should never set maxWorkers below 1', () => {
      mockNavigator(1);

      const adjusted = getDeviceAdjustedThresholds();
      expect(adjusted.resources.maxWorkers).toBe(1);
    });
  });
});
