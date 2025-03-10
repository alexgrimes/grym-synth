import { ResourceManager } from '../resource-manager';
import { ResourceError } from '../types';
import { 
  createTestMessage, 
  createTestModelConstraints,
  createTestSystemResources,
  DEFAULT_MODEL_CONSTRAINTS,
  sleep
} from '../test/test-helpers';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Disk Cache', () => {
  let resourceManager: ResourceManager;
  const TEST_CONTEXT_ID = 'test-context';
  const CACHE_DIR = './test-cache';

  beforeEach(async () => {
    // Create cache directory if it doesn't exist
    await fs.mkdir(CACHE_DIR, { recursive: true });

    resourceManager = new ResourceManager({
      maxMemoryUsage: 1000,
      maxCpuUsage: 80,
      cacheDir: CACHE_DIR,
      maxCacheSize: 1024 * 1024 * 100, // 100MB
      cacheEvictionPolicy: 'lru',
      cleanupInterval: 1000
    });
    await resourceManager.initializeContext(TEST_CONTEXT_ID, DEFAULT_MODEL_CONSTRAINTS);
  });

  afterEach(async () => {
    await resourceManager.cleanup();
    // Clean up test cache directory
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('Cache Operations', () => {
    it('should write context to disk cache', async () => {
      const message = createTestMessage('test message');
      await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      
      // Verify context exists in memory
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context).toBeDefined();
      expect(context?.messages[0].content).toBe(message.content);
      
      // Verify files were created
      const cacheFiles = await fs.readdir(CACHE_DIR);
      expect(cacheFiles.length).toBeGreaterThan(0);
    });

    it('should read context from disk cache', async () => {
      const message = createTestMessage('test message');
      await resourceManager.addMessage(TEST_CONTEXT_ID, message);

      // Clear memory and verify reload
      await resourceManager.cleanup();
      await resourceManager.initializeContext(TEST_CONTEXT_ID, DEFAULT_MODEL_CONSTRAINTS);
      
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context).toBeDefined();
      expect(context?.messages[0].content).toBe(message.content);
    });

    it('should handle cache miss gracefully', async () => {
      const nonExistentId = 'non-existent-context';
      const context = await resourceManager.getContext(nonExistentId);
      expect(context).toBeNull();
    });

    it('should maintain context metadata', async () => {
      const message = createTestMessage('test message');
      await resourceManager.addMessage(TEST_CONTEXT_ID, message);

      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.metadata).toBeDefined();
      expect(context?.metadata.lastAccess).toBeDefined();
      expect(context?.metadata.createdAt).toBeDefined();
      expect(context?.metadata.lastUpdated).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should respect memory limits', async () => {
      const smallCacheManager = new ResourceManager({
        maxMemoryUsage: 100, // Small memory limit
        cacheDir: CACHE_DIR,
        maxCacheSize: 1024, // 1KB
        cacheEvictionPolicy: 'lru'
      });

      // Add messages until memory limit is exceeded
      const messages = Array(10).fill(null).map((_, i) => 
        createTestMessage(`test message ${i} `.repeat(50))
      );

      await expect(async () => {
        for (const message of messages) {
          await smallCacheManager.addMessage(TEST_CONTEXT_ID, message);
        }
      }).rejects.toThrow(ResourceError);
    });

    it('should optimize resources under memory pressure', async () => {
      const messages = Array(5).fill(null).map((_, i) => 
        createTestMessage(`test message ${i} `.repeat(100))
      );

      for (const message of messages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      }

      const optimizeSpy = jest.spyOn(resourceManager, 'optimizeResources');
      await resourceManager.addMessage(TEST_CONTEXT_ID, createTestMessage('trigger optimization'));
      
      expect(optimizeSpy).toHaveBeenCalled();
    });

    it('should emit events during optimization', async () => {
      const eventHandler = jest.fn();
      resourceManager.on('memory_optimized', eventHandler);

      const messages = Array(5).fill(null).map((_, i) => 
        createTestMessage(`test message ${i} `.repeat(100))
      );

      for (const message of messages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      }

      await resourceManager.optimizeResources();
      expect(eventHandler).toHaveBeenCalled();
    });

    it('should handle concurrent operations', async () => {
      const operations = Array(5).fill(null).map((_, i) => 
        resourceManager.addMessage(TEST_CONTEXT_ID, createTestMessage(`concurrent message ${i}`))
      );

      await Promise.all(operations);

      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages.length).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const invalidManager = new ResourceManager({
        maxMemoryUsage: -1, // Invalid config
        cacheDir: CACHE_DIR
      });

      await expect(
        invalidManager.initializeContext('test', DEFAULT_MODEL_CONSTRAINTS)
      ).rejects.toThrow();
    });

    it('should handle resource exhaustion', async () => {
      const message = createTestMessage('test message '.repeat(1000));
      const exhaustionHandler = jest.fn();
      resourceManager.on('resourceExhausted', exhaustionHandler);

      await expect(
        resourceManager.addMessage(TEST_CONTEXT_ID, message)
      ).rejects.toThrow(ResourceError);
      
      expect(exhaustionHandler).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockFs = jest.spyOn(fs, 'rm').mockRejectedValueOnce(new Error('Cleanup error'));
      
      await expect(resourceManager.cleanup()).resolves.not.toThrow();
      mockFs.mockRestore();
    });

    it('should maintain consistency during errors', async () => {
      const message = createTestMessage('test message');
      await resourceManager.addMessage(TEST_CONTEXT_ID, message);

      // Simulate error during operation
      const mockFs = jest.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Write error'));
      
      await expect(
        resourceManager.addMessage(TEST_CONTEXT_ID, createTestMessage('error message'))
      ).resolves.not.toThrow();

      // Verify original message still exists
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages[0].content).toBe(message.content);

      mockFs.mockRestore();
    });
  });

  describe('Integration', () => {
    it('should work with memory optimization', async () => {
      // Fill memory to trigger optimization
      const largeMessages = Array(5).fill(null).map((_, i) => 
        createTestMessage(`large message ${i} `.repeat(100))
      );

      for (const message of largeMessages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      }

      // Force optimization
      await resourceManager.optimizeResources();
      
      // Verify context integrity
      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages).toHaveLength(largeMessages.length);
    });

    it('should handle resource pressure events', async () => {
      const pressureHandler = jest.fn();
      resourceManager.on('resourcePressure', pressureHandler);

      // Add messages until pressure threshold
      const messages = Array(10).fill(null).map((_, i) => 
        createTestMessage(`pressure message ${i} `.repeat(50))
      );

      for (const message of messages) {
        await resourceManager.addMessage(TEST_CONTEXT_ID, message);
      }

      expect(pressureHandler).toHaveBeenCalled();
    });

    it('should maintain context integrity', async () => {
      const message = createTestMessage('test message');
      await resourceManager.addMessage(TEST_CONTEXT_ID, message);

      // Simulate multiple operations
      await resourceManager.optimizeResources();
      await resourceManager.cleanup();
      await resourceManager.initializeContext(TEST_CONTEXT_ID, DEFAULT_MODEL_CONSTRAINTS);

      const context = await resourceManager.getContext(TEST_CONTEXT_ID);
      expect(context?.messages[0].content).toBe(message.content);
    });
  });
});