import { ResourceError } from '../types';
import { testModelConstraints, createTestMessage } from '../test/test-helpers';
import { ContextManager } from '../context-manager';

describe('Message Validation', () => {
  let contextManager: ContextManager;

  beforeEach(async () => {
    contextManager = new ContextManager();
    await contextManager.initializeContext('test', testModelConstraints);
  });

  afterEach(() => {
    contextManager.cleanup();
    jest.restoreAllMocks();
  });

  describe('Content Validation', () => {
    it('should reject empty messages', async () => {
      const emptyMessage = createTestMessage('');
      
      await expect(
        contextManager.addMessage('test', emptyMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });

    it('should reject whitespace-only messages', async () => {
      const whitespaceMessage = createTestMessage('   ');
      
      await expect(
        contextManager.addMessage('test', whitespaceMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });

    it('should reject undefined content', async () => {
      const invalidMessage = createTestMessage(undefined as any);
      
      await expect(
        contextManager.addMessage('test', invalidMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });

    it('should reject null content', async () => {
      const invalidMessage = createTestMessage(null as any);
      
      await expect(
        contextManager.addMessage('test', invalidMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty'));
    });
  });

  describe('Type Validation', () => {
    it('should reject non-string content', async () => {
      const numberMessage = createTestMessage(123 as any);
      
      await expect(
        contextManager.addMessage('test', numberMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content must be a string'));
    });

    it('should reject object content', async () => {
      const objectMessage = createTestMessage({ text: 'test' } as any);
      
      await expect(
        contextManager.addMessage('test', objectMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content must be a string'));
    });

    it('should reject array content', async () => {
      const arrayMessage = createTestMessage(['test'] as any);
      
      await expect(
        contextManager.addMessage('test', arrayMessage)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message content must be a string'));
    });
  });

  describe('Role Validation', () => {
    it('should reject missing role', async () => {
      const message = createTestMessage('test');
      delete (message as any).role;
      
      await expect(
        contextManager.addMessage('test', message)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Message role is required'));
    });

    it('should reject invalid role', async () => {
      const message = createTestMessage('test');
      (message as any).role = 'invalid';
      
      await expect(
        contextManager.addMessage('test', message)
      ).rejects.toThrow(new ResourceError('INVALID_MESSAGE', 'Invalid message role: invalid'));
    });

    it('should accept valid roles', async () => {
      const validRoles = ['user', 'assistant', 'system'];
      
      for (const role of validRoles) {
        const message = createTestMessage('test');
        message.role = role as any;
        
        await expect(
          contextManager.addMessage('test', message)
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Message Size', () => {
    it('should reject messages exceeding max size', async () => {
      const largeContent = 'x'.repeat(testModelConstraints.maxTokens + 1);
      const largeMessage = createTestMessage(largeContent);
      
      await expect(
        contextManager.addMessage('test', largeMessage)
      ).rejects.toThrow(new ResourceError('MESSAGE_TOO_LARGE', 'Message exceeds maximum allowed size'));
    });

    it('should accept messages within size limit', async () => {
      const validContent = 'x'.repeat(testModelConstraints.maxTokens - 1);
      const validMessage = createTestMessage(validContent);
      
      await expect(
        contextManager.addMessage('test', validMessage)
      ).resolves.not.toThrow();
    });
  });
});