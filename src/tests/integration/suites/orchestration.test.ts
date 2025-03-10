/**
 * Integration Tests for Orchestration
 *
 * Tests the reasoning LLM's delegation to specialized models.
 */

import { integrationTestFramework } from '../framework';
import { contextManager, ContextItem } from '../../../context';
import { serviceRegistry } from '../../../services';
import { taskRouter } from '../../../orchestration';
import { Logger } from '../../../utils/logger';

const logger = new Logger({ namespace: 'orchestration-tests' });

describe('Orchestration Integration Tests', () => {
  // Use longer timeout for integration tests
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Initialize the test framework with health monitoring
    await integrationTestFramework.initialize({
      enableHealthMonitoring: true,
      healthCheckIntervalMs: 1000,
    });

    // Setup test environment with required services
    await integrationTestFramework.setupTest({
      name: 'orchestration-tests',
      services: ['wav2vec2', 'gama', 'audioldm', 'xenakisldm'],
      mockExternalDependencies: true, // Use mocks for external dependencies
    });
  });

  afterAll(async () => {
    // Clean up test environment
    await integrationTestFramework.shutdown();
  });

  // Clean up after each test
  afterEach(async () => {
    await contextManager.clear().catch(() => {});
  });

  describe('Task Routing', () => {
    it('should route audio processing tasks to the appropriate model', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('routing-audio-1', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Create task without specifying model type
      const task = {
        id: 'routing-task-1',
        type: 'audio_process',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify routing metrics
      expect(result.routingMetrics).toBeDefined();
      expect(result.routingMetrics.selectedModel).toBeDefined();
      expect(result.routingMetrics.routingTime).toBeDefined();
      expect(result.routingMetrics.routingTime).toBeLessThan(500);
    });

    it('should route tasks based on context and task type', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('routing-audio-2', {
        duration: 1,
        type: 'noise',
        sampleRate: 16000,
      });

      // Set up context with processing requirements
      const contextItem: ContextItem = {
        id: 'routing-context',
        type: 'processing_requirements',
        content: {
          quality: 'high',
          latency: 'batch',
          priority: 2,
        },
        timestamp: new Date(),
        metadata: {
          timestamp: new Date(),
          source: 'integration-test',
          priority: 2,
          tags: ['routing-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create task with context reference
      const task = {
        id: 'routing-task-2',
        type: 'audio_process',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          requiresFeatureExtraction: true,
        },
        context: {
          tags: ['routing-test'],
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify routing metrics
      expect(result.routingMetrics.selectedModel).toBeDefined();
      expect(result.routingMetrics.contextFetchTime).toBeDefined();
      expect(result.routingMetrics.contextFetchTime).toBeLessThan(500);

      // Verify that context influenced the routing decision
      expect(result.routingMetrics.contextInfluencedRouting).toBe(true);
    });
  });

  describe('Task Delegation', () => {
    it('should delegate complex tasks to multiple models', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('delegation-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Create a complex task that requires multiple models
      const task = {
        id: 'delegation-task',
        type: 'audio_analyze_and_transform',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          extractFeatures: true,
          transformAudio: true,
          transformationParams: {
            density: 0.7,
            complexity: 0.5,
          },
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify delegation metrics
      expect(result.delegationMetrics).toBeDefined();
      expect(result.delegationMetrics.subtaskCount).toBeGreaterThan(1);
      expect(result.delegationMetrics.modelsUsed).toBeDefined();
      expect(result.delegationMetrics.modelsUsed.length).toBeGreaterThan(1);

      // Verify that the result contains both features and transformed audio
      expect(result.data.features).toBeDefined();
      expect(result.data.transformedAudio).toBeDefined();
    });

    it('should handle subtask failures gracefully', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('failure-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Create a task with invalid parameters to trigger a subtask failure
      const task = {
        id: 'failure-delegation-task',
        type: 'audio_analyze_and_transform',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          extractFeatures: true,
          transformAudio: true,
          transformationParams: {
            density: -1, // Invalid value to trigger failure
            complexity: 2, // Invalid value to trigger failure
          },
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify partial success
      expect(result.status).toBe('partial_success');
      expect(result.data).toBeDefined();
      expect(result.partialErrors).toBeDefined();
      expect(result.partialErrors.length).toBeGreaterThan(0);

      // Verify that some parts of the task succeeded
      expect(result.data.features).toBeDefined();
      expect(result.data.transformedAudio).toBeUndefined(); // This part should have failed
    });
  });

  describe('Dynamic Model Selection', () => {
    it('should select models based on capability scores', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('capability-audio', {
        duration: 1,
        type: 'sine',
        frequency: 880,
        sampleRate: 16000,
      });

      // Create task that requires specific capabilities
      const task = {
        id: 'capability-task',
        type: 'audio_process',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          capabilities: {
            featureExtraction: 0.8,
            noiseReduction: 0.5,
            frequencyAnalysis: 0.9,
          },
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify capability-based selection
      expect(result.routingMetrics.capabilityScores).toBeDefined();
      expect(result.routingMetrics.selectedModel).toBeDefined();
      expect(result.routingMetrics.selectionReason).toContain('capability');
    });

    it('should adapt model selection based on task history', async () => {
      // Create multiple audio samples
      const audioSamples = [
        integrationTestFramework.createTestAudioSample('history-audio-1', { type: 'sine', frequency: 440 }),
        integrationTestFramework.createTestAudioSample('history-audio-2', { type: 'sine', frequency: 880 }),
        integrationTestFramework.createTestAudioSample('history-audio-3', { type: 'noise' }),
      ];

      // Store task history in context
      const historyItem: ContextItem = {
        id: 'task-history-context',
        type: 'task_history',
        content: {
          recentTasks: [
            {
              id: 'previous-task-1',
              type: 'audio_process',
              modelType: 'wav2vec2',
              success: true,
              executionTime: 150,
            },
            {
              id: 'previous-task-2',
              type: 'audio_process',
              modelType: 'gama',
              success: false,
              executionTime: 300,
              error: 'Resource exhaustion',
            },
          ],
        },
        timestamp: new Date(),
        metadata: {
          timestamp: new Date(),
          source: 'integration-test',
          priority: 1,
          tags: ['history-test'],
        },
      };
      await contextManager.storeContext(historyItem);

      // Create tasks for each sample
      const tasks = audioSamples.map((sample, index) => ({
        id: `history-task-${index}`,
        type: 'audio_process',
        data: sample.data,
        parameters: {
          sampleRate: sample.sampleRate,
        },
        context: {
          tags: ['history-test'],
        },
        storeResults: false,
      }));

      // Execute tasks sequentially
      const results = [];
      for (const task of tasks) {
        results.push(await integrationTestFramework.executeTask(task));
      }

      // Verify all tasks succeeded
      expect(results.every(r => r.status === 'success')).toBe(true);

      // Verify that task history influenced model selection
      expect(results.some(r => r.routingMetrics.historyInfluencedRouting)).toBe(true);

      // Verify that the model selection adapted over time
      const selectedModels = results.map(r => r.routingMetrics.selectedModel);
      expect(new Set(selectedModels).size).toBeGreaterThan(1);
    });
  });

  describe('Resource Management', () => {
    it('should allocate resources based on task priority', async () => {
      // Create audio samples
      const highPriorityAudio = integrationTestFramework.createTestAudioSample('high-priority-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
      });

      const lowPriorityAudio = integrationTestFramework.createTestAudioSample('low-priority-audio', {
        duration: 2,
        type: 'sine',
        frequency: 880,
      });

      // Create high and low priority tasks
      const highPriorityTask = {
        id: 'high-priority-task',
        type: 'audio_process',
        data: highPriorityAudio.data,
        parameters: {
          sampleRate: highPriorityAudio.sampleRate,
          priority: 10,
        },
        storeResults: true,
      };

      const lowPriorityTask = {
        id: 'low-priority-task',
        type: 'audio_process',
        data: lowPriorityAudio.data,
        parameters: {
          sampleRate: lowPriorityAudio.sampleRate,
          priority: 1,
        },
        storeResults: true,
      };

      // Execute tasks concurrently
      const [highPriorityResult, lowPriorityResult] = await Promise.all([
        integrationTestFramework.executeTask(highPriorityTask),
        integrationTestFramework.executeTask(lowPriorityTask),
      ]);

      // Verify both tasks succeeded
      expect(highPriorityResult.status).toBe('success');
      expect(lowPriorityResult.status).toBe('success');

      // Verify resource allocation metrics
      expect(highPriorityResult.resourceMetrics).toBeDefined();
      expect(lowPriorityResult.resourceMetrics).toBeDefined();

      // Verify that high priority task received more resources
      expect(highPriorityResult.resourceMetrics.allocatedMemory)
        .toBeGreaterThan(lowPriorityResult.resourceMetrics.allocatedMemory);
    });

    it('should handle resource constraints gracefully', async () => {
      // Create multiple audio samples to simulate high load
      const samples = Array.from({ length: 10 }, (_, i) =>
        integrationTestFramework.createTestAudioSample(`resource-audio-${i}`, {
          duration: 2,
          type: 'sine',
          frequency: 440 * (1 + i * 0.1),
        })
      );

      // Create tasks with high resource requirements
      const tasks = samples.map((sample, index) => ({
        id: `resource-task-${index}`,
        type: 'audio_process',
        data: sample.data,
        parameters: {
          sampleRate: sample.sampleRate,
          requireHighMemory: true,
          requireHighCpu: true,
        },
        storeResults: false,
      }));

      // Execute tasks concurrently to create resource pressure
      const results = await Promise.all(tasks.map(task =>
        integrationTestFramework.executeTask(task)
      ));

      // Verify that all tasks were handled
      expect(results.length).toBe(tasks.length);

      // Some tasks may be queued or executed with reduced resources
      const successCount = results.filter(r => r.status === 'success').length;
      const queuedCount = results.filter(r => r.status === 'queued').length;
      const reducedResourcesCount = results.filter(r =>
        r.status === 'success' && r.resourceMetrics && r.resourceMetrics.reducedResources
      ).length;

      logger.info('Resource constraint handling', {
        totalTasks: tasks.length,
        successCount,
        queuedCount,
        reducedResourcesCount,
      });

      // Verify that the system handled the resource constraints
      expect(successCount + queuedCount).toBe(tasks.length);
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should monitor service health during orchestration', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('health-audio', {
        duration: 1,
        type: 'sine',
        frequency: 440,
      });

      // Create task
      const task = {
        id: 'health-monitoring-task',
        type: 'audio_process',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          monitorHealth: true,
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');

      // Verify health monitoring metrics
      expect(result.healthMetrics).toBeDefined();
      expect(result.healthMetrics.servicesMonitored).toBeDefined();
      expect(result.healthMetrics.healthCheckCount).toBeGreaterThan(0);
      expect(result.healthMetrics.overallHealth).toBeDefined();
    });

    it('should recover from service failures during orchestration', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('recovery-audio', {
        duration: 1,
        type: 'sine',
        frequency: 440,
      });

      // Mock a service failure
      const originalService = await serviceRegistry.getService('wav2vec2');

      // Create a failing service mock
      const failingService = {
        ...originalService,
        executeTask: async (task: any) => {
          // Fail on first call, succeed on subsequent calls
          if (!failingService.hasBeenCalled) {
            failingService.hasBeenCalled = true;
            throw new Error('Simulated service failure');
          }
          return originalService.executeTask(task);
        },
        hasBeenCalled: false,
      };

      // Register the failing service
      serviceRegistry.registerService('wav2vec2', failingService);

      // Create task
      const task = {
        id: 'recovery-task',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success after recovery
      expect(result.status).toBe('success');
      expect(result.recoveryAttempts).toBeGreaterThan(0);

      // Restore original service
      serviceRegistry.registerService('wav2vec2', originalService);
    });
  });
});
