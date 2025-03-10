import { 
  ResourceError
} from '../types';
import { 
  testModelConstraints,
  createTestMessage
} from '../test/test-helpers';
import { ContextManager } from '../context-manager';

describe('Lifecycle Management', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  describe('Context Lifecycle', () => {
    it('should handle complete context lifecycle', async () => {
      // Initialize context
      await contextManager.initializeContext('test-model', testModelConstraints);
      expect(await contextManager.getContext('test-model')).toBeDefined();

      // Add messages
      const messages = [
        createTestMessage('First message'),
        createTestMessage('Response message')
      ];

      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      const context = await contextManager.getContext('test-model');
      expect(context?.messages).toHaveLength(messages.length);

      // Remove context
      await contextManager.removeContext('test-model');
      expect(await contextManager.getContext('test-model')).toBeUndefined();
    });

    it('should handle multiple context lifecycles concurrently', async () => {
      const modelIds = ['model-1', 'model-2', 'model-3'];
      
      // Initialize contexts
      for (const modelId of modelIds) {
        await contextManager.initializeContext(modelId, testModelConstraints);
      }

      // Add messages to all contexts
      for (const modelId of modelIds) {
        await contextManager.addMessage(modelId, createTestMessage(`Message for ${modelId}`));
      }

      // Verify all contexts
      for (const modelId of modelIds) {
        const context = await contextManager.getContext(modelId);
        expect(context).toBeDefined();
        expect(context?.messages).toHaveLength(1);
      }

      // Remove contexts
      for (const modelId of modelIds) {
        await contextManager.removeContext(modelId);
      }

      // Verify removal
      for (const modelId of modelIds) {
        expect(await contextManager.getContext(modelId)).toBeUndefined();
      }
    });
  });

  describe('Event Handling', () => {
    it('should handle cleanup of event listeners', async () => {
      const eventHandler = jest.fn();
      contextManager.on('error', eventHandler);
      
      // Remove listener
      contextManager.removeAllListeners('error');
      
      // Verify event is not triggered
      await expect(
        contextManager.addMessage('non-existent-model', createTestMessage('test'))
      ).rejects.toThrow(ResourceError);
      
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources when removing context', async () => {
      await contextManager.initializeContext('test-model', testModelConstraints);
      
      // Add some messages
      for (let i = 0; i < 10; i++) {
        await contextManager.addMessage('test-model', createTestMessage(`Message ${i}`));
      }

      // Remove context
      await contextManager.removeContext('test-model');

      // Verify complete cleanup
      expect(await contextManager.getContext('test-model')).toBeUndefined();
    });

    it('should handle cleanup of multiple contexts', async () => {
      const modelIds = ['model-1', 'model-2'];
      
      // Initialize and use contexts
      for (const modelId of modelIds) {
        await contextManager.initializeContext(modelId, testModelConstraints);
        await contextManager.addMessage(modelId, createTestMessage('Test message'));
      }

      // Remove all contexts
      for (const modelId of modelIds) {
        await contextManager.removeContext(modelId);
      }

      // Verify all contexts are cleaned up
      for (const modelId of modelIds) {
        expect(await contextManager.getContext(modelId)).toBeUndefined();
      }
    });
  });

  describe('Error Recovery', () => {
    it('should maintain system stability after error conditions', async () => {
      // Create initial context
      await contextManager.initializeContext('test-model', testModelConstraints);

      // Simulate error condition
      await expect(
        contextManager.addMessage('non-existent-model', createTestMessage('Test message'))
      ).rejects.toThrow(new ResourceError('CONTEXT_NOT_FOUND', 'Context not found for model: non-existent-model'));

      // Verify system remains stable
      const context = await contextManager.getContext('test-model');
      expect(context).toBeDefined();

      // Continue normal operations
      await contextManager.addMessage('test-model', createTestMessage('Valid message'));
      expect(context?.messages).toHaveLength(1);
    });

    it('should recover from invalid operations', async () => {
      // Attempt invalid operations
      await expect(
        contextManager.initializeContext('test-model', {
          ...testModelConstraints,
          contextWindow: -1
        })
      ).rejects.toThrow(new ResourceError('INVALID_CONSTRAINTS', 'Context window must be greater than 0'));

      // System should allow valid operations after error
      await contextManager.initializeContext('test-model', testModelConstraints);
      const context = await contextManager.getContext('test-model');
      expect(context).toBeDefined();
    });
  });
});