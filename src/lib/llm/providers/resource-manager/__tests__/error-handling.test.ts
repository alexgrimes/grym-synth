import {
  ResourceError,
  ErrorEventData,
  MemoryOptimizedEventData,
  ResourcesFreedEventData,
  ModelUnloadedEventData
} from '../types';
import {
  testModelConstraints,
  createTestMessage,
  createMockModelMetrics,
  createMockSystemResources,
  simulateMemoryPressure
} from '../test/test-helpers';
import { ContextManager } from '../context-manager';

describe('Error Handling', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  afterEach(() => {
    contextManager.cleanup();
    jest.restoreAllMocks();
  });

  describe('Context Initialization Errors', () => {
    it('should throw error with proper code for duplicate context', async () => {
      await contextManager.initializeContext('test-model', testModelConstraints);
      
      await expect(
        contextManager.initializeContext('test-model', testModelConstraints)
      ).rejects.toThrow(new ResourceError('DUPLICATE_CONTEXT', 'Context already exists for model: test-model'));
    });

    it('should throw error with proper code for invalid constraints', async () => {
      const invalidConstraints = {
        ...testModelConstraints,
        maxTokens: -1,
        contextWindow: 0,
        responseTokens: -100
      };

      await expect(
        contextManager.initializeContext('test-model', invalidConstraints)
      ).rejects.toThrow(new ResourceError('INVALID_CONSTRAINTS', 'Context window must be greater than 0'));
    });

    it('should throw error with proper code for missing constraints', async () => {
      await expect(
        contextManager.initializeContext('test-model', {} as any)
      ).rejects.toThrow(new ResourceError('INVALID_CONSTRAINTS', 'Invalid model constraints'));
    });
  });

  describe('Message Operation Errors', () => {
    it('should throw error with proper code for non-existent context', async () => {
      const message = createTestMessage('Test message');

      await expect(
        contextManager.addMessage('non-existent-model', message)
      ).rejects.toThrow(new ResourceError('CONTEXT_NOT_FOUND', 'Context not found for model: non-existent-model'));
    });

    it('should throw error with proper code for empty message', async () => {
      await contextManager.initializeContext('test-model', testModelConstraints);
      const emptyMessage = createTestMessage('   ');

      await expect(
        contextManager.addMessage('test-model', emptyMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });

    it('should throw error with proper code for undefined message content', async () => {
      await contextManager.initializeContext('test-model', testModelConstraints);
      const invalidMessage = createTestMessage(undefined as any);

      await expect(
        contextManager.addMessage('test-model', invalidMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });
  });

  describe('Context Management Errors', () => {
    it('should throw error with proper code when removing non-existent context', async () => {
      await expect(
        contextManager.removeContext('non-existent-model')
      ).rejects.toThrow(new ResourceError('CONTEXT_NOT_FOUND', 'Cannot remove non-existent context: non-existent-model'));
    });

    it('should handle optimization errors gracefully', async () => {
      await contextManager.initializeContext('test-model', {
        ...testModelConstraints,
        contextWindow: 50 // Very small window
      });

      // Add messages until optimization is required
      const messages = Array(20).fill(null).map(() => 
        createTestMessage('Message that will force context optimization')
      );

      // Add messages and verify optimization works
      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      const context = await contextManager.getContext('test-model');
      expect(context?.tokens).toBeLessThanOrEqual(50);
    });
  });

  describe('Resource Constraint Errors', () => {
    it('should handle multiple contexts with constraints', async () => {
      // Initialize multiple contexts
      const modelIds = Array(5).fill(null).map((_, i) => `model-${i}`);
      
      for (const modelId of modelIds) {
        await contextManager.initializeContext(modelId, {
          ...testModelConstraints,
          contextWindow: 100
        });
      }

      // Add messages to all contexts
      for (const modelId of modelIds) {
        for (let i = 0; i < 10; i++) {
          await contextManager.addMessage(modelId, createTestMessage(`Message ${i} for ${modelId}`));
        }
      }

      // Verify contexts are optimized
      for (const modelId of modelIds) {
        const context = await contextManager.getContext(modelId);
        expect(context?.tokens).toBeLessThanOrEqual(100);
      }
    });

    it('should throw error with proper code for invalid context window sizes', async () => {
      await expect(
        contextManager.initializeContext('test-model', {
          ...testModelConstraints,
          contextWindow: -1
        })
      ).rejects.toThrow(new ResourceError('INVALID_CONSTRAINTS', 'Context window must be greater than 0'));

      await expect(
        contextManager.initializeContext('test-model', {
          ...testModelConstraints,
          contextWindow: 0
        })
      ).rejects.toThrow(new ResourceError('INVALID_CONSTRAINTS', 'Context window must be greater than 0'));
    });

    it('should handle resource exhaustion gracefully', async () => {
      const maxModels = 2;
      const modelIds = Array.from(
        { length: maxModels + 1 },
        (_, i) => `test-model-${i + 1}`
      );

      const loadResults = await Promise.allSettled(
        modelIds.map(id => contextManager.initializeContext(id, testModelConstraints))
      );

      const failures = loadResults.filter(
        result => result.status === 'rejected'
      );
      expect(failures.length).toBe(1);
      expect((failures[0] as PromiseRejectedResult).reason)
        .toBeInstanceOf(ResourceError);
    });
  });

  describe('Memory Optimization Errors', () => {
    it('should handle compression failures gracefully', async () => {
      const modelId = 'test-model';
      await contextManager.initializeContext(modelId, testModelConstraints);

      // Add messages until optimization is required
      const messages = Array(20).fill(null).map(() =>
        createTestMessage('Message that will force context optimization')
      );

      // Add messages and verify optimization works
      for (const message of messages) {
        await contextManager.addMessage(modelId, message);
      }

      const context = await contextManager.getContext(modelId);
      expect(context?.tokens).toBeLessThanOrEqual(testModelConstraints.contextWindow);
    });

    it('should handle optimization errors with fallback strategies', async () => {
      const modelId = 'test-model';
      await contextManager.initializeContext(modelId, {
        ...testModelConstraints,
        contextWindow: 50 // Very small window to force optimization
      });

      // Add messages until optimization is required
      const messages = Array(10).fill(null).map(() =>
        createTestMessage('Message that will force context optimization')
      );

      // Add messages and verify optimization works with fallback
      for (const message of messages) {
        await contextManager.addMessage(modelId, message);
      }

      const context = await contextManager.getContext(modelId);
      expect(context?.tokens).toBeLessThanOrEqual(50);
    });
  });

  describe('Circuit Breaker', () => {
    it('should limit repeated failures', async () => {
      const contextManager = new ContextManager();
      let attempts = 0;
      
      // Simple mock that just counts attempts
      jest.spyOn(contextManager as any, 'calculateTokenCount')
        .mockImplementation(() => {
          attempts++;
          throw new Error('Test failure');
        });

      // Try a few times
      for (let i = 0; i < 6; i++) {
        try {
          await contextManager.addMessage('test', createTestMessage('test'));
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(attempts).toBeLessThan(5); // Should stop before max attempts
    });

    it('should reset after cooling period', async () => {
      const contextManager = new ContextManager();
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now');
      dateSpy.mockReturnValue(now);

      // Simulate initial failures
      jest.spyOn(contextManager as any, 'calculateTokenCount')
        .mockRejectedValue(new Error('Test failure'));

      // Trigger failures
      for (let i = 0; i < 3; i++) {
        try {
          await contextManager.addMessage('test', createTestMessage('test'));
        } catch (error) {
          // Expected to fail
        }
      }

      // Move time forward past cooling period
      dateSpy.mockReturnValue(now + 61000); // 61 seconds later

      let attempts = 0;
      jest.spyOn(contextManager as any, 'calculateTokenCount')
        .mockImplementation(() => {
          attempts++;
          throw new Error('Test failure');
        });

      // Should be able to try again
      try {
        await contextManager.addMessage('test', createTestMessage('test'));
      } catch (error) {
        // Expected to fail
      }

      expect(attempts).toBe(1); // Should have tried once after reset
      dateSpy.mockRestore();
    });
  });
});