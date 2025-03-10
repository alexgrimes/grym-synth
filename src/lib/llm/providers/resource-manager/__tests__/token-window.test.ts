import { ContextManager } from '../context-manager';
import { createMockMessage } from '../test-helpers';
import { ResourceError } from '../types';

describe('Token Window', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  afterEach(async () => {
    await contextManager.cleanup();
    jest.restoreAllMocks();
  });

  it('should enforce window size', async () => {
    const message = createMockMessage('user', 'A'.repeat(1000)); // Large message
    await contextManager.initializeContext('test', {
      maxTokens: 100,
      contextWindow: 100, // Small window
      responseTokens: 50
    });

    await expect(async () => {
      await contextManager.addMessage('test', message);
    }).rejects.toThrow('Token limit exceeded');
  });

  it('should optimize near window limit', async () => {
    const message1 = createMockMessage('user', 'A'.repeat(100));
    const message2 = createMockMessage('assistant', 'B'.repeat(100));
    
    await contextManager.initializeContext('test', {
      maxTokens: 200,
      contextWindow: 100,
      responseTokens: 50
    });

    await contextManager.addMessage('test', message1);
    await contextManager.addMessage('test', message2);

    const context = await contextManager.getContext('test');
    expect(context?.messages.length).toBeLessThan(2);
  });

  it('should maintain window after optimization', async () => {
    const message = createMockMessage('user', 'A'.repeat(200));
    await contextManager.initializeContext('test', {
      maxTokens: 300,
      contextWindow: 100,
      responseTokens: 50
    });

    await expect(async () => {
      await contextManager.addMessage('test', message);
    }).rejects.toThrow('Token limit exceeded');
  });

  it('should validate context window', async () => {
    await expect(async () => {
      await contextManager.initializeContext('test', {
        maxTokens: 100,
        contextWindow: -1, // Invalid window size
        responseTokens: 50
      });
    }).rejects.toThrow('Context window must be greater than 0');
  });
});