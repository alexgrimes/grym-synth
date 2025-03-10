import { ContextManager } from '../context-manager';
import { ResourceError } from '../types';
import { createTestMessage, testModelConstraints } from '../test/test-helpers';

describe('Context Cleanup', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  afterEach(async () => {
    await contextManager.cleanup().catch(() => {
      // Ignore cleanup errors in afterEach
    });
    jest.restoreAllMocks();
  });

  describe('Basic Cleanup', () => {
    it('should remove context when cleanup is called', async () => {
      // Initialize context
      await contextManager.initializeContext('test', testModelConstraints);
      await contextManager.addMessage('test', createTestMessage('test'));
      
      // Cleanup
      await contextManager.cleanup('test');
      
      // Verify cleanup
      const context = await contextManager.getContext('test');
      expect(context).toBeUndefined();
    });

    it('should cleanup all contexts when no id is provided', async () => {
      // Initialize multiple contexts
      await contextManager.initializeContext('test1', testModelConstraints);
      await contextManager.initializeContext('test2', testModelConstraints);
      
      // Cleanup all
      await contextManager.cleanup();
      
      // Verify all cleaned
      expect(await contextManager.getContext('test1')).toBeUndefined();
      expect(await contextManager.getContext('test2')).toBeUndefined();
    });

    it('should throw error when cleaning up non-existent context', async () => {
      await expect(contextManager.cleanup('nonexistent'))
        .rejects
        .toThrow(new ResourceError('CLEANUP_FAILED', 'Failed to clean up resources'));
    });
  });

  describe('Error Handling', () => {
    it('should cleanup context after error', async () => {
      // Initialize context
      await contextManager.initializeContext('test', testModelConstraints);

      // Mock calculateTokenCount to throw error
      jest.spyOn(contextManager as any, 'calculateTokenCount')
        .mockImplementation(() => {
          throw new ResourceError('RESOURCE_EXHAUSTED', 'Token limit exceeded');
        });

      // Attempt to add message which should trigger error
      await expect(
        contextManager.addMessage('test', createTestMessage('test'))
      ).rejects.toThrow(new ResourceError('RESOURCE_EXHAUSTED', 'Token limit exceeded'));

      // Verify context was cleaned up
      const context = await contextManager.getContext('test');
      expect(context).toBeUndefined();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Initialize context
      await contextManager.initializeContext('test', testModelConstraints);

      // Setup error handler
      const errorHandler = jest.fn();
      contextManager.on('error', errorHandler);

      // Mock emit to throw error during cleanup
      jest.spyOn(contextManager, 'emit')
        .mockImplementationOnce(() => { throw new Error('Cleanup error'); });

      // Attempt cleanup
      await expect(contextManager.cleanup('test'))
        .rejects
        .toThrow(new ResourceError('CLEANUP_FAILED', 'Failed to clean up resources'));

      expect(errorHandler).toHaveBeenCalledWith({
        type: 'error',
        error: expect.any(ResourceError),
        details: expect.any(Object)
      });
    });
  });

  describe('Resource Management', () => {
    it('should release memory after cleanup', async () => {
      const memoryBefore = process.memoryUsage().heapUsed;
      
      // Create large context
      await contextManager.initializeContext('test', {
        ...testModelConstraints,
        contextWindow: 4000,
        maxTokens: 1000
      });

      // Mock calculateTokenCount to return small value to avoid token limit
      jest.spyOn(contextManager as any, 'calculateTokenCount')
        .mockReturnValue(10);

      for (let i = 0; i < 100; i++) {
        await contextManager.addMessage('test', createTestMessage('test'.repeat(100)));
      }
      
      // Cleanup
      await contextManager.cleanup('test');
      
      // Force garbage collection if possible
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfter = process.memoryUsage().heapUsed;
      expect(memoryAfter).toBeLessThan(memoryBefore * 1.1); // Allow 10% overhead
    });

    it('should emit cleanup events', async () => {
      const eventSpy = jest.spyOn(contextManager, 'emit');
      
      await contextManager.initializeContext('test', testModelConstraints);
      await contextManager.cleanup('test');

      expect(eventSpy).toHaveBeenCalledWith('contextCleanup', {
        type: 'contextCleanup',
        modelId: 'test',
        reason: 'explicit_cleanup',
        timestamp: expect.any(Number),
        contextDetails: expect.any(Object)
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent cleanup requests', async () => {
      await contextManager.initializeContext('test', testModelConstraints);
      
      // Trigger multiple concurrent cleanups
      await Promise.all([
        contextManager.cleanup('test'),
        contextManager.cleanup('test'),
        contextManager.cleanup('test')
      ].map(p => p.catch(() => {
        // Ignore errors from concurrent cleanups
      })));

      const context = await contextManager.getContext('test');
      expect(context).toBeUndefined();
    });

    it('should prevent operations on cleaned context', async () => {
      await expect(
        contextManager.addMessage('test', createTestMessage('test'))
      ).rejects.toThrow(new ResourceError('CONTEXT_NOT_FOUND', 'Context not found for model: test'));
    });
  });
});