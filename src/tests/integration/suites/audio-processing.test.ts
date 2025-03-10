/**
 * Integration Tests for Audio Processing
 *
 * Tests the complete audio processing pipeline through all components.
 */

import { integrationTestFramework } from '../framework';
import { contextManager, ContextItem } from '../../../context';
import { serviceRegistry } from '../../../services';
import { taskRouter } from '../../../orchestration';
import { Logger } from '../../../utils/logger';

const logger = new Logger({ namespace: 'audio-processing-tests' });

describe('Audio Processing Integration Tests', () => {
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
      name: 'audio-processing-tests',
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

  describe('Basic Audio Processing', () => {
    it('should process audio through wav2vec2', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('basic-audio-1', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Set up test context
      const contextItem: ContextItem = {
        id: 'basic-audio-context',
        type: 'audio_parameters',
        content: {
          sampleRate: audioSample.sampleRate,
          channels: audioSample.channels,
          format: 'wav',
        },
        timestamp: new Date(),
        metadata: {
          timestamp: new Date(),
          source: 'integration-test',
          priority: 1,
          tags: ['basic-audio-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create task
      const task = {
        id: 'basic-audio-task-1',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        storeResults: true,
        context: {
          tags: ['basic-audio-test'],
        },
      };

      // Execute task and measure performance
      const metrics = await integrationTestFramework.measurePerformance(
        () => integrationTestFramework.executeTask(task),
        { samples: 3, warmupSamples: 1 }
      );

      // Log performance metrics
      logger.info('Basic audio processing performance', {
        metrics: integrationTestFramework.formatPerformanceMetrics(metrics),
      });

      // Execute task once more to get the result for validation
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should process audio with different parameters', async () => {
      // Create test audio sample with different characteristics
      const audioSample = integrationTestFramework.createTestAudioSample('basic-audio-2', {
        duration: 1.5,
        type: 'noise', // Use noise to test more complex processing
        sampleRate: 16000,
      });

      // Set up test context with different processing parameters
      const contextItem: ContextItem = {
        id: 'audio-params-context',
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
          tags: ['parameter-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create task with specific parameters
      const task = {
        id: 'parameter-audio-task',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          enhanceAudio: true,
          normalizeVolume: true,
        },
        storeResults: true,
        context: {
          tags: ['parameter-test'],
        },
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.metrics).toBeDefined();

      // Verify that parameters were applied
      expect(result.metrics.processingQuality).toBe('high');
    });
  });

  describe('Audio Transformation', () => {
    it('should transform audio using XenakisLDM', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('transform-audio-1', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Define transformation parameters
      const transformParams = {
        density: 0.7,
        complexity: 0.5,
        spectralMotion: 0.3,
        grainDensity: 0.8,
      };

      // Create task
      const task = {
        id: 'transform-audio-task-1',
        type: 'audio_transform',
        modelType: 'xenakisldm',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          ...transformParams,
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.audio).toBeDefined();
      expect(result.data.parameters).toBeDefined();

      // Verify that the output audio has the expected properties
      expect(result.data.audio.length).toBeGreaterThan(0);
      expect(result.data.parameters).toMatchObject(transformParams);
    });

    it('should apply musical concept mappings during transformation', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('transform-audio-2', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Define musical concepts
      const musicalConcepts = {
        harmonicDensity: 0.8,
        texturalComplexity: 0.6,
        spectralMotion: 0.4,
        grainDensity: 0.7,
      };

      // Create task with musical concepts
      const task = {
        id: 'musical-concept-task',
        type: 'audio_transform',
        modelType: 'xenakisldm',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          musicalConcepts,
          useConceptMapper: true,
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.audio).toBeDefined();
      expect(result.data.parameters).toBeDefined();

      // Verify that the concept mapper was used
      expect(result.metrics.conceptMapperUsed).toBe(true);
    });
  });

  describe('Audio Generation', () => {
    it('should generate audio using AudioLDM', async () => {
      // Define generation parameters
      const generationParams = {
        prompt: 'A gentle piano melody with soft ambient background',
        duration: 3,
        temperature: 0.8,
        guidanceScale: 7.5,
      };

      // Create task
      const task = {
        id: 'generate-audio-task-1',
        type: 'audio_generate',
        modelType: 'audioldm',
        data: generationParams,
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.audio).toBeDefined();
      expect(result.data.sampleRate).toBeDefined();

      // Verify that the output audio has the expected properties
      expect(result.data.audio.length).toBeGreaterThan(0);
      expect(result.data.sampleRate).toBe(16000); // Default sample rate
    });

    it('should generate audio with specific parameters', async () => {
      // Set up test context with generation parameters
      const contextItem: ContextItem = {
        id: 'generation-params-context',
        type: 'generation_parameters',
        content: {
          prompt: 'Atmospheric synthesizer pads with reverb',
          duration: 5,
          temperature: 0.9,
          topP: 0.95,
          guidanceScale: 8.0,
          diffusionSteps: 50,
          sampleRate: 22050,
        },
        timestamp: new Date(),
        metadata: {
          timestamp: new Date(),
          source: 'integration-test',
          priority: 1,
          tags: ['generation-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create task that references the context
      const task = {
        id: 'generate-audio-task-2',
        type: 'audio_generate',
        modelType: 'audioldm',
        data: {
          useContextParameters: true,
        },
        context: {
          tags: ['generation-test'],
        },
        storeResults: true,
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.audio).toBeDefined();
      expect(result.data.sampleRate).toBeDefined();

      // Verify that the context parameters were used
      expect(result.data.sampleRate).toBe(22050);
      expect(result.metrics.diffusionSteps).toBe(50);
    });
  });

  describe('End-to-End Audio Pipeline', () => {
    it('should process audio through the complete pipeline', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('e2e-audio', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Step 1: Extract features using wav2vec2
      const extractionTask = {
        id: 'e2e-extraction-task',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
        },
        storeResults: true,
      };

      const extractionResult = await integrationTestFramework.executeTask(extractionTask);
      expect(extractionResult.status).toBe('success');
      expect(extractionResult.data.features).toBeDefined();

      // Step 2: Transform audio using XenakisLDM
      const transformTask = {
        id: 'e2e-transform-task',
        type: 'audio_transform',
        modelType: 'xenakisldm',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          density: 0.6,
          complexity: 0.4,
        },
        storeResults: true,
      };

      const transformResult = await integrationTestFramework.executeTask(transformTask);
      expect(transformResult.status).toBe('success');
      expect(transformResult.data.audio).toBeDefined();

      // Step 3: Generate new audio based on transformed audio
      const generationTask = {
        id: 'e2e-generation-task',
        type: 'audio_generate',
        modelType: 'audioldm',
        data: {
          prompt: 'Similar to the input audio but with more texture',
          referenceAudio: transformResult.data.audio,
          duration: 3,
        },
        storeResults: true,
      };

      const generationResult = await integrationTestFramework.executeTask(generationTask);
      expect(generationResult.status).toBe('success');
      expect(generationResult.data.audio).toBeDefined();

      // Verify the complete pipeline
      expect(extractionResult.data.features.length).toBeGreaterThan(0);
      expect(transformResult.data.audio.length).toBeGreaterThan(0);
      expect(generationResult.data.audio.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully in the pipeline', async () => {
      // Create test audio sample with invalid data (empty)
      const invalidAudioSample = new Float32Array(0);

      // Try to process invalid audio
      const invalidTask = {
        id: 'invalid-audio-task',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: invalidAudioSample,
        storeResults: false,
      };

      // Execute task and expect error handling
      const result = await integrationTestFramework.executeTask(invalidTask);

      // Verify error is handled properly
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid audio data');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should maintain performance under load', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('perf-test-audio', {
        duration: 1,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Create task
      const task = {
        id: 'perf-test-task',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
        },
        storeResults: false,
      };

      // Execute task multiple times to measure performance under load
      const iterations = 5;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await integrationTestFramework.executeTask(task);
        const endTime = performance.now();
        timings.push(endTime - startTime);

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate performance metrics
      const avgTime = timings.reduce((a, b) => a + b) / iterations;
      const maxTime = Math.max(...timings);

      // Log performance metrics
      logger.info('Performance under load', {
        avgTime,
        maxTime,
        iterations,
        timings,
      });

      // Verify performance remains consistent
      expect(avgTime).toBeLessThan(2000); // Adjust threshold as needed
      expect(maxTime).toBeLessThan(3000); // Adjust threshold as needed
    });

    it('should handle memory efficiently', async () => {
      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and process multiple audio samples
      const sampleCount = 10;
      const tasks = [];

      for (let i = 0; i < sampleCount; i++) {
        const audioSample = integrationTestFramework.createTestAudioSample(`memory-test-audio-${i}`, {
          duration: 1,
          type: 'sine',
          frequency: 440 * (1 + i * 0.1), // Different frequencies
          sampleRate: 16000,
        });

        tasks.push({
          id: `memory-test-task-${i}`,
          type: 'audio_process',
          modelType: 'wav2vec2',
          data: audioSample.data,
          parameters: {
            sampleRate: audioSample.sampleRate,
          },
          storeResults: i % 2 === 0, // Store only half of the results to test memory management
        });
      }

      // Execute all tasks
      await Promise.all(tasks.map(task => integrationTestFramework.executeTask(task)));

      // Get final memory usage
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (finalMemory - initialMemory) / (1024 * 1024); // MB

      // Log memory usage
      logger.info('Memory usage', {
        initialMemory: initialMemory / (1024 * 1024),
        finalMemory: finalMemory / (1024 * 1024),
        memoryDelta,
        sampleCount,
      });

      // Verify memory usage is reasonable
      expect(memoryDelta).toBeLessThan(200); // Adjust threshold as needed
    });
  });
});
