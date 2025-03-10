import { ResourcePoolManager } from '../pool-manager';
import { ResourceType, Priority } from '../../types';
import { DEFAULT_POOL_CONFIG } from '../index';
import { ResourcePoolError } from '../types';
import { TestResourceDetector } from './test-helpers';

// Helper function to wait for state changes and timer updates
async function waitForStateChange(ms: number = 10): Promise<void> {
  const increment = 1;
  for (let i = 0; i < ms; i += increment) {
    jest.advanceTimersByTime(increment);
    await Promise.resolve();
  }
  // Final ticks to ensure all promises resolve
  await Promise.resolve();
  await Promise.resolve();
}

describe('ResourcePoolManager', () => {
  let poolManager: ResourcePoolManager;
  let detector: TestResourceDetector;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
    
    detector = new TestResourceDetector();
    
    poolManager = new ResourcePoolManager(detector, {
      ...DEFAULT_POOL_CONFIG,
      cleanupIntervalMs: 50,    // Fast cleanup but not too fast
      resourceTimeoutMs: 100,   // Short but reasonable timeout
      minPoolSize: 1,           // Small pool for faster tests
      maxPoolSize: 10,
      cacheMaxSize: 5,          // Small cache
      warningThreshold: 0.7,    // 70% utilization triggers warning
      criticalThreshold: 0.9    // 90% utilization triggers critical
    });

    detector.start();
    await waitForStateChange(10);
  });

  afterEach(async () => {
    await waitForStateChange(10);
    detector.stop();
    poolManager.dispose();
    jest.clearAllTimers();
  });

  describe('Resource Tracking', () => {
    it('should handle cleanup of stale resources', async () => {
      // Create resource with very short timeout
      const request = {
        id: 'test-stale',
        type: ResourceType.Memory,
        priority: Priority.Low,
        requirements: {
          memory: 1024,
          timeoutMs: 1 // Minimal timeout
        }
      };

      // Allocate and verify initial state
      const resource = await poolManager.allocate(request);
      const initialStatus = poolManager.monitor();
      expect(initialStatus.utilization).toBeGreaterThan(0);
      
      // Force resource to be stale by advancing time past resourceTimeoutMs
      jest.advanceTimersByTime(150); // Advance past the 100ms timeout
      
      // Run cleanup cycle (advance past cleanupIntervalMs)
      jest.advanceTimersByTime(100); // Advance past the 50ms cleanup interval
      await waitForStateChange(10);
      
      // Verify resource was cleaned up
      expect(poolManager.monitor().utilization).toBe(0);

      // Try to release the cleaned up resource
      let error: Error | undefined;
      try {
        await poolManager.release(resource);
      } catch (err) {
        error = err as Error;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ResourcePoolError);
      expect((error as ResourcePoolError).code).toBe('RESOURCE_STALE');
      expect(error?.message).toBe('Resource is stale');
    });
  });

  describe('Health Status Transitions', () => {
    it('should transition through health states correctly', async () => {
      // Set initial healthy state with low utilization
      detector.mockAvailability({
        status: 'healthy',
        memory: {
          utilizationPercent: 20,
          isAvailable: true,
          availableAmount: 8000
        },
        cpu: {
          utilizationPercent: 20,
          isAvailable: true,
          availableCores: 4
        },
        disk: {
          utilizationPercent: 20,
          isAvailable: true,
          availableSpace: 80000
        }
      });
      await waitForStateChange(10);
      expect(poolManager.monitor().health).toBe('healthy');

      // Update detector and force availability check
      detector.mockAvailability({
        status: 'warning',
        memory: {
          utilizationPercent: 82,
          isAvailable: true,
          availableAmount: 2000
        },
        cpu: {
          utilizationPercent: 75,
          isAvailable: true,
          availableCores: 2
        },
        disk: {
          utilizationPercent: 82,
          isAvailable: true,
          availableSpace: 20000
        }
      });
      
      // Force availability update using public method
      await poolManager.forceUpdate();
      await waitForStateChange(10);
      expect(poolManager.monitor().health).toBe('warning');

      // Set critical state and force update
      detector.mockAvailability({
        status: 'critical',
        memory: {
          utilizationPercent: 92,
          isAvailable: false,
          availableAmount: 800
        },
        cpu: {
          utilizationPercent: 95,
          isAvailable: false,
          availableCores: 1
        },
        disk: {
          utilizationPercent: 95,
          isAvailable: false,
          availableSpace: 5000
        }
      });
      await poolManager.forceUpdate();
      await waitForStateChange(10);
      expect(poolManager.monitor().health).toBe('critical');

      // Return to healthy state and force update
      detector.mockAvailability({
        status: 'healthy',
        memory: {
          utilizationPercent: 20,
          isAvailable: true,
          availableAmount: 8000
        },
        cpu: {
          utilizationPercent: 20,
          isAvailable: true,
          availableCores: 4
        },
        disk: {
          utilizationPercent: 20,
          isAvailable: true,
          availableSpace: 80000
        }
      });
      await poolManager.forceUpdate();
      await waitForStateChange(10);
      expect(poolManager.monitor().health).toBe('healthy');
    });
  });
});