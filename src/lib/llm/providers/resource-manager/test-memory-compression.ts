import { ResourceManager } from './resource-manager';
import { 
  createMockModelMetrics,
  createMockSystemResources,
  DEFAULT_TEST_CONFIG,
  DEFAULT_TEST_BUFFER_CONFIG,
  simulateHighContextUsage,
  simulateHighWorkingMemory,
  simulateMemoryPressure,
  getBufferConfig
} from './test-helpers';
import {
  MemoryOptimizationOptions,
  ResourceManagerEventType,
  MemoryOptimizedEventData,
  ModelUnloadedEventData
} from './types';

describe('ResourceManager Memory Compression', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager(DEFAULT_TEST_CONFIG);
  });

  afterEach(async () => {
    // Clean up any loaded models
    const metrics = await resourceManager.getResourceMetrics();
    await Promise.all(
      Array.from(metrics.models.keys()).map(id => resourceManager.unloadModel(id))
    );
    resourceManager.destroy();
  });

  describe('Context Window Compression', () => {
    it('should compress context when threshold is exceeded', async () => {
      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      const options: MemoryOptimizationOptions = {
        strategy: 'summarize',
        threshold: 0.8
      };

      // Track optimization events
      const optimizationEvents: MemoryOptimizedEventData[] = [];
      resourceManager.addEventListener((type, data) => {
        if (type === 'memoryOptimized') {
          optimizationEvents.push(data as MemoryOptimizedEventData);
        }
      });

      // Simulate high context usage
      const metrics = await resourceManager.getResourceMetrics();
      const model = metrics.models.get(modelId);
      if (model) {
        const maxContext = DEFAULT_TEST_BUFFER_CONFIG.context.max;
        const updatedMetrics = simulateHighContextUsage(model, 0.9, maxContext);
        metrics.models.set(modelId, updatedMetrics);
      }

      await resourceManager.optimizeMemory(modelId, options);

      expect(optimizationEvents.length).toBe(1);
      const event = optimizationEvents[0];
      expect(event.modelId).toBe(modelId);
      expect(event.strategy).toBe(options.strategy);
      expect(event.savedMemory).toBeGreaterThan(0);
      expect(event.type).toBe('memoryOptimized');
    });

    it('should handle multiple compression strategies', async () => {
      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      const strategies: Array<MemoryOptimizationOptions['strategy']> = [
        'summarize',
        'prune',
        'selective'
      ];

      const optimizationResults = await Promise.all(
        strategies.map(async (strategy) => {
          const options: MemoryOptimizationOptions = {
            strategy,
            threshold: 0.8
          };

          const metrics = await resourceManager.getResourceMetrics();
          const model = metrics.models.get(modelId);
          if (model) {
            const maxContext = DEFAULT_TEST_BUFFER_CONFIG.context.max;
            const updatedMetrics = simulateHighContextUsage(model, 0.9, maxContext);
            metrics.models.set(modelId, updatedMetrics);
          }

          await resourceManager.optimizeMemory(modelId, options);
          return resourceManager.getResourceMetrics();
        })
      );

      optimizationResults.forEach((result, index) => {
        const model = result.models.get(modelId);
        expect(model).toBeDefined();
        if (model) {
          expect(model.buffers.context).toBeLessThan(
            DEFAULT_TEST_BUFFER_CONFIG.context.max * 0.9
          );
        }
      });
    });
  });

  describe('Working Memory Optimization', () => {
    it('should optimize working memory under pressure', async () => {
      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      // Track optimization events
      const optimizationEvents: MemoryOptimizedEventData[] = [];
      resourceManager.addEventListener((type, data) => {
        if (type === 'memoryOptimized') {
          optimizationEvents.push(data as MemoryOptimizedEventData);
        }
      });

      // Simulate high working memory usage
      const metrics = await resourceManager.getResourceMetrics();
      const model = metrics.models.get(modelId);
      if (model) {
        const maxWorking = DEFAULT_TEST_BUFFER_CONFIG.working.max;
        const updatedMetrics = simulateHighWorkingMemory(model, 0.95, maxWorking);
        metrics.models.set(modelId, updatedMetrics);
      }

      await resourceManager.optimizeMemory(modelId);

      expect(optimizationEvents.length).toBe(1);
      expect(optimizationEvents[0].modelId).toBe(modelId);
      expect(optimizationEvents[0].savedMemory).toBeGreaterThan(0);

      const updatedMetrics = await resourceManager.getResourceMetrics();
      const updatedModel = updatedMetrics.models.get(modelId);
      expect(updatedModel).toBeDefined();
      if (updatedModel) {
        expect(updatedModel.buffers.working).toBeLessThan(
          DEFAULT_TEST_BUFFER_CONFIG.working.max * 0.95
        );
      }
    });
  });

  describe('Memory Pressure Handling', () => {
    it('should handle critical memory pressure', async () => {
      // Load multiple models
      const modelIds = ['test-model-1', 'test-model-2'];
      await Promise.all(modelIds.map(id => resourceManager.loadModel(id)));

      // Track events
      const events: Array<{
        type: string;
        data: MemoryOptimizedEventData | ModelUnloadedEventData;
      }> = [];
      resourceManager.addEventListener((type, data) => {
        if (type === 'memoryOptimized' || type === 'modelUnloaded') {
          events.push({
            type,
            data: data as MemoryOptimizedEventData | ModelUnloadedEventData
          });
        }
      });

      // Simulate critical memory pressure
      const metrics = await resourceManager.getResourceMetrics();
      const pressuredMetrics = simulateMemoryPressure(metrics.system, 0.95);
      Object.assign(metrics.system, pressuredMetrics);

      // Try to load another model
      await resourceManager.loadModel('test-model-3');

      // Verify compression and unloading occurred
      const compressionEvents = events.filter(e => e.type === 'memoryOptimized') as Array<{type: string; data: MemoryOptimizedEventData}>;
      const unloadEvents = events.filter(e => e.type === 'modelUnloaded') as Array<{type: string; data: ModelUnloadedEventData}>;

      expect(compressionEvents.length).toBeGreaterThan(0);
      expect(unloadEvents.length).toBeGreaterThan(0);

      const finalMetrics = await resourceManager.getResourceMetrics();
      expect(finalMetrics.system.memoryPressure).toBeLessThan(0.95);
    });

    it('should prioritize model unloading based on usage', async () => {
      // Load multiple models with different last used times
      const modelIds = ['test-model-1', 'test-model-2'];
      await Promise.all(modelIds.map(id => resourceManager.loadModel(id)));

      const metrics = await resourceManager.getResourceMetrics();
      
      // Set different last used times
      const now = Date.now();
      const model1 = metrics.models.get('test-model-1');
      const model2 = metrics.models.get('test-model-2');
      if (model1 && model2) {
        model1.lastUsed = now - 60000; // 1 minute ago
        model2.lastUsed = now - 300000; // 5 minutes ago
      }

      // Track unload events
      const unloadedModels: string[] = [];
      resourceManager.addEventListener((type, data) => {
        if (type === 'modelUnloaded') {
          unloadedModels.push((data as ModelUnloadedEventData).modelId);
        }
      });

      // Simulate memory pressure and load new model
      Object.assign(metrics.system, simulateMemoryPressure(metrics.system, 0.95));
      await resourceManager.loadModel('test-model-3');

      // Verify least recently used model was unloaded first
      expect(unloadedModels[0]).toBe('test-model-2');
    });
  });
});