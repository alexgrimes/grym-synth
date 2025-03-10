import { MemoryProfiler } from '../memory-profile';
import { MemoryVisualizer } from '../memory-viz';
import { SequentialOrchestrator, ModelType } from '../../sequential/orchestrator';

describe('Memory Testing Infrastructure', () => {
  let profiler: MemoryProfiler;
  let visualizer: MemoryVisualizer;
  let orchestrator: SequentialOrchestrator;

  beforeEach(() => {
    profiler = new MemoryProfiler();
    visualizer = new MemoryVisualizer();
    orchestrator = new SequentialOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.unloadModel();
  });

  describe('Memory Profiling', () => {
    it('should track basic memory allocation', async () => {
      const initialSnapshot = await profiler.getActualMemoryUsage();
      
      // Allocate some memory
      const array = new Array(1000000).fill(0);
      
      const finalSnapshot = await profiler.getActualMemoryUsage();
      expect(finalSnapshot.heap).toBeGreaterThan(initialSnapshot.heap);
    });

    it('should respect memory limits', async () => {
      const testModel: ModelType = {
        id: 'test-model',
        name: 'Test Model',
        memoryRequirement: 15 * 1024 * 1024 * 1024, // 15GB
        capabilities: { transcription: true }
      };

      await expect(orchestrator.loadModel(testModel)).resolves.not.toThrow();
      
      const snapshot = await profiler.getActualMemoryUsage();
      expect(snapshot.heap + snapshot.external).toBeWithinMemoryLimit(16 * 1024 * 1024 * 1024);
    });
  });

  describe('Memory Growth Tracking', () => {
    it('should detect memory growth', async () => {
      const initialSnapshot = await profiler.getActualMemoryUsage();
      profiler.startTracking();

      // Create some memory allocations
      const arrays = [];
      for (let i = 0; i < 5; i++) {
        arrays.push(new Array(100000).fill(0));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      profiler.stopTracking();
      const finalSnapshot = await profiler.getActualMemoryUsage();
      
      expect(finalSnapshot.heap).toHaveAcceptableMemoryGrowth(initialSnapshot.heap, 0.5); // 50% threshold
    });
  });

  describe('Visualization', () => {
    it('should track memory events', async () => {
      const snapshot = await profiler.getActualMemoryUsage();
      visualizer.track(snapshot);

      const data = visualizer.getVisualizationData();
      expect(data.timestamps.length).toBe(1);
      expect(data.heapUsage.length).toBe(1);
      expect(data.externalUsage.length).toBe(1);
    });
  });

  describe('Model Memory Management', () => {
    it('should properly clean up memory after model unload', async () => {
      const initialSnapshot = await profiler.getActualMemoryUsage();

      const model: ModelType = {
        id: 'small-model',
        name: 'Small Test Model',
        memoryRequirement: 1 * 1024 * 1024 * 1024, // 1GB
        capabilities: { transcription: true }
      };

      await orchestrator.loadModel(model);
      const loadedSnapshot = await profiler.getActualMemoryUsage();
      
      await orchestrator.unloadModel();
      const unloadedSnapshot = await profiler.getActualMemoryUsage();

      // Allow for some overhead, but memory should be mostly freed
      const memoryDifference = unloadedSnapshot.heap - initialSnapshot.heap;
      expect(memoryDifference).toBeLessThan(50 * 1024 * 1024); // Less than 50MB difference
    });

    it('should handle multiple model load/unload cycles', async () => {
      const models: ModelType[] = [
        {
          id: 'model-1',
          name: 'Test Model 1',
          memoryRequirement: 1 * 1024 * 1024 * 1024,
          capabilities: { transcription: true }
        },
        {
          id: 'model-2',
          name: 'Test Model 2',
          memoryRequirement: 2 * 1024 * 1024 * 1024,
          capabilities: { synthesis: true }
        }
      ];

      const initialSnapshot = await profiler.getActualMemoryUsage();

      for (const model of models) {
        await orchestrator.loadModel(model);
        await orchestrator.unloadModel();
      }

      const finalSnapshot = await profiler.getActualMemoryUsage();
      
      // Memory usage should be stable after multiple load/unload cycles
      expect(finalSnapshot.heap).toHaveAcceptableMemoryGrowth(initialSnapshot.heap, 0.1);
    });
  });
});