import { ResourceManager } from '../resource-manager';
import { createMockSystemResources, createMockModelResourceMetrics } from '../test-helpers';
import { mockConfig, createTestConfig } from './test-config';
import { 
  ResourceManagerConfig, 
  ModelResourceMetrics,
  MemoryOptimizationOptions,
  MemoryOptimizedEventData,
  SystemResources,
  ModelUnloadedEventData,
  ResourceManagerEventData,
  BuffersConfig,
  ResourceManagerEvent
} from '../types';

describe('Resource Manager', () => {
  let resourceManager: ResourceManager;

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
      expect(model?.contextState).toBeDefined();
      expect(model?.contextState.modelId).toBe(modelId);
    });

    it('should enforce memory limits', async () => {
      const limitedManager = new ResourceManager(createTestConfig({
        limits: {
          ...mockConfig.limits,
          memoryThreshold: 0.1
        }
      }));

      await expect(limitedManager.loadModel('test-model'))
        .rejects
        .toThrow('Memory limit exceeded');
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage correctly', async () => {
      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      const metrics = await resourceManager.getResourceMetrics();
      expect(metrics.system.allocatedMemory).toBeGreaterThan(0);
      expect(metrics.system.availableMemory).toBeLessThan(metrics.system.totalMemory);
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
      expect(afterMetrics.system.availableMemory).toBeGreaterThan(beforeMetrics.system.availableMemory);
    });
  });

  describe('Event Handling', () => {
    it('should emit events for model lifecycle changes', async () => {
      const events: ResourceManagerEvent[] = [];
      resourceManager.addEventListener((event) => {
        events.push(event);
      });

      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);

      const modelLoadedEvent = events.find(e => e.type === 'modelLoaded');
      expect(modelLoadedEvent).toBeDefined();
      expect(modelLoadedEvent?.data).toMatchObject({
        type: 'modelLoaded',
        modelId,
        metrics: expect.any(Object)
      });
    });

    it('should emit memory optimization events', async () => {
      const events: ResourceManagerEvent[] = [];
      resourceManager.addEventListener((event) => {
        events.push(event);
      });

      const modelId = 'test-model';
      await resourceManager.loadModel(modelId);
      await resourceManager.optimizeMemory(modelId);

      const optimizationEvent = events.find(e => e.type === 'memoryOptimized');
      expect(optimizationEvent).toBeDefined();
      expect(optimizationEvent?.data).toMatchObject({
        type: 'memoryOptimized',
        data: expect.objectContaining({
          modelId,
          savedMemory: expect.any(Number),
          strategy: expect.any(String)
        })
      });
    });

    it('should emit error events when optimization fails', async () => {
      const events: ResourceManagerEvent[] = [];
      resourceManager.addEventListener((event) => {
        events.push(event);
      });

      await expect(resourceManager.optimizeMemory('non-existent-model'))
        .rejects
        .toThrow('Model not found');

      const errorEvent = events.find(e => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data).toMatchObject({
        type: 'error',
        error: expect.any(Error),
        context: expect.any(Object)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model IDs', async () => {
      await expect(resourceManager.loadModel('non-existent-model'))
        .rejects
        .toThrow('Unknown model');
    });

    it('should handle memory allocation failures', async () => {
      const lowMemoryManager = new ResourceManager(createTestConfig({
        limits: {
          ...mockConfig.limits,
          memoryThreshold: 0.1
        }
      }));

      await expect(lowMemoryManager.loadModel('test-model'))
        .rejects
        .toThrow('Memory limit exceeded');
    });
  });
});