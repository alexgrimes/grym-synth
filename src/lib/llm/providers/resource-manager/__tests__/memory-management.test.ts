import { 
  ResourceError
} from '../types';
import { 
  testModelConstraints,
  createTestMessage
} from '../test/test-helpers';
import { ContextManager } from '../context-manager';

describe('Memory Management', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  describe('Memory Compression', () => {
    it('should compress context when threshold is exceeded', async () => {
      await contextManager.initializeContext('test-model', {
        ...testModelConstraints,
        contextWindow: 200 // Small window to trigger compression
      });

      // Add messages to create memory pressure
      const messages = Array(20).fill(null).map((_, i) =>
        createTestMessage(`Message ${i} with sufficient length to trigger compression`)
      );

      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      const context = await contextManager.getContext('test-model');
      expect(context?.tokens).toBeLessThanOrEqual(200);
      expect(context?.messages.length).toBeLessThan(messages.length);
    });

    it('should handle multiple compression strategies', async () => {
      await contextManager.initializeContext('test-model', testModelConstraints);

      // Add messages to create memory pressure
      const messages = Array(10).fill(null).map((_, i) =>
        createTestMessage(`Message ${i} with content that needs compression`)
      );

      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      const context = await contextManager.getContext('test-model');
      expect(context?.tokens).toBeLessThanOrEqual(testModelConstraints.contextWindow);
      expect(context?.messages.length).toBeLessThan(messages.length);
    });

    it('should optimize working memory under pressure', async () => {
      await contextManager.initializeContext('test-model', {
        ...testModelConstraints,
        contextWindow: 150 // Small window to force optimization
      });

      // Add messages to create working memory pressure
      const messages = Array(15).fill(null).map((_, i) =>
        createTestMessage(`Working memory test message ${i}`)
      );

      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      const context = await contextManager.getContext('test-model');
      expect(context?.tokens).toBeLessThanOrEqual(150);
    });
  });

  describe('Memory Pressure Handling', () => {
    it('should optimize context when memory pressure is high', async () => {
      await contextManager.initializeContext('test-model', {
        ...testModelConstraints,
        contextWindow: 200 // Small window to trigger optimization
      });

      // Add messages to create memory pressure
      const messages = Array(20).fill(null).map((_, i) => 
        createTestMessage(`Test message ${i} with sufficient length to consume memory`)
      );

      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      const context = await contextManager.getContext('test-model');
      expect(context?.tokens).toBeLessThanOrEqual(200);
      expect(context?.messages.length).toBeLessThan(messages.length);
    });

    it('should preserve recent messages during optimization', async () => {
      await contextManager.initializeContext('test-model', {
        ...testModelConstraints,
        contextWindow: 150
      });

      const messages = Array(10).fill(null).map((_, i) => 
        createTestMessage(`Message ${i}`)
      );

      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      const context = await contextManager.getContext('test-model');
      const lastMessage = messages[messages.length - 1];
      
      expect(context?.messages.length).toBeGreaterThan(0);
      expect(context?.messages[context.messages.length - 1].content)
        .toBe(lastMessage.content);
    });
  });

  describe('Context Optimization', () => {
    it('should handle multiple contexts under memory pressure', async () => {
      // Initialize multiple contexts
      const modelIds = ['model-1', 'model-2', 'model-3'];
      for (const modelId of modelIds) {
        await contextManager.initializeContext(modelId, {
          ...testModelConstraints,
          contextWindow: 100 // Small window
        });
      }

      // Add messages to all contexts
      for (const modelId of modelIds) {
        for (let i = 0; i < 10; i++) {
          await contextManager.addMessage(modelId, createTestMessage(`Message ${i} for ${modelId}`));
        }
      }

      // Verify all contexts are optimized
      for (const modelId of modelIds) {
        const context = await contextManager.getContext(modelId);
        expect(context?.tokens).toBeLessThanOrEqual(100);
      }
    });

    it('should maintain context coherence after optimization', async () => {
      await contextManager.initializeContext('test-model', {
        ...testModelConstraints,
        contextWindow: 150
      });

      // Add a sequence of related messages
      const conversation = [
        'Hello, how are you?',
        'I am doing well, thank you.',
        'Can you help me with a task?',
        'Of course, what do you need help with?',
        'I need help with testing.',
        'What kind of testing do you need help with?',
        'Unit testing in TypeScript.',
        'I can help you with that.',
        'Great, let\'s get started.',
        'First, let\'s set up Jest.'
      ];

      for (const content of conversation) {
        await contextManager.addMessage('test-model', createTestMessage(content));
      }

      const context = await contextManager.getContext('test-model');
      
      // Verify the most recent messages are preserved
      const preservedMessages = context?.messages.map(m => m.content);
      const lastMessage = conversation[conversation.length - 1];
      
      expect(preservedMessages).toContain(lastMessage);
      expect(context?.messages.length).toBeGreaterThan(0);
      expect(context?.tokens).toBeLessThanOrEqual(150);
    });
  });

  describe('Disk Cache Operations', () => {
    it('should move data to disk cache under memory pressure', async () => {
      // Initialize multiple contexts
      const modelIds = ['test-model-1', 'test-model-2', 'test-model-3'];
      for (const modelId of modelIds) {
        await contextManager.initializeContext(modelId, testModelConstraints);
      }

      // Add messages to create memory pressure
      for (const modelId of modelIds) {
        await contextManager.addMessage(modelId, createTestMessage('Test message with sufficient length'));
      }

      // Add another context to trigger caching
      await contextManager.initializeContext('test-model-4', testModelConstraints);
      await contextManager.addMessage('test-model-4', createTestMessage('Trigger caching'));

      // Verify contexts are still accessible
      for (const modelId of [...modelIds, 'test-model-4']) {
        const context = await contextManager.getContext(modelId);
        expect(context).toBeDefined();
        expect(context?.messages.length).toBeGreaterThan(0);
      }
    });

    it('should handle cache restoration', async () => {
      const modelId = 'test-model';
      await contextManager.initializeContext(modelId, testModelConstraints);
      await contextManager.addMessage(modelId, createTestMessage('Initial message'));

      // Force context to disk
      await contextManager.initializeContext('pressure-model', testModelConstraints);
      await contextManager.addMessage('pressure-model', createTestMessage('Create memory pressure'));

      // Try to access the original context
      const context = await contextManager.getContext(modelId);
      expect(context).toBeDefined();
      expect(context?.messages.length).toBe(1);
      expect(context?.messages[0].content).toBe('Initial message');
    });

    it('should handle cache corruption gracefully', async () => {
      const modelId = 'test-model';
      await contextManager.initializeContext(modelId, testModelConstraints);
      await contextManager.addMessage(modelId, createTestMessage('Test message'));

      // Force context to disk
      await contextManager.initializeContext('pressure-model', testModelConstraints);
      await contextManager.addMessage('pressure-model', createTestMessage('Create memory pressure'));

      // Mock cache corruption
      jest.spyOn(contextManager as any, 'loadFromDisk')
        .mockRejectedValue(new Error('Cache corrupted'));

      // Should handle gracefully and reinitialize
      const context = await contextManager.getContext(modelId);
      expect(context).toBeDefined();
      expect(context?.messages.length).toBe(0); // Fresh context
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources when removing context', async () => {
      await contextManager.initializeContext('test-model', testModelConstraints);
      await contextManager.addMessage('test-model', createTestMessage('Test message'));
      await contextManager.removeContext('test-model');
      expect(await contextManager.getContext('test-model')).toBeUndefined();
    });

    it('should throw error with proper code when removing non-existent context', async () => {
      await expect(
        contextManager.removeContext('non-existent-model')
      ).rejects.toThrow(new ResourceError('CONTEXT_NOT_FOUND', 'Cannot remove non-existent context: non-existent-model'));
    });
  });
});