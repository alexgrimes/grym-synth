import { ResourceManager } from '../resource-manager';
import { ResourceError } from '../types';
import { 
  createTestMessage, 
  createTestModelConstraints,
  createTestSystemResources,
  DEFAULT_MODEL_CONSTRAINTS
} from '../test/test-helpers';

describe('Memory Compression', () => {
  let resourceManager: ResourceManager;
  const TEST_CONTEXT_ID = 'test-context';

  beforeEach(async () => {
    resourceManager = new ResourceManager({
      maxMemoryUsage: 1000,
      maxCpuUsage: 80,
      optimizationThreshold: 0.7,
      cleanupInterval: 1000
    });
    await resourceManager.initializeContext(TEST_CONTEXT_ID, DEFAULT_MODEL_CONSTRAINTS);
  });

  afterEach(async () => {
    await resourceManager.cleanup();
    jest.restoreAllMocks();
  });

  describe('Compression Triggers', () => {
    it('should trigger optimization when memory pressure exceeds threshold', async () => {
      const optimizeSpy = jest.spyOn(resourceManager, 'optimizeResources');
      const message = createTestMessage('test message with significant content '.repeat(50));

      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      
      expect(optimizeSpy).toHaveBeenCalled();
    });

    it('should respect optimization threshold settings', async () => {
      const customManager = new ResourceManager({
        maxMemoryUsage: 1000,
        optimizationThreshold: 0.9,
        cleanupInterval: 1000
      });
      await customManager.initializeContext(TEST_CONTEXT_ID, DEFAULT_MODEL_CONSTRAINTS);

      const optimizeSpy = jest.spyOn(customManager, 'optimizeResources');
      const message = createTestMessage('small message');

      await customManager.addMessage(TEST_CONTEXT_ID, message);
      
      expect(optimizeSpy).not.toHaveBeenCalled();
    });

    it('should emit resource pressure events under memory pressure', async () => {
      const pressureHandler = jest.fn();
      resourceManager.on('resourcePressure', pressureHandler);

      // Mock high memory pressure
      jest.spyOn(resourceManager as any, 'getCurrentResources').mockResolvedValue(
        createTestSystemResources({
          memory: 900,
          totalMemory: 1000,
          memoryPressure: 0.9
        })
      );

      const message = createTestMessage('large message '.repeat(100));
      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      
      expect(pressureHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'resourcePressure',
        data: expect.objectContaining({
          pressure: expect.any(Number),
          threshold: expect.any(Number)
        })
      }));
    });
  });

  describe('Compression Effectiveness', () => {
    it('should reduce memory usage after optimization', async () => {
      const message = createTestMessage('test message '.repeat(50));

      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      const beforeResources = await resourceManager.getCurrentResources();
      
      await resourceManager.optimizeResources();
      const afterResources = await resourceManager.getCurrentResources();
      
      expect(afterResources.memory).toBeLessThan(beforeResources.memory || 0);
    });

    it('should emit optimization events with metrics', async () => {
      const optimizationHandler = jest.fn();
      resourceManager.on('memory_optimized', optimizationHandler);

      await resourceManager.optimizeResources();
      
      expect(optimizationHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'memory_optimized',
        data: expect.objectContaining({
          bytesFreed: expect.any(Number)
        })
      }));
    });

    it('should handle multiple messages efficiently', async () => {
      const messages = Array(5).fill(null).map((_, i) => 
        createTestMessage(`test message ${i} `.repeat(10))
      );

      for (const message of messages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      }

      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages).toHaveLength(messages.length);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve message content after optimization', async () => {
      const message = createTestMessage('important test message');

      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      await resourceManager.optimizeResources();
      
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages[0].content).toBe(message.content);
    });

    it('should maintain message order during optimization', async () => {
      const messages = Array(3).fill(null).map((_, i) => 
        createTestMessage(`message ${i}`)
      );

      for (const message of messages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      }

      await resourceManager.optimizeResources();
      
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages.map(m => m.content)).toEqual(
        messages.map(m => m.content)
      );
    });

    it('should preserve message metadata through optimization', async () => {
      const message = createTestMessage('test message');

      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      await resourceManager.optimizeResources();
      
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages[0].role).toBe(message.role);
      expect(context?.messages[0].timestamp).toBe(message.timestamp);
    });
  });

  describe('Performance Impact', () => {
    it('should optimize resources within acceptable time', async () => {
      const message = createTestMessage('test message '.repeat(100));

      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      
      const startTime = Date.now();
      await resourceManager.optimizeResources();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // 1 second threshold
    });

    it('should handle concurrent message additions', async () => {
      const messages = Array(10).fill(null).map((_, i) => 
        createTestMessage(`concurrent message ${i}`)
      );

      await Promise.all(messages.map(msg => 
        resourceManager.addMessage(TEST_CONTEXT_ID, msg)
      ));

      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages).toHaveLength(messages.length);
    });

    it('should maintain responsiveness during optimization', async () => {
      const message = createTestMessage('test message');

      const startTime = Date.now();
      
      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      await resourceManager.optimizeResources();
      await resourceManager.getContext(TEST_CONTEXT_ID);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2 second threshold
    });
  });

  describe('Context Recovery', () => {
    it('should handle context retrieval after optimization', async () => {
      const message = createTestMessage('test message for recovery');

      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      await resourceManager.optimizeResources();
      
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context).toBeDefined();
      expect(context?.messages[0].content).toBe(message.content);
    });

    it('should maintain context integrity under memory pressure', async () => {
      const messages = Array(5).fill(null).map((_, i) => 
        createTestMessage(`context message ${i}`)
      );

      for (const message of messages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      }

      await resourceManager.optimizeResources();
      
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages).toHaveLength(messages.length);
      expect(context?.messages.map(m => m.content)).toEqual(
        messages.map(m => m.content)
      );
    });

    it('should recover context after multiple optimization cycles', async () => {
      const messages = Array(3).fill(null).map((_, i) => 
        createTestMessage(`cycle message ${i}`)
      );

      for (const message of messages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
        await resourceManager.optimizeResources();
      }

      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages).toHaveLength(messages.length);
      expect(context?.messages[0].content).toBe(messages[0].content);
    });
  });
});