import { ContextManager } from '../context-manager';
import { mockConfig } from './test-config';
import { 
  ModelContextState, 
  Message,
  ModelConstraints
} from '../types';

describe('Context Manager', () => {
  let contextManager: ContextManager;

  const mockContextState: ModelContextState = {
    modelId: 'test-model',
    messages: [],
    tokens: 0,
    lastUpdated: Date.now(),
    contextWindow: 4096
  };

  const mockConstraints: ModelConstraints = {
    maxTokens: 4096,
    contextWindow: 8192,
    responseTokens: 1024
  };

  beforeEach(() => {
    contextManager = new ContextManager(mockConfig.contextPreservation);
  });

  describe('Context Initialization', () => {
    it('should initialize context correctly', () => {
      contextManager.initializeContext('test-model', mockConstraints);
      const context = contextManager.getContext('test-model');

      expect(context).toBeDefined();
      expect(context?.messages).toHaveLength(0);
      expect(context?.tokens).toBe(0);
    });

    it('should throw error for duplicate initialization', () => {
      contextManager.initializeContext('test-model', mockConstraints);
      expect(() => {
        contextManager.initializeContext('test-model', mockConstraints);
      }).toThrow('Context already exists');
    });
  });

  describe('Message Management', () => {
    beforeEach(() => {
      contextManager.initializeContext('test-model', mockConstraints);
    });

    it('should add messages correctly', async () => {
      const message: Message = {
        role: 'user',
        content: 'Test message',
        timestamp: Date.now()
      };

      await contextManager.addMessage('test-model', message);
      const context = contextManager.getContext('test-model');

      expect(context?.messages).toHaveLength(1);
      expect(context?.messages[0]).toEqual(message);
    });

    it('should track token count', async () => {
      const message: Message = {
        role: 'user',
        content: 'Test message with multiple tokens',
        timestamp: Date.now()
      };

      await contextManager.addMessage('test-model', message);
      const context = contextManager.getContext('test-model');

      expect(context?.tokens).toBeGreaterThan(0);
    });
  });

  describe('Context Preservation', () => {
    beforeEach(() => {
      contextManager.initializeContext('test-model', mockConstraints);
    });

    it('should preserve context correctly', async () => {
      const message: Message = {
        role: 'user',
        content: 'Test message',
        timestamp: Date.now()
      };

      await contextManager.addMessage('test-model', message);
      await contextManager.preserveContext('test-model');

      const context = contextManager.getContext('test-model');
      expect(context?.messages).toContainEqual(message);
    });

    it('should handle context summarization', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now()
      }));

      for (const message of messages) {
        await contextManager.addMessage('test-model', message);
      }

      await contextManager.preserveContext('test-model');
      const context = contextManager.getContext('test-model');

      expect(context?.messages.length).toBeLessThanOrEqual(
        mockConfig.contextPreservation.summarizationConfig?.preserveRecentMessages || 5
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing context', async () => {
      const message: Message = {
        role: 'user',
        content: 'Test message',
        timestamp: Date.now()
      };

      await expect(
        contextManager.addMessage('non-existent-model', message)
      ).rejects.toThrow('Context not found');
    });

    it('should handle invalid context operations', () => {
      expect(() => {
        contextManager.getContext('non-existent-model');
      }).not.toThrow();

      expect(contextManager.getContext('non-existent-model')).toBeUndefined();
    });
  });
});