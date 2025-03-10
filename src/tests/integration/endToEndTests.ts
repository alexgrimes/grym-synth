/**
 * End-to-End Integration Tests for grym-synth Backend
 *
 * This file contains comprehensive end-to-end tests that verify the complete
 * flow of operations through the grym-synth backend, ensuring all components
 * work together correctly.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { integrationTestFramework } from './framework';
import { contextManager } from '../../context';
import { serviceRegistry } from '../../services';

// Test configuration
const TEST_CONFIG = {
  name: 'grym-synth Backend Integration Tests',
  services: ['gama', 'audioldm', 'xenakisldm'],
  mockExternalDependencies: true,
  timeout: 30000, // 30 seconds
};

// Performance test configuration
const PERFORMANCE_CONFIG = {
  samples: 10,
  warmupSamples: 2,
  cooldownMs: 100,
};

describe('grym-synth Backend Integration Tests', () => {
  // Initialize the test framework before all tests
  beforeAll(async () => {
    await integrationTestFramework.initialize({
      enableHealthMonitoring: true,
      logLevel: 'info',
    });
    await integrationTestFramework.setupTest(TEST_CONFIG);
  });

  // Clean up after all tests
  afterAll(async () => {
    await integrationTestFramework.teardownTest(TEST_CONFIG);
    await integrationTestFramework.shutdown();
  });

  // Reset context before each test
  beforeEach(async () => {
    await contextManager.clear();
  });

  describe('Audio Generation Flow', () => {
    test('should generate audio from text prompt', async () => {
      // Create a test task for audio generation
      const task = {
        id: 'test-audio-generation',
        type: 'audio_generation',
        prompt: 'A melodic synth pattern with rhythmic elements',
        parameters: {
          duration: 5,
          model: 'audioldm',
          style: 'electronic',
          tempo: 120,
        },
      };

      // Execute the task
      const result = await integrationTestFramework.executeTask(task);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.audio).toBeDefined();
      expect(result.data.duration).toBeCloseTo(5, 1);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.latency).toBeDefined();
    });

    test('should handle audio generation with variations', async () => {
      // First, generate the original audio
      const originalTask = {
        id: 'test-original-audio',
        type: 'audio_generation',
        prompt: 'A simple drum pattern',
        parameters: {
          duration: 3,
          model: 'audioldm',
          style: 'percussion',
          tempo: 100,
        },
      };

      const originalResult = await integrationTestFramework.executeTask(originalTask);
      expect(originalResult.status).toBe('success');

      // Now generate a variation
      const variationTask = {
        id: 'test-variation-audio',
        type: 'audio_variation',
        sourceAudioId: originalResult.data.audioId,
        parameters: {
          variationStrength: 0.5,
          preserveRhythm: true,
        },
      };

      const variationResult = await integrationTestFramework.executeTask(variationTask);

      // Verify the variation result
      expect(variationResult.status).toBe('success');
      expect(variationResult.data).toBeDefined();
      expect(variationResult.data.audio).toBeDefined();
      expect(variationResult.data.audioId).not.toBe(originalResult.data.audioId);
      expect(variationResult.data.duration).toBeCloseTo(originalResult.data.duration, 1);
    });
  });

  describe('Pattern Recognition Flow', () => {
    test('should analyze audio and extract patterns', async () => {
      // Create a test audio sample
      const testAudio = integrationTestFramework.createTestAudioSample('test-pattern-audio', {
        duration: 5,
        type: 'sine',
        frequency: 440,
      });

      // Create a task for pattern analysis
      const task = {
        id: 'test-pattern-analysis',
        type: 'pattern_recognition',
        audio: testAudio.data,
        parameters: {
          sensitivity: 0.8,
          patternTypes: ['rhythm', 'melody', 'harmony'],
        },
      };

      // Execute the task
      const result = await integrationTestFramework.executeTask(task);

      // Verify the result
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.patterns).toBeInstanceOf(Array);
      expect(result.data.patterns.length).toBeGreaterThan(0);
      expect(result.data.patterns[0].type).toBeDefined();
      expect(result.data.patterns[0].confidence).toBeGreaterThan(0);
      expect(result.data.patterns[0].features).toBeDefined();
    });

    test('should find similar patterns across audio samples', async () => {
      // Create two similar test audio samples
      const testAudio1 = integrationTestFramework.createTestAudioSample('test-similar-1', {
        duration: 3,
        type: 'sine',
        frequency: 440,
      });

      const testAudio2 = integrationTestFramework.createTestAudioSample('test-similar-2', {
        duration: 3,
        type: 'sine',
        frequency: 445, // Slightly different frequency
      });

      // Analyze the first sample
      const analysisTask1 = {
        id: 'test-analysis-1',
        type: 'pattern_recognition',
        audio: testAudio1.data,
        parameters: {
          sensitivity: 0.8,
        },
      };

      const analysisResult1 = await integrationTestFramework.executeTask(analysisTask1);
      expect(analysisResult1.status).toBe('success');

      // Analyze the second sample
      const analysisTask2 = {
        id: 'test-analysis-2',
        type: 'pattern_recognition',
        audio: testAudio2.data,
        parameters: {
          sensitivity: 0.8,
        },
      };

      const analysisResult2 = await integrationTestFramework.executeTask(analysisTask2);
      expect(analysisResult2.status).toBe('success');

      // Find similar patterns
      const similarityTask = {
        id: 'test-similarity',
        type: 'pattern_similarity',
        patternIds: [
          analysisResult1.data.patterns[0].id,
          analysisResult2.data.patterns[0].id,
        ],
        parameters: {
          threshold: 0.7,
        },
      };

      const similarityResult = await integrationTestFramework.executeTask(similarityTask);

      // Verify the similarity result
      expect(similarityResult.status).toBe('success');
      expect(similarityResult.data).toBeDefined();
      expect(similarityResult.data.similarityScore).toBeGreaterThan(0.7);
      expect(similarityResult.data.matchedFeatures).toBeDefined();
    });
  });

  describe('Parameter Mapping Flow', () => {
    test('should map parameters between different models', async () => {
      // Create a parameter mapping task
      const task = {
        id: 'test-parameter-mapping',
        type: 'parameter_mapping',
        sourceModel: 'gama',
        targetModel: 'xenakisldm',
        parameters: {
          density: 0.7,
          complexity: 0.5,
          brightness: 0.8,
        },
      };

      // Execute the task
      const result = await integrationTestFramework.executeTask(task);

      // Verify the result
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.mappedParameters).toBeDefined();
      expect(result.data.mappedParameters.xenakisldm).toBeDefined();
      expect(Object.keys(result.data.mappedParameters.xenakisldm).length).toBeGreaterThan(0);
    });
  });

  describe('Model Management Flow', () => {
    test('should load and unload models on demand', async () => {
      // Get the initial model status
      const initialStatus = await serviceRegistry.getService('audioldm').then(service => service.getStatus());

      // Create a model unload task
      const unloadTask = {
        id: 'test-model-unload',
        type: 'model_management',
        action: 'unload',
        modelId: 'audioldm',
      };

      // Execute the unload task
      const unloadResult = await integrationTestFramework.executeTask(unloadTask);
      expect(unloadResult.status).toBe('success');

      // Verify the model is unloaded
      const unloadedStatus = await serviceRegistry.getService('audioldm').then(service => service.getStatus());
      expect(unloadedStatus).toBe('offline');

      // Create a model load task
      const loadTask = {
        id: 'test-model-load',
        type: 'model_management',
        action: 'load',
        modelId: 'audioldm',
      };

      // Execute the load task
      const loadResult = await integrationTestFramework.executeTask(loadTask);
      expect(loadResult.status).toBe('success');

      // Verify the model is loaded
      const loadedStatus = await serviceRegistry.getService('audioldm').then(service => service.getStatus());
      expect(loadedStatus).toBe('online');
    });
  });

  describe('End-to-End Performance', () => {
    test('should meet performance targets for audio generation', async () => {
      // Define the operation to measure
      const operation = async () => {
        const task = {
          id: `perf-audio-gen-${Date.now()}`,
          type: 'audio_generation',
          prompt: 'A short synth melody',
          parameters: {
            duration: 2,
            model: 'audioldm',
          },
        };
        return integrationTestFramework.executeTask(task);
      };

      // Measure performance
      const metrics = await integrationTestFramework.measurePerformance(
        operation,
        PERFORMANCE_CONFIG
      );

      // Log the performance metrics
      console.log(integrationTestFramework.formatPerformanceMetrics(metrics));

      // Verify performance meets targets
      expect(metrics.average).toBeLessThan(5000); // 5 seconds max for audio generation
      expect(metrics.p95).toBeLessThan(7000); // 7 seconds for p95
      expect(metrics.throughput).toBeGreaterThan(0.1); // At least 0.1 ops/sec
    });

    test('should meet performance targets for pattern recognition', async () => {
      // Create a test audio sample
      const testAudio = integrationTestFramework.createTestAudioSample('perf-pattern-audio', {
        duration: 3,
        type: 'sine',
      });

      // Define the operation to measure
      const operation = async () => {
        const task = {
          id: `perf-pattern-${Date.now()}`,
          type: 'pattern_recognition',
          audio: testAudio.data,
          parameters: {
            sensitivity: 0.8,
          },
        };
        return integrationTestFramework.executeTask(task);
      };

      // Measure performance
      const metrics = await integrationTestFramework.measurePerformance(
        operation,
        PERFORMANCE_CONFIG
      );

      // Log the performance metrics
      console.log(integrationTestFramework.formatPerformanceMetrics(metrics));

      // Verify performance meets targets
      expect(metrics.average).toBeLessThan(1000); // 1 second max for pattern recognition
      expect(metrics.p95).toBeLessThan(1500); // 1.5 seconds for p95
      expect(metrics.throughput).toBeGreaterThan(0.5); // At least 0.5 ops/sec
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle and recover from service failures', async () => {
      // Mock a failing service
      integrationTestFramework.mockService('gama', {
        executeTask: jest.fn().mockRejectedValueOnce(new Error('Simulated service failure')),
      });

      // Create a task that will fail
      const failingTask = {
        id: 'test-failure-recovery',
        type: 'audio_generation',
        prompt: 'This will fail',
        parameters: {
          model: 'gama',
        },
      };

      // Execute the task and expect it to fail
      const failResult = await integrationTestFramework.executeTask(failingTask);
      expect(failResult.status).toBe('error');
      expect(failResult.error).toContain('Simulated service failure');

      // Restore the service
      integrationTestFramework.restoreService('gama');

      // Try again with the same task
      const recoveryTask = {
        ...failingTask,
        id: 'test-recovery',
      };

      // Execute the task again and expect it to succeed
      const recoveryResult = await integrationTestFramework.executeTask(recoveryTask);
      expect(recoveryResult.status).toBe('success');
    });

    test('should handle concurrent request overload gracefully', async () => {
      // Create multiple concurrent tasks
      const concurrentTasks = Array.from({ length: 20 }, (_, i) => ({
        id: `concurrent-${i}`,
        type: 'audio_generation',
        prompt: `Concurrent task ${i}`,
        parameters: {
          duration: 1,
          model: 'audioldm',
        },
      }));

      // Execute all tasks concurrently
      const results = await Promise.all(
        concurrentTasks.map(task => integrationTestFramework.executeTask(task))
      );

      // Count successes and failures
      const successes = results.filter(r => r.status === 'success').length;
      const failures = results.filter(r => r.status !== 'success').length;

      // Verify that at least some tasks succeeded
      expect(successes).toBeGreaterThan(0);

      // If there were failures, verify they have appropriate error messages
      if (failures > 0) {
        const failedResults = results.filter(r => r.status !== 'success');
        for (const result of failedResults) {
          expect(result.error).toBeDefined();
          expect(['overload', 'timeout', 'busy'].some(term =>
            result.error.toLowerCase().includes(term)
          )).toBe(true);
        }
      }
    });
  });
});

