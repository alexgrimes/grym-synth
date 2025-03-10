import { ResourceManager } from './resource-manager';
import { createMockSystemResources, createMockModelResourceMetrics } from './test-helpers';
import { 
  ResourceManagerConfig, 
  ModelResourceMetrics,
  MemoryOptimizationOptions,
  MemoryOptimizedEventData,
  SystemResources,
  ModelUnloadedEventData,
  ResourceManagerEventData,
  BuffersConfig
} from './types';

describe('Resource Manager', () => {
  let resourceManager: ResourceManager;
  const mockConfig: ResourceManagerConfig = {
    limits: {
      maxModelsLoaded: 2,
      memoryThreshold: 0.8,
      inactivityTimeout: 1000
    },
    buffers: {
      context: {
        initial: 1000,
        max: 2000,
        compressionThreshold: 0.8
      },
      working: {
        initial: 500,
        max: 1000,
        optimizationThreshold: 0.9
      }
    },
    modelSizes: {
      'test-model': 5000,
      'test-model-1': 5000,
      'test-model-2': 5000
    },
    memoryPressure: {
      warning: 0.7,
      critical: 0.9,
      action: 'compress'
    },
    contextPreservation: {
      enabled: true,
      preservationStrategy: 'selective',
      maxPreservedContexts: 5,
      preservationThreshold: 0.6
    },
    debug: true
  };

  beforeEach(() => {
    resourceManager = new ResourceManager(mockConfig);
    // Reset system metrics
    (resourceManager as any).systemMetrics = createMockSystemResources();
  });

  afterEach(() => {
    resourceManager.destroy();
    jest.restoreAllMocks();
  });

  describe('Model Loading', () => {
    it('should load a model successfully', async () => {
      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      const metrics = await resourceManager.getResourceMetrics();
      const model = metrics.models.get(modelId);

      expect(model).toBeDefined();
      expect(model?.status).toBe('ready');
      expect(model?.memoryUsage).toBeGreaterThan(0);
    });

    it('should enforce model limits', async () => {
      const config: ResourceManagerConfig = {
        ...mockConfig,
        limits: {
          ...mockConfig.limits,
          maxModelsLoaded: 1
        }
      };

      const limitedManager = new ResourceManager(config);
      await limitedManager.loadModel('test-model-1');

      await expect(limitedManager.loadModel('test-model-2'))
        .rejects
        .toThrow('Maximum number of models loaded');
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage correctly', async () => {
      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      const metrics = await resourceManager.getResourceMetrics();
      expect(metrics.system.allocatedMemory).toBeGreaterThan(0);
      expect(metrics.system.memoryPressure).toBeGreaterThanOrEqual(0);
      expect(metrics.system.memoryPressure).toBeLessThanOrEqual(1);
    });

    it('should optimize memory when needed', async () => {
      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      const beforeMetrics = await resourceManager.getResourceMetrics();
      await resourceManager.optimizeMemory(modelId);
      const afterMetrics = await resourceManager.getResourceMetrics();

      expect(afterMetrics.system.allocatedMemory).toBeLessThan(beforeMetrics.system.allocatedMemory);
    });
  });

  describe('Event Handling', () => {
    it('should emit events for model lifecycle changes', async () => {
      const events: ResourceManagerEventData[] = [];
      resourceManager.addEventListener((event) => {
        events.push(event.data as ResourceManagerEventData);
      });

      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'modelLoaded',
          modelId,
          metrics: expect.any(Object)
        })
      );
    });

    it('should emit memory optimization events', async () => {
      const events: ResourceManagerEventData[] = [];
      resourceManager.addEventListener((event) => {
        events.push(event.data as ResourceManagerEventData);
      });

      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);
      await resourceManager.optimizeMemory(modelId);

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'memoryOptimized',
          data: expect.objectContaining({
            modelId,
            savedMemory: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model IDs', async () => {
      await expect(resourceManager.loadModel('non-existent-model'))
        .rejects
        .toThrow('Unknown model');
    });

    it('should handle memory allocation failures', async () => {
      const lowMemoryConfig = {
        ...mockConfig,
        limits: {
          ...mockConfig.limits,
          memoryThreshold: 0.1
        }
      };

      const lowMemoryManager = new ResourceManager(lowMemoryConfig);
      await expect(lowMemoryManager.loadModel('test-model'))
        .rejects
        .toThrow('Memory limit exceeded');
    });
  });
});