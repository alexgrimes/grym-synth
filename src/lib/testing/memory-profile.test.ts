import { MemoryProfiler, MemorySnapshot } from './memory-profile';

describe('MemoryProfiler', () => {
  let profiler: MemoryProfiler;
  const TEST_MEMORY_LIMIT = 16 * 1024 * 1024 * 1024; // 16GB

  beforeEach(() => {
    profiler = new MemoryProfiler(TEST_MEMORY_LIMIT);
  });

  afterEach(() => {
    profiler.stopTracking();
  });

  describe('Memory Tracking', () => {
    it('should get actual memory usage', async () => {
      const usage = await profiler.getActualMemoryUsage();
      expect(usage).toBeDefined();
      expect(usage.heap).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(usage.heap);
      expect(usage.timestamp).toBeGreaterThan(0);
    });

    it('should take and store snapshots', async () => {
      const snapshot1 = await profiler.takeSnapshot('test1');
      const snapshot2 = await profiler.takeSnapshot('test2');

      expect(snapshot1.label).toBe('test1');
      expect(snapshot2.label).toBe('test2');
      expect(snapshot2.timestamp).toBeGreaterThanOrEqual(snapshot1.timestamp);
    });

    it('should calculate memory deltas', async () => {
      await profiler.takeSnapshot('start');
      
      // Allocate some memory
      const bigArray = new Array(1000000).fill(0);
      
      await profiler.takeSnapshot('end');
      
      const delta = profiler.getMemoryDelta('start', 'end');
      expect(delta).toBeDefined();
      expect(delta!.heapDelta).toBeGreaterThan(0);
      expect(delta!.duration).toBeGreaterThan(0);
    });
  });

  describe('Continuous Tracking', () => {
    it('should track memory usage over time', async () => {
      profiler.startTracking(100); // 100ms interval
      
      // Wait for multiple snapshots
      await new Promise(resolve => setTimeout(resolve, 350));
      
      profiler.stopTracking();
      const snapshots = profiler.getSnapshots();
      
      expect(snapshots.length).toBeGreaterThanOrEqual(3);
      expect(snapshots[snapshots.length - 1].timestamp)
        .toBeGreaterThan(snapshots[0].timestamp);
    });

    it('should detect memory limit violations', async () => {
      const lowMemProfiler = new MemoryProfiler(1024); // 1KB limit
      const consoleSpy = jest.spyOn(console, 'warn');
      
      lowMemProfiler.startTracking(100);
      
      // Allocate memory to trigger warning
      const bigArray = new Array(100000).fill(0);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      lowMemProfiler.stopTracking();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory limit exceeded')
      );
    });
  });

  describe('Model Events', () => {
    it('should track model events', () => {
      profiler.recordModelEvent('load', 'modelA');
      profiler.recordModelEvent('unload', 'modelA');
      profiler.recordModelEvent('load', 'modelB');

      const events = profiler.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0]).toEqual(expect.objectContaining({
        type: 'load',
        model: 'modelA'
      }));
    });

    it('should include events in memory report', () => {
      profiler.recordModelEvent('load', 'testModel');
      const report = profiler.generateReport();
      
      expect(report).toContain('testModel');
      expect(report).toContain('load:');
    });
  });

  describe('Memory Statistics', () => {
    it('should calculate peak memory usage', async () => {
      await profiler.takeSnapshot('baseline');
      
      // Allocate some memory
      const arrays = Array.from({ length: 5 }, () => new Array(100000).fill(0));
      
      await profiler.takeSnapshot('peak');
      const peak = profiler.getPeakMemoryUsage();
      
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThan(TEST_MEMORY_LIMIT);
    });

    it('should calculate average memory usage', async () => {
      await profiler.takeSnapshot('start');
      
      // Take multiple snapshots with different memory usage
      for (let i = 0; i < 3; i++) {
        const array = new Array(50000 * (i + 1)).fill(0);
        await profiler.takeSnapshot(`snapshot_${i}`);
      }
      
      const average = profiler.getAverageMemoryUsage();
      expect(average).toBeGreaterThan(0);
      expect(average).toBeLessThan(profiler.getPeakMemoryUsage());
    });

    it('should generate comprehensive memory report', async () => {
      await profiler.takeSnapshot('init');
      profiler.recordModelEvent('load', 'modelX');
      await profiler.takeSnapshot('loaded');
      profiler.recordModelEvent('unload', 'modelX');
      await profiler.takeSnapshot('final');

      const report = profiler.generateReport();
      
      expect(report).toContain('Memory Profile Report');
      expect(report).toContain('Peak Usage');
      expect(report).toContain('Average Usage');
      expect(report).toContain('modelX');
      expect(report).toMatch(/Duration: .+/);
      expect(report).toMatch(/Snapshots: \d+/);
    });
  });
});