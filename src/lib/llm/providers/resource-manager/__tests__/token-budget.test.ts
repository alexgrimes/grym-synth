import { ContextManager } from '../context-manager';
import { createMockMessage, createMockModelConstraints } from '../test-helpers';
import { ResourceError } from '../types';

describe('Token Budget', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  afterEach(async () => {
    await contextManager.cleanup();
    jest.restoreAllMocks();
  });

  it('should enforce maximum context size', async () => {
    const constraints = createMockModelConstraints();
    constraints.maxTokens = 100;
    constraints.contextWindow = 50;

    await contextManager.initializeContext('test', constraints);
    const message = createMockMessage('user', 'A'.repeat(200));

    await expect(async () => {
      await contextManager.addMessage('test', message);
    }).rejects.toThrow('Token limit exceeded');
  });

  it('should allocate tokens fairly', async () => {
    const constraints = createMockModelConstraints();
    constraints.maxTokens = 200;
    constraints.contextWindow = 100;

    await contextManager.initializeContext('test', constraints);
    const message1 = createMockMessage('user', 'A'.repeat(40));
    const message2 = createMockMessage('assistant', 'B'.repeat(40));

    await contextManager.addMessage('test', message1);
    await contextManager.addMessage('test', message2);

    const context = await contextManager.getContext('test');
    expect(context?.messages.length).toBe(2);
  });

  it('should release tokens on context removal', async () => {
    const constraints = createMockModelConstraints();
    constraints.maxTokens = 100;
    constraints.contextWindow = 50;

    await contextManager.initializeContext('test', constraints);
    const message = createMockMessage('user', 'A'.repeat(40));
    await contextManager.addMessage('test', message);
    await contextManager.removeContext('test');

    // Should be able to create new context after removal
    await expect(async () => {
      await contextManager.initializeContext('test', constraints);
    }).not.toThrow();
  });

  it('should handle multi-operation budgeting', async () => {
    const constraints = createMockModelConstraints();
    constraints.maxTokens = 150;
    constraints.contextWindow = 100;

    await contextManager.initializeContext('test1', constraints);
    await contextManager.initializeContext('test2', constraints);

    const message1 = createMockMessage('user', 'A'.repeat(40));
    const message2 = createMockMessage('assistant', 'B'.repeat(40));

    await contextManager.addMessage('test1', message1);
    await contextManager.addMessage('test2', message2);

    const context1 = await contextManager.getContext('test1');
    const context2 = await contextManager.getContext('test2');

    expect(context1?.messages.length).toBe(1);
    expect(context2?.messages.length).toBe(1);
  });
});