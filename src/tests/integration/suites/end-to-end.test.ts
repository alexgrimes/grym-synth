/**
 * End-to-End Integration Tests
 *
 * Tests complete user flows from input to output.
 */

import { integrationTestFramework } from '../framework';
import { contextManager, ContextItem } from '../../../context';
import { serviceRegistry } from '../../../services';
import { taskRouter } from '../../../orchestration';
import { Logger } from '../../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

const logger = new Logger({ namespace: 'e2e-tests' });

describe('End-to-End Integration Tests', () => {
  // Use longer timeout for integration tests
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Initialize the test framework with health monitoring
    await integrationTestFramework.initialize({
      enableHealthMonitoring: true,
      healthCheckIntervalMs: 1000,
    });

    // Setup test environment with all required services
    await integrationTestFramework.setupTest({
      name: 'end-to-end-tests',
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

  describe('Audio Analysis Flow', () => {
    it('should analyze audio and extract meaningful features', async () => {
      // Create test audio sample with multiple frequencies
      const audioSample = integrationTestFramework.createTestAudioSample('analysis-audio', {
        duration: 3,
        type: 'noise', // Use noise to test more complex analysis
        sampleRate: 16000,
      });

      // Set up analysis context
      const contextItem: ContextItem = {
        id: 'analysis-context',
        type: 'processing_requirements',
        content: {
          quality: 'high',
          latency: 'batch',
          priority: 2,
          analysisDepth: 'detailed',
        },
        timestamp: new Date(),
        metadata: {
          timestamp: new Date(),
          source: 'integration-test',
          priority: 2,
          tags: ['analysis-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create analysis task
      const task = {
        id: 'audio-analysis-task',
        type: 'audio_analyze',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          extractFeatures: true,
          identifyPatterns: true,
          generateReport: true,
        },
        context: {
          tags: ['analysis-test'],
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify analysis results
      expect(result.data.features).toBeDefined();
      expect(result.data.patterns).toBeDefined();
      expect(result.data.report).toBeDefined();

      // Verify feature extraction
      expect(result.data.features.length).toBeGreaterThan(0);

      // Verify pattern identification
      expect(result.data.patterns.length).toBeGreaterThan(0);
      expect(result.data.patterns[0].confidence).toBeGreaterThan(0);

      // Verify report generation
      expect(result.data.report.summary).toBeDefined();
      expect(result.data.report.metrics).toBeDefined();
    });

    it('should analyze audio with different parameters', async () => {
      // Create test audio samples with different characteristics
      const samples = [
        integrationTestFramework.createTestAudioSample('analysis-sine', {
          duration: 2,
          type: 'sine',
          frequency: 440,
          sampleRate: 16000,
        }),
        integrationTestFramework.createTestAudioSample('analysis-noise', {
          duration: 2,
          type: 'noise',
          sampleRate: 16000,
        }),
      ];

      // Create analysis tasks with different parameters
      const tasks = [
        {
          id: 'basic-analysis-task',
          type: 'audio_analyze',
          data: samples[0].data,
          parameters: {
            sampleRate: samples[0].sampleRate,
            extractFeatures: true,
            identifyPatterns: false,
            generateReport: false,
          },
          storeResults: true,
        },
        {
          id: 'detailed-analysis-task',
          type: 'audio_analyze',
          data: samples[1].data,
          parameters: {
            sampleRate: samples[1].sampleRate,
            extractFeatures: true,
            identifyPatterns: true,
            generateReport: true,
            frequencyResolution: 'high',
            temporalResolution: 'high',
          },
          storeResults: true,
        },
      ];

      // Execute tasks
      const results = await Promise.all(tasks.map(task =>
        integrationTestFramework.executeTask(task)
      ));

      // Verify all tasks succeeded
      expect(results.every(r => r.status === 'success')).toBe(true);

      // Verify basic analysis results
      expect(results[0].data.features).toBeDefined();
      expect(results[0].data.patterns).toBeUndefined();
      expect(results[0].data.report).toBeUndefined();

      // Verify detailed analysis results
      expect(results[1].data.features).toBeDefined();
      expect(results[1].data.patterns).toBeDefined();
      expect(results[1].data.report).toBeDefined();
      expect(results[1].data.features.length).toBeGreaterThan(results[0].data.features.length);
    });
  });

  describe('Audio Transformation Flow', () => {
    it('should transform audio based on user parameters', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('transform-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Set up transformation context
      const contextItem: ContextItem = {
        id: 'transform-context',
        type: 'stylistic_preferences',
        content: {
          genre: 'ambient',
          tempo: 80,
          effects: ['reverb', 'delay'],
        },
        timestamp: new Date(),
        metadata: {
          timestamp: new Date(),
          source: 'integration-test',
          priority: 1,
          tags: ['transform-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create transformation task
      const task = {
        id: 'audio-transform-task',
        type: 'audio_transform',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          transformationType: 'spectral',
          density: 0.7,
          complexity: 0.5,
          applyEffects: true,
        },
        context: {
          tags: ['transform-test'],
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify transformation results
      expect(result.data.audio).toBeDefined();
      expect(result.data.parameters).toBeDefined();
      expect(result.data.audio.length).toBeGreaterThan(0);

      // Verify that stylistic preferences were applied
      expect(result.data.parameters.appliedEffects).toContain('reverb');
      expect(result.data.parameters.appliedEffects).toContain('delay');
    });

    it('should transform audio using musical concepts', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('concept-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Create transformation task with musical concepts
      const task = {
        id: 'concept-transform-task',
        type: 'audio_transform',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          useConceptMapper: true,
          musicalConcepts: {
            harmonicDensity: 0.8,
            texturalComplexity: 0.6,
            spectralMotion: 0.4,
            grainDensity: 0.7,
          },
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify transformation results
      expect(result.data.audio).toBeDefined();
      expect(result.data.parameters).toBeDefined();

      // Verify that concept mapper was used
      expect(result.metrics.conceptMapperUsed).toBe(true);

      // Verify that concepts were mapped to parameters
      expect(result.data.parameters.mappedConcepts).toBeDefined();
      expect(result.data.parameters.mappedConcepts.harmonicDensity).toBeDefined();
    });
  });

  describe('Audio Generation Flow', () => {
    it('should generate audio based on text prompts', async () => {
      // Create generation task with text prompt
      const task = {
        id: 'text-generation-task',
        type: 'audio_generate',
        data: {
          prompt: 'A gentle piano melody with soft ambient background',
          duration: 3,
          sampleRate: 16000,
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify generation results
      expect(result.data.audio).toBeDefined();
      expect(result.data.sampleRate).toBe(16000);
      expect(result.data.audio.length).toBeGreaterThan(0);
    });

    it('should generate audio based on reference audio', async () => {
      // Create test audio sample as reference
      const referenceAudio = integrationTestFramework.createTestAudioSample('reference-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Create generation task with reference audio
      const task = {
        id: 'reference-generation-task',
        type: 'audio_generate',
        data: {
          prompt: 'Similar to the reference but more complex',
          referenceAudio: referenceAudio.data,
          duration: 3,
          sampleRate: 16000,
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();

      // Verify generation results
      expect(result.data.audio).toBeDefined();
      expect(result.data.sampleRate).toBe(16000);
      expect(result.data.audio.length).toBeGreaterThan(0);

      // Verify that reference audio was used
      expect(result.metrics.referenceAudioUsed).toBe(true);
    });
  });

  describe('Complete User Workflows', () => {
    it('should handle a complete analyze-transform-generate workflow', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('workflow-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Step 1: Analyze audio
      const analysisTask = {
        id: 'workflow-analysis-task',
        type: 'audio_analyze',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          extractFeatures: true,
          identifyPatterns: true,
        },
        storeResults: true,
      };

      const analysisResult = await integrationTestFramework.executeTask(analysisTask);
      expect(analysisResult.status).toBe('success');
      expect(analysisResult.data.features).toBeDefined();
      expect(analysisResult.data.patterns).toBeDefined();

      // Step 2: Transform audio based on analysis
      const transformTask = {
        id: 'workflow-transform-task',
        type: 'audio_transform',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          transformationType: 'spectral',
          // Use analysis results to inform transformation
          baseFrequency: analysisResult.data.features[0].dominantFrequency,
          patternComplexity: analysisResult.data.patterns.length / 10,
        },
        storeResults: true,
      };

      const transformResult = await integrationTestFramework.executeTask(transformTask);
      expect(transformResult.status).toBe('success');
      expect(transformResult.data.audio).toBeDefined();

      // Step 3: Generate new audio based on transformed audio
      const generationTask = {
        id: 'workflow-generation-task',
        type: 'audio_generate',
        data: {
          prompt: 'Extend this audio with similar characteristics',
          referenceAudio: transformResult.data.audio,
          duration: 5,
          sampleRate: 16000,
        },
        storeResults: true,
      };

      const generationResult = await integrationTestFramework.executeTask(generationTask);
      expect(generationResult.status).toBe('success');
      expect(generationResult.data.audio).toBeDefined();
      expect(generationResult.data.audio.length).toBeGreaterThan(0);

      // Verify the complete workflow
      expect(analysisResult.data.features.length).toBeGreaterThan(0);
      expect(transformResult.data.audio.length).toBeGreaterThan(0);
      expect(generationResult.data.audio.length).toBeGreaterThan(transformResult.data.audio.length);
    });

    it('should handle a batch processing workflow', async () => {
      // Create multiple test audio samples
      const samples = Array.from({ length: 5 }, (_, i) =>
        integrationTestFramework.createTestAudioSample(`batch-audio-${i}`, {
          duration: 1,
          type: 'sine',
          frequency: 440 * (1 + i * 0.1), // Different frequencies
          sampleRate: 16000,
        })
      );

      // Step 1: Create batch processing task
      const batchTask = {
        id: 'batch-processing-task',
        type: 'audio_batch_process',
        data: {
          samples: samples.map(sample => ({
            id: sample.metadata?.id || `sample-${Math.random().toString(36).substring(2, 9)}`,
            audio: sample.data,
            sampleRate: sample.sampleRate,
          })),
          operation: 'analyze',
          parameters: {
            extractFeatures: true,
          },
        },
        storeResults: true,
      };

      // Execute batch task
      const batchResult = await integrationTestFramework.executeTask(batchTask);

      // Verify success
      expect(batchResult.status).toBe('success');
      expect(batchResult.data.results).toBeDefined();
      expect(batchResult.data.results.length).toBe(samples.length);
      expect(batchResult.data.results.every((r: any) => r.status === 'success')).toBe(true);

      // Step 2: Create aggregation task based on batch results
      const aggregationTask = {
        id: 'aggregation-task',
        type: 'audio_aggregate_results',
        data: {
          results: batchResult.data.results,
          aggregationType: 'feature_comparison',
        },
        storeResults: true,
      };

      // Execute aggregation task
      const aggregationResult = await integrationTestFramework.executeTask(aggregationTask);

      // Verify success
      expect(aggregationResult.status).toBe('success');
      expect(aggregationResult.data.comparison).toBeDefined();
      expect(aggregationResult.data.summary).toBeDefined();

      // Verify that the comparison includes all samples
      expect(Object.keys(aggregationResult.data.comparison).length).toBe(samples.length);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid inputs gracefully', async () => {
      // Create invalid audio sample (empty)
      const invalidAudio = new Float32Array(0);

      // Create task with invalid audio
      const task = {
        id: 'invalid-input-task',
        type: 'audio_process',
        data: invalidAudio,
        parameters: {
          sampleRate: 16000,
        },
        storeResults: false,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify error handling
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid audio data');
      expect(result.error.code).toBeDefined();
    });

    it('should recover from service failures', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('recovery-test-audio', {
        duration: 1,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
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

      // Create task with retry parameters
      const task = {
        id: 'recovery-test-task',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          maxRetries: 3,
          retryDelayMs: 100,
        },
        storeResults: false,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify recovery
      expect(result.status).toBe('success');
      expect(result.recoveryAttempts).toBeGreaterThan(0);
      expect(result.recoveryTime).toBeGreaterThan(0);

      // Restore original service
      serviceRegistry.registerService('wav2vec2', originalService);
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain performance with increasing audio duration', async () => {
      // Create audio samples with increasing duration
      const durations = [1, 2, 4, 8];
      const samples = durations.map(duration =>
        integrationTestFramework.createTestAudioSample(`duration-audio-${duration}`, {
          duration,
          type: 'sine',
          frequency: 440,
          sampleRate: 16000,
        })
      );

      // Process each sample and measure performance
      const results = [];

      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        const task = {
          id: `duration-task-${i}`,
          type: 'audio_process',
          modelType: 'wav2vec2',
          data: sample.data,
          parameters: {
            sampleRate: sample.sampleRate,
          },
          storeResults: false,
        };

        const startTime = performance.now();
        const result = await integrationTestFramework.executeTask(task);
        const duration = performance.now() - startTime;

        results.push({
          audioDuration: durations[i],
          processingTime: duration,
          ratio: duration / durations[i],
        });

        // Verify success
        expect(result.status).toBe('success');
      }

      // Log performance results
      logger.info('Performance scaling with audio duration', { results });

      // Verify that processing time scales reasonably with audio duration
      // The ratio of processing time to audio duration should not increase dramatically
      const ratios = results.map(r => r.ratio);
      for (let i = 1; i < ratios.length; i++) {
        // Allow for some increase but not exponential
        expect(ratios[i]).toBeLessThan(ratios[i-1] * 2);
      }
    });

    it('should handle concurrent user workflows', async () => {
      // Simulate multiple concurrent user workflows
      const workflowCount = 3;
      const workflows = [];

      for (let i = 0; i < workflowCount; i++) {
        // Create unique audio sample for each workflow
        const audioSample = integrationTestFramework.createTestAudioSample(`concurrent-audio-${i}`, {
          duration: 1,
          type: 'sine',
          frequency: 440 * (1 + i * 0.2),
          sampleRate: 16000,
        });

        // Create workflow tasks
        const analysisTask = {
          id: `concurrent-analysis-${i}`,
          type: 'audio_analyze',
          data: audioSample.data,
          parameters: {
            sampleRate: audioSample.sampleRate,
            extractFeatures: true,
          },
          storeResults: true,
        };

        const transformTask = (analysisResult: any) => ({
          id: `concurrent-transform-${i}`,
          type: 'audio_transform',
          data: audioSample.data,
          parameters: {
            sampleRate: audioSample.sampleRate,
            transformationType: 'spectral',
            baseFrequency: analysisResult.data.features[0].dominantFrequency || 440,
          },
          storeResults: true,
        });

        // Define workflow function
        const workflow = async () => {
          const analysisResult = await integrationTestFramework.executeTask(analysisTask);
          expect(analysisResult.status).toBe('success');

          const transformResult = await integrationTestFramework.executeTask(transformTask(analysisResult));
          expect(transformResult.status).toBe('success');

          return {
            workflowId: i,
            analysisResult,
            transformResult,
          };
        };

        workflows.push(workflow);
      }

      // Execute all workflows concurrently
      const startTime = performance.now();
      const results = await Promise.all(workflows.map(workflow => workflow()));
      const totalTime = performance.now() - startTime;

      // Verify all workflows completed successfully
      expect(results.length).toBe(workflowCount);
      expect(results.every(r => r.analysisResult.status === 'success')).toBe(true);
      expect(results.every(r => r.transformResult.status === 'success')).toBe(true);

      // Log concurrency performance
      logger.info('Concurrent workflow performance', {
        workflowCount,
        totalTime,
        avgTimePerWorkflow: totalTime / workflowCount,
      });

      // Verify reasonable performance under concurrency
      expect(totalTime).toBeLessThan(workflowCount * 5000); // Adjust threshold as needed
    });
  });
});
