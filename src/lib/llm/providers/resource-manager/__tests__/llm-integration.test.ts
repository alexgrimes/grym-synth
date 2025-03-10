import { ProviderResourceManager } from '../provider-resource-manager';
import { createTestMessage, createTestProvider, waitForEvent, simulateResourcePressure } from '../test/test-helpers';
import { ResourceError } from '../types';
import { MockLLMProvider } from '../test/mock-llm-provider';

const testConfig = {
  maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
  maxCpuUsage: 80,
  optimizationThreshold: 0.8,
  cleanupInterval: 1000,
  cacheDir: './test-cache',
  limits: {
    maxModels: 5,
    maxTokensPerModel: 8192,
    maxTotalTokens: 32768
  },
  contextPreservation: {
    enabled: true,
    maxSize: 1024 * 1024, // 1MB
    preservationStrategy: 'hybrid'
  },
  debug: true
};

describe('LLM Integration Tests', () => {
  let resourceManager: ProviderResourceManager;
  let audioProvider: MockLLMProvider;
  let compositionProvider: MockLLMProvider;

  beforeEach(async () => {
    audioProvider = new MockLLMProvider('audio', 'mock://audio', 4096, 'audio-specialist', {
      maxTokens: 1000,
      resourceUsage: {
        memoryUsage: 0,
        cpuUsage: 0,
        tokenCount: 0,
        messageCount: 0
      }
    });
    compositionProvider = new MockLLMProvider('composition', 'mock://composition', 4096, 'composition-specialist', {
      maxTokens: 1000,
      resourceUsage: {
        memoryUsage: 0,
        cpuUsage: 0,
        tokenCount: 0,
        messageCount: 0
      }
    });
    resourceManager = new ProviderResourceManager(testConfig);

    // Initialize providers
    await resourceManager.registerProvider('audio', audioProvider);
    await resourceManager.registerProvider('composition', compositionProvider);
  });

  afterEach(async () => {
    await resourceManager.cleanup();
  });

  describe('Provider Failure Handling', () => {
    it('should handle provider failures gracefully', async () => {
      const errorProvider = new MockLLMProvider('error-prone', 'mock://error', 4096, 'audio-specialist', {
        failOnPurpose: true
      });
      await resourceManager.registerProvider('error', errorProvider);

      const message = createTestMessage('Trigger error');
      await expect(resourceManager.processMessage('error', message))
        .rejects
        .toThrow(ResourceError);

      // Verify provider is marked as ready after error
      const metrics = errorProvider.getResourceMetrics();
      expect(metrics.status).toBe('ready');
    });

    it('should handle token limit exceeded errors', async () => {
      const limitedProvider = new MockLLMProvider('limited', 'mock://limited', 4096, 'audio-specialist', {
        maxTokens: 10
      });
      await resourceManager.registerProvider('limited', limitedProvider);

      const longMessage = createTestMessage('This is a very long message that should exceed the token limit');
      await expect(resourceManager.processMessage('limited', longMessage))
        .rejects
        .toThrow('Token limit exceeded');
    });
  });

  describe('Resource Pressure Events', () => {
    it('should emit resource pressure events when approaching limits', async () => {
      // Create provider with low threshold
      const highMemProvider = createTestProvider('high-mem', {
        specialization: 'audio-specialist',
        resourceUsage: {
          memoryUsage: 0.7,  // Start close to threshold
          cpuUsage: 0.5,
          tokenCount: 100,
          messageCount: 1
        }
      });

      // Register provider and set its resource manager
      await resourceManager.registerProvider('high-memory', highMemProvider);
      highMemProvider.setResourceManager(resourceManager);
      
      // Set up event listener first
      const eventPromise = waitForEvent(resourceManager, 'resourcePressure', 2000);
      
      // Then trigger pressure
      await simulateResourcePressure(highMemProvider);
      
      // Wait for event
      const event = await eventPromise;
      expect(event).toBeDefined();
      expect(event.data.pressure).toBeGreaterThan(0.8);
      expect(event.data.source).toBe('memory');
    });
  });

  describe('Resource Usage Tracking', () => {
    it('should track resource usage across providers', async () => {
      const message = createTestMessage('Test resource monitoring');

      // Process messages on both providers
      await resourceManager.processMessage('audio', message);
      await resourceManager.processMessage('composition', message);

      // Get metrics after processing
      const audioMetrics = audioProvider.getResourceMetrics();
      const compositionMetrics = compositionProvider.getResourceMetrics();

      // Verify resource tracking
      expect(audioMetrics.memoryUsage).toBeGreaterThan(0);
      expect(compositionMetrics.memoryUsage).toBeGreaterThan(0);
      expect(audioMetrics.messageCount).toBe(2); // Original message + response
      expect(compositionMetrics.messageCount).toBe(2);
      expect(audioMetrics.tokenCount).toBeGreaterThan(0);
      expect(compositionMetrics.tokenCount).toBeGreaterThan(0);
    });

    it('should optimize resources under memory pressure', async () => {
      const highMemoryProvider = new MockLLMProvider('high-memory', 'mock://high-mem', 4096, 'audio-specialist', {
        memoryThreshold: 0.8,
        resourceUsage: {
          memoryUsage: testConfig.maxMemoryUsage * 0.9,
          cpuUsage: 0,
          tokenCount: 0,
          messageCount: 0
        }
      });

      await resourceManager.registerProvider('high-memory', highMemoryProvider);
      const message = createTestMessage('Test memory optimization');

      await resourceManager.processMessage('high-memory', message);
      const metrics = highMemoryProvider.getResourceMetrics();
      
      expect(metrics.memoryUsage).toBeLessThan(testConfig.maxMemoryUsage);
    });
  });

  describe('Context Management', () => {
    it('should maintain context when switching between providers', async () => {
      const message = createTestMessage('Analyze this audio sample');
      await resourceManager.processMessage('audio', message);
      await resourceManager.switchProvider('audio', 'composition');

      const compositionState = compositionProvider.getContextState();
      expect(compositionState.messages).toHaveLength(2); // Original message + response
      expect(compositionState.messages[0]).toMatchObject({
        role: message.role,
        content: message.content
      });
    });

    it('should accurately track token counts across provider switches', async () => {
      const messages = [
        createTestMessage('First message'),
        createTestMessage('Second message')
      ];

      for (const message of messages) {
        await resourceManager.processMessage('audio', message);
      }

      const audioState = audioProvider.getContextState();
      const expectedTokenCount = Math.ceil((messages[0].content.length + messages[1].content.length) / 4);
      expect(audioState.tokenCount).toBeGreaterThanOrEqual(expectedTokenCount);

      await resourceManager.switchProvider('audio', 'composition');
      const compositionState = compositionProvider.getContextState();
      expect(compositionState.tokenCount).toBeGreaterThanOrEqual(expectedTokenCount);
    });
  });
});