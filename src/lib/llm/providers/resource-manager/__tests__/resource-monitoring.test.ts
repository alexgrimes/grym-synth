import { ResourceManager } from '../resource-manager';
import { ResourceError } from '../types';
import { 
  createTestMessage, 
  createTestModelConstraints,
  createTestSystemResources,
  DEFAULT_MODEL_CONSTRAINTS
} from '../test/test-helpers';

describe('Resource Monitoring', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager({
      maxMemoryUsage: 1000,
      maxCpuUsage: 80,
      optimizationThreshold: 0.8,
      cleanupInterval: 1000
    });
  });

  afterEach(async () => {
    await resourceManager.cleanup();
    jest.restoreAllMocks();
  });

  describe('Memory Tracking', () => {
    it('should track memory usage accurately', async () => {
      const initialResources = await resourceManager.getCurrentResources();
      
      // Add some messages to increase memory usage
      await resourceManager.initializeContext('test', DEFAULT_MODEL_CONSTRAINTS);
      for (let i = 0; i < 5; i++) {
        await resourceManager.addMessage('test', createTestMessage('test message ' + i));
      }

      const updatedResources = await resourceManager.getCurrentResources();
      expect(updatedResources.memory).toBeGreaterThan(initialResources.memory || 0);
    });

    it('should detect memory pressure', async () => {
      // Mock high memory usage
      jest.spyOn(resourceManager as any, 'getCurrentResources').mockResolvedValue(
        createTestSystemResources({
          memory: 900,
          totalMemory: 1000,
          memoryPressure: 0.9
        })
      );

      const resources = await resourceManager.getCurrentResources();
      expect(resources.memoryPressure).toBeGreaterThan(0.8);
    });
  });

  describe('CPU Utilization', () => {
    it('should monitor CPU usage', async () => {
      const resources = await resourceManager.getCurrentResources();
      expect(resources.cpu).toBeDefined();
      expect(typeof resources.cpu).toBe('number');
    });

    it('should throttle under high CPU load', async () => {
      // Mock high CPU usage
      jest.spyOn(resourceManager as any, 'getCurrentResources').mockResolvedValue(
        createTestSystemResources({
          cpu: 90,
          totalMemory: 1000
        })
      );

      await expect(
        resourceManager.addMessage('test', createTestMessage('test'))
      ).rejects.toThrow(ResourceError);
    });
  });

  describe('Resource Limits', () => {
    it('should enforce memory limits', async () => {
      // Mock memory exhaustion
      jest.spyOn(resourceManager as any, 'getCurrentResources').mockResolvedValue(
        createTestSystemResources({
          memory: 1100,
          totalMemory: 1000
        })
      );

      await expect(
        resourceManager.addMessage('test', createTestMessage('test'))
      ).rejects.toThrow('Memory limit exceeded');
    });

    it('should trigger optimization under pressure', async () => {
      const optimizeSpy = jest.spyOn(resourceManager as any, 'optimizeResources');
      
      // Mock increasing memory pressure
      jest.spyOn(resourceManager as any, 'getCurrentResources').mockResolvedValue(
        createTestSystemResources({
          memory: 850,
          totalMemory: 1000,
          memoryPressure: 0.85
        })
      );

      await resourceManager.initializeContext('test', DEFAULT_MODEL_CONSTRAINTS);
      await resourceManager.addMessage('test', createTestMessage('test'));
      expect(optimizeSpy).toHaveBeenCalled();
    });
  });

  describe('Resource Optimization', () => {
    it('should free resources when needed', async () => {
      const initialResources = await resourceManager.getCurrentResources();
      
      // Fill up memory
      await resourceManager.initializeContext('test1', DEFAULT_MODEL_CONSTRAINTS);
      await resourceManager.initializeContext('test2', DEFAULT_MODEL_CONSTRAINTS);
      
      for (let i = 0; i < 10; i++) {
        await resourceManager.addMessage('test1', createTestMessage('test message ' + i));
        await resourceManager.addMessage('test2', createTestMessage('test message ' + i));
      }

      // Trigger optimization
      await resourceManager.optimizeResources();
      
      const finalResources = await resourceManager.getCurrentResources();
      expect(finalResources.memory).toBeLessThan(initialResources.memory || Infinity);
    });

    it('should maintain system stability during optimization', async () => {
      const eventSpy = jest.fn();
      resourceManager.on('memory_optimized', eventSpy);

      // Trigger optimization
      await resourceManager.optimizeResources();

      expect(eventSpy).toHaveBeenCalled();
      const event = eventSpy.mock.calls[0][0];
      expect(event.type).toBe('memory_optimized');
      expect(event.data.bytesFreed).toBeGreaterThan(0);
    });
  });

  describe('Resource Event Handling', () => {
    it('should emit events on resource pressure', async () => {
      const pressureEventSpy = jest.fn();
      resourceManager.on('resourcePressure', pressureEventSpy);

      // Mock high memory pressure
      jest.spyOn(resourceManager as any, 'getCurrentResources').mockResolvedValue(
        createTestSystemResources({
          memory: 900,
          totalMemory: 1000,
          memoryPressure: 0.9
        })
      );

      await resourceManager.initializeContext('test', DEFAULT_MODEL_CONSTRAINTS);
      await resourceManager.addMessage('test', createTestMessage('test'));
      expect(pressureEventSpy).toHaveBeenCalled();
    });

    it('should handle resource exhaustion gracefully', async () => {
      const exhaustionEventSpy = jest.fn();
      resourceManager.on('resourceExhausted', exhaustionEventSpy);

      // Mock resource exhaustion
      jest.spyOn(resourceManager as any, 'getCurrentResources').mockResolvedValue(
        createTestSystemResources({
          memory: 1100,
          totalMemory: 1000,
          memoryPressure: 1.0
        })
      );

      try {
        await resourceManager.addMessage('test', createTestMessage('test'));
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceError);
        expect(exhaustionEventSpy).toHaveBeenCalled();
      }
    });
  });
});