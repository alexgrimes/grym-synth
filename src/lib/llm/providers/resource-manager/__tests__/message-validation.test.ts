import { Message, ResourceError } from '../types';
import { ContextManager } from '../context-manager';

const createValidMessage = (content: string): Message => ({
  content,
  role: 'user',
  timestamp: Date.now()
});

const createInvalidMessage = (override: Partial<Message>): Message => ({
  ...createValidMessage('test'),
  ...override
});

describe('Message Validation', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  afterEach(async () => {
    await contextManager.cleanup();
    jest.restoreAllMocks();
  });

  describe('Message Content Validation', () => {
    it('should reject empty messages', async () => {
      await expect(
        contextManager.addMessage('test', createInvalidMessage({ content: '' }))
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });

    it('should reject undefined messages', async () => {
      await expect(
        contextManager.addMessage('test', undefined as any)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message cannot be null or undefined'));
    });

    it('should reject whitespace-only messages', async () => {
      await expect(
        contextManager.addMessage('test', createInvalidMessage({ content: '   ' }))
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });
  });

  describe('Message Type Validation', () => {
    it('should validate message object structure', async () => {
      await expect(
        contextManager.addMessage('test', { content: 123 } as any)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content must be a string'));
    });

    it('should validate role field', async () => {
      await expect(
        contextManager.addMessage('test', createInvalidMessage({ role: 'user' as any }))
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Invalid message role'));
    });

    it('should accept valid roles', async () => {
      await contextManager.initializeContext('test', {
        contextWindow: 1000,
        maxTokens: 500,
        responseTokens: 100
      });

      const validRoles = ['user', 'assistant', 'system'] as const;
      for (const role of validRoles) {
        const message = createValidMessage('test content');
        message.role = role;
        await expect(
          contextManager.addMessage('test', message)
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Message Size Validation', () => {
    beforeEach(async () => {
      // Initialize context with very small limits to trigger size validation
      await contextManager.initializeContext('test', {
        contextWindow: 10,
        maxTokens: 5,
        responseTokens: 2
      });
    });

    it('should reject messages exceeding size limit', async () => {
      const largeContent = 'x'.repeat(1000); // Will exceed token limit
      let error: Error | undefined;
      
      try {
        await contextManager.addMessage('test', createValidMessage(largeContent));
      } catch (e: any) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ResourceError);
      expect(error instanceof ResourceError && error.code).toBe('RESOURCE_EXHAUSTED');
    });

    it('should accept messages within size limit', async () => {
      const validContent = 'test'; // Small enough to be within limit
      await expect(
        contextManager.addMessage('test', createValidMessage(validContent))
      ).resolves.not.toThrow();
    });
  });
});