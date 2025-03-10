import { ResourcePoolManager } from '../pool-manager';
import { ResourceType, Priority } from '../../types';
import { DEFAULT_POOL_CONFIG } from '../index';
import { TestResourceDetectorInterface, TestResourceDetector } from './test-helpers';

// Increase test timeout for integration tests
jest.setTimeout(60000);

async function waitForStateChange(ms: number = 100): Promise<void> {
  // First, allow any pending microtasks to complete
  await Promise.resolve();
  
  // Advance timers incrementally to avoid long jumps
  const increment = 10;
  for (let elapsed = 0; elapsed < ms; elapsed += increment) {
    jest.advanceTimersByTime(increment);
    // Allow any timer callbacks to execute
    await Promise.resolve();
    await new Promise(resolve => setImmediate(resolve));
  }
  
  // Final timer advance for any remainder
  const remainder = ms % increment;
  if (remainder > 0) {
    jest.advanceTimersByTime(remainder);
    await Promise.resolve();
    await new Promise(resolve => setImmediate(resolve));
  }
  
  // Ensure all promises are settled
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('ResourcePoolManager Integration', () => {
  let poolManager: ResourcePoolManager;
  let detector: TestResourceDetectorInterface;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();

    // Create detector with quieter logging
    detector = new TestResourceDetector(
      () => {}, // Skip resource logging
      () => {}  // Skip alert logging
    );
    
    // Create pool manager with faster intervals
    poolManager = new ResourcePoolManager(detector as any, {
      ...DEFAULT_POOL_CONFIG,
      cleanupIntervalMs: 50,  // Faster cleanup
      resourceTimeoutMs: 25   // Faster timeout
    });

    // Start monitoring and wait for initial state
    detector.start();
    await waitForStateChange(100);
    
    // Verify initial state is healthy
    const initialState = poolManager.monitor();
    expect(initialState.health).toBe('healthy');
    expect(initialState.utilization).toBeLessThan(0.7);
  });

  afterEach(async () => {
    // Ensure cleanup completes
    await waitForStateChange(200);
    detector.stop();
    detector.dispose();
    poolManager.dispose();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('Resource Detection Integration', () => {
    it('should handle resource availability changes', async () => {
      const monitor = detector.getResourceMonitor();
      const request = {
        id: 'test-1',
        type: ResourceType.Memory,
        priority: Priority.High,
        requirements: {
          memory: 1024 * 100 // 100KB
        }
      };

      // Initial allocation should succeed
      const resource = await poolManager.allocate(request);
      monitor.takeSnapshot(detector.getCurrentResources(), poolManager.monitor().health);
      expect(resource).toBeDefined();
      expect(poolManager.monitor().health).toBe('healthy');

      // Reduce available memory
      detector.setAvailableMemory(1024); // 1KB
      await waitForStateChange(50);

      // Next allocation should fail
      await expect(poolManager.allocate(request)).rejects.toThrow('System resources exhausted');
      monitor.takeSnapshot(detector.getCurrentResources(), poolManager.monitor().health);

      const trend = monitor.getResourceTrend();
      expect(trend[trend.length - 1].health).toBe('warning');
    });

    it('should handle CPU resource changes', async () => {
      const monitor = detector.getResourceMonitor();
      const request = {
        id: 'test-2',
        type: ResourceType.Memory,
        priority: Priority.High,
        requirements: {
          cpu: 50 // 50% CPU
        }
      };

      // Initial allocation should succeed
      const resource = await poolManager.allocate(request);
      monitor.takeSnapshot(detector.getCurrentResources(), poolManager.monitor().health);
      expect(resource).toBeDefined();
      expect(poolManager.monitor().health).toBe('healthy');

      // Reduce available CPU
      detector.setAvailableCPU(1); // 1 core
      await waitForStateChange(50);

      // Next allocation should fail
      await expect(poolManager.allocate(request)).rejects.toThrow('System resources exhausted');
      monitor.takeSnapshot(detector.getCurrentResources(), poolManager.monitor().health);

      const trend = monitor.getResourceTrend();
      expect(trend[trend.length - 1].health).toBe('warning');
    });
  });

  describe('Health Monitor Integration', () => {
    it('should update pool health based on resource status', async () => {
      const monitor = detector.getResourceMonitor();
      let stateChanges = 0;

      // Listen for state changes
      poolManager.on('stateChange', () => {
        stateChanges++;
      });

      // Initial state should be healthy
      expect(poolManager.monitor().health).toBe('healthy');
      monitor.takeSnapshot(detector.getCurrentResources(), poolManager.monitor().health);

      // Set warning status
      detector.setResourceStatus('warning');
      await waitForStateChange(50);
      expect(poolManager.monitor().health).toBe('warning');

      // Set critical status
      detector.setResourceStatus('critical');
      await waitForStateChange(50);
      expect(poolManager.monitor().health).toBe('critical');

      // Should have received state change events
      expect(stateChanges).toBe(2);

      const trend = monitor.getResourceTrend();
      expect(trend.map(s => s.health)).toEqual(['healthy', 'warning', 'critical']);
    });

    it('should handle rapid state transitions', async () => {
      const monitor = detector.getResourceMonitor();
      const stateChanges: string[] = [];

      // Listen for state changes
      poolManager.on('stateChange', (event) => {
        stateChanges.push(`${event.from}->${event.to}`);
      });

      // Rapid transitions
      for (let i = 0; i < 5; i++) {
        detector.setResourceStatus('warning');
        await waitForStateChange(20);

        detector.setResourceStatus('critical');
        await waitForStateChange(20);

        detector.setAvailableMemory(detector.getCurrentResources().memory.total * 0.9);
        await waitForStateChange(20);

        monitor.takeSnapshot(detector.getCurrentResources(), poolManager.monitor().health);
      }

      // Should handle transitions without errors
      expect(stateChanges.length).toBeGreaterThan(0);
      expect(poolManager.monitor().health).toBe('healthy');
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with changing resource availability', async () => {
      const monitor = detector.getResourceMonitor();
      const iterations = 100;
      const results: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Allocate resource
        const resource = await poolManager.allocate({
          id: `test-${i}`,
          type: ResourceType.Memory,
          priority: Priority.Medium,
          requirements: {
            memory: 1024,
            cpu: 5
          }
        });

        // Change resource availability
        if (i % 10 === 0) {
          detector.setAvailableMemory(detector.getCurrentResources().memory.total * (0.5 + Math.random() * 0.4));
          await waitForStateChange(20);
        }

        // Release resource
        await poolManager.release(resource);
        results.push(performance.now() - start);

        if (i % 10 === 0) {
          monitor.takeSnapshot(detector.getCurrentResources(), poolManager.monitor().health);
        }
      }

      const averageTime = results.reduce((a, b) => a + b) / results.length;
      expect(averageTime).toBeLessThan(10); // Should maintain reasonable performance

      const trend = monitor.getResourceTrend();
      expect(trend.length).toBeGreaterThan(0);
    });
  });
});