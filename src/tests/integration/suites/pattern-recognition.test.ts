/**
 * Integration Tests for Pattern Recognition Flow
 *
 * Tests the full pattern recognition flow from audio input to feature memory storage.
 */

import { integrationTestFramework } from '../framework';
import { contextManager, ContextItem } from '../../../context';
import { serviceRegistry } from '../../../services';
import { taskRouter } from '../../../orchestration';
import { Logger } from '../../../utils/logger';

const logger = new Logger({ namespace: 'pattern-recognition-tests' });

describe('Pattern Recognition Integration Tests', () => {
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
      name: 'pattern-recognition-tests',
      services: ['wav2vec2', 'gama'],
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

  describe('Audio to Feature Extraction', () => {
    it('should extract features from audio using wav2vec2', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('test-audio-1', {
        duration: 2,
        type: 'sine',
        frequency: 440,
        sampleRate: 16000,
      });

      // Set up test context
      const contextItem: ContextItem = {
        id: 'test-audio-context',
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
          tags: ['integration-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create task
      const task = {
        id: 'feature-extraction-task-1',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        storeResults: true,
        context: {
          tags: ['integration-test'],
        },
      };

      // Execute task and measure performance
      const metrics = await integrationTestFramework.measurePerformance(
        () => integrationTestFramework.executeTask(task),
        { samples: 3, warmupSamples: 1 }
      );

      // Log performance metrics
      logger.info('Feature extraction performance', {
        metrics: integrationTestFramework.formatPerformanceMetrics(metrics),
      });

      // Execute task once more to get the result for validation
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.features).toBeDefined();
      expect(result.metrics).toBeDefined();

      // Verify feature dimensions
      if (result.data.features) {
        expect(result.data.features.length).toBeGreaterThan(0);
      }
    });

    it('should recognize patterns from extracted features', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('test-audio-2', {
        duration: 1,
        type: 'sine',
        frequency: 880, // Different frequency to test pattern differentiation
        sampleRate: 16000,
      });

      // First task: extract features
      const extractionTask = {
        id: 'feature-extraction-task-2',
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: audioSample.data,
        storeResults: true,
        context: {
          tags: ['pattern-recognition-test'],
        },
      };

      const extractionResult = await integrationTestFramework.executeTask(extractionTask);
      expect(extractionResult.status).toBe('success');
      expect(extractionResult.data.features).toBeDefined();

      // Second task: recognize patterns from features
      const recognitionTask = {
        id: 'pattern-recognition-task-1',
        type: 'pattern_recognition',
        modelType: 'gama',
        data: {
          features: extractionResult.data.features,
          source: 'wav2vec2',
        },
        storeResults: true,
        context: {
          tags: ['pattern-recognition-test'],
        },
      };

      // Execute task and measure performance
      const metrics = await integrationTestFramework.measurePerformance(
        () => integrationTestFramework.executeTask(recognitionTask),
        { samples: 3 }
      );

      // Log performance metrics
      logger.info('Pattern recognition performance', {
        metrics: integrationTestFramework.formatPerformanceMetrics(metrics),
      });

      // Execute task once more to get the result for validation
      const result = await integrationTestFramework.executeTask(recognitionTask);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.patterns).toBeDefined();
      expect(result.metrics).toBeDefined();

      // Verify pattern data
      if (result.data.patterns) {
        expect(result.data.patterns.length).toBeGreaterThan(0);
        expect(result.data.patterns[0].confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('End-to-End Pattern Flow', () => {
    it('should process audio through the complete pattern recognition pipeline', async () => {
      // Create test audio sample with multiple frequencies
      const audioSample = integrationTestFramework.createTestAudioSample('test-audio-complex', {
        duration: 3,
        type: 'noise', // Use noise to test more complex pattern recognition
        sampleRate: 16000,
      });

      // Create context with processing parameters
      const contextItem: ContextItem = {
        id: 'e2e-pattern-context',
        type: 'processing_requirements',
        content: {
          sensitivity: 0.7,
          minConfidence: 0.5,
          storePatterns: true,
        },
        timestamp: new Date(),
        metadata: {
          timestamp: new Date(),
          source: 'integration-test',
          priority: 1,
          tags: ['e2e-pattern-test'],
        },
      };
      await contextManager.storeContext(contextItem);

      // Create end-to-end task
      const task = {
        id: 'e2e-pattern-task',
        type: 'audio_pattern_recognition',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          extractionModel: 'wav2vec2',
          recognitionModel: 'gama',
        },
        storeResults: true,
        context: {
          tags: ['e2e-pattern-test'],
        },
      };

      // Execute task
      const result = await integrationTestFramework.executeTask(task);

      // Verify success
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data.patterns).toBeDefined();
      expect(result.metrics).toBeDefined();

      // Verify metrics
      expect(result.metrics.extractionTime).toBeDefined();
      expect(result.metrics.recognitionTime).toBeDefined();
      expect(result.metrics.totalTime).toBeDefined();

      // Verify pattern data
      if (result.data.patterns) {
        expect(result.data.patterns.length).toBeGreaterThan(0);

        // Check pattern structure
        const pattern = result.data.patterns[0];
        expect(pattern.id).toBeDefined();
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.features).toBeDefined();
        expect(pattern.timestamp).toBeDefined();
      }
    });

    it('should handle concurrent pattern recognition requests', async () => {
      // Create multiple test audio samples
      const samples = [
        integrationTestFramework.createTestAudioSample('concurrent-1', { type: 'sine', frequency: 440 }),
        integrationTestFramework.createTestAudioSample('concurrent-2', { type: 'sine', frequency: 880 }),
        integrationTestFramework.createTestAudioSample('concurrent-3', { type: 'noise' }),
      ];

      // Create tasks for each sample
      const tasks = samples.map((sample, index) => ({
        id: `concurrent-pattern-task-${index}`,
        type: 'audio_pattern_recognition',
        data: sample.data,
        parameters: {
          sampleRate: sample.sampleRate,
          extractionModel: 'wav2vec2',
          recognitionModel: 'gama',
        },
        storeResults: false,
      }));

      // Execute tasks concurrently
      const startTime = performance.now();
      const results = await Promise.all(tasks.map(task => integrationTestFramework.executeTask(task)));
      const totalTime = performance.now() - startTime;

      // Verify all tasks succeeded
      expect(results.every(r => r.status === 'success')).toBe(true);

      // Verify all tasks returned patterns
      expect(results.every(r => r.data && r.data.patterns)).toBe(true);

      // Calculate average time per task
      const avgTimePerTask = totalTime / tasks.length;
      logger.info('Concurrent pattern recognition performance', {
        totalTime,
        avgTimePerTask,
        taskCount: tasks.length,
      });

      // Verify reasonable performance (adjust threshold as needed)
      expect(avgTimePerTask).toBeLessThan(5000);
    });
  });

  describe('Pattern Storage and Retrieval', () => {
    it('should store and retrieve patterns from feature memory', async () => {
      // Create test audio sample
      const audioSample = integrationTestFramework.createTestAudioSample('storage-test-audio', {
        duration: 1,
        type: 'sine',
        frequency: 440,
      });

      // Process audio to generate patterns
      const processingTask = {
        id: 'pattern-storage-task',
        type: 'audio_pattern_recognition',
        data: audioSample.data,
        parameters: {
          sampleRate: audioSample.sampleRate,
          extractionModel: 'wav2vec2',
          recognitionModel: 'gama',
        },
        storeResults: true, // Important: store the results
        context: {
          tags: ['storage-test'],
        },
      };

      // Execute task to generate and store patterns
      const processingResult = await integrationTestFramework.executeTask(processingTask);
      expect(processingResult.status).toBe('success');
      expect(processingResult.data.patterns).toBeDefined();
      expect(processingResult.data.patterns.length).toBeGreaterThan(0);

      // Get the pattern ID from the result
      const patternId = processingResult.data.patterns[0].id;

      // Create retrieval task
      const retrievalTask = {
        id: 'pattern-retrieval-task',
        type: 'pattern_retrieval',
        data: {
          patternId,
        },
      };

      // Execute retrieval task
      const retrievalResult = await integrationTestFramework.executeTask(retrievalTask);

      // Verify retrieval success
      expect(retrievalResult.status).toBe('success');
      expect(retrievalResult.data.pattern).toBeDefined();
      expect(retrievalResult.data.pattern.id).toBe(patternId);

      // Verify pattern data integrity
      const originalPattern = processingResult.data.patterns[0];
      const retrievedPattern = retrievalResult.data.pattern;

      expect(retrievedPattern.confidence).toBeCloseTo(originalPattern.confidence, 5);
      expect(retrievedPattern.timestamp).toBeDefined();
      expect(retrievedPattern.features).toBeDefined();
    });

    it('should search for patterns by criteria', async () => {
      // Create and store multiple patterns with different characteristics
      const frequencies = [261.63, 329.63, 392.00]; // C4, E4, G4 (C major chord)

      // Process each frequency to create distinct patterns
      for (let i = 0; i < frequencies.length; i++) {
        const audioSample = integrationTestFramework.createTestAudioSample(`search-test-audio-${i}`, {
          duration: 1,
          type: 'sine',
          frequency: frequencies[i],
          metadata: {
            note: ['C4', 'E4', 'G4'][i],
            frequency: frequencies[i],
          },
        });

        // Process audio to generate patterns
        const processingTask = {
          id: `pattern-search-task-${i}`,
          type: 'audio_pattern_recognition',
          data: audioSample.data,
          parameters: {
            sampleRate: audioSample.sampleRate,
            extractionModel: 'wav2vec2',
            recognitionModel: 'gama',
          },
          storeResults: true,
          context: {
            tags: ['search-test', `note-${['C4', 'E4', 'G4'][i]}`],
          },
        };

        // Execute task to generate and store patterns
        await integrationTestFramework.executeTask(processingTask);
      }

      // Create search task
      const searchTask = {
        id: 'pattern-search-task',
        type: 'pattern_search',
        data: {
          criteria: {
            tags: ['search-test'],
            minConfidence: 0.5,
            limit: 10,
          },
        },
      };

      // Execute search task
      const searchResult = await integrationTestFramework.executeTask(searchTask);

      // Verify search success
      expect(searchResult.status).toBe('success');
      expect(searchResult.data.patterns).toBeDefined();
      expect(searchResult.data.patterns.length).toBeGreaterThanOrEqual(frequencies.length);

      // Verify search with specific tag
      const specificSearchTask = {
        id: 'specific-pattern-search-task',
        type: 'pattern_search',
        data: {
          criteria: {
            tags: ['note-C4'],
            limit: 5,
          },
        },
      };

      const specificSearchResult = await integrationTestFramework.executeTask(specificSearchTask);
      expect(specificSearchResult.status).toBe('success');
      expect(specificSearchResult.data.patterns.length).toBeGreaterThan(0);
      expect(specificSearchResult.data.patterns.every((p: any) =>
        p.metadata && p.metadata.tags && p.metadata.tags.includes('note-C4')
      )).toBe(true);
    });
  });
});
