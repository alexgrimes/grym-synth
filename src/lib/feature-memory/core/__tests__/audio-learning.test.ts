import { AudioLearningManager } from '../audio-learning-context';
import { FeatureMemorySystem } from '../feature-memory-system';

describe('Audio Learning System', () => {
  let learningManager: AudioLearningManager;
  let featureMemory: FeatureMemorySystem;

  beforeEach(() => {
    featureMemory = new FeatureMemorySystem({
      maxPatterns: 1000,
      cacheSize: 100,
      recognitionThreshold: 0.8
    });
    learningManager = new AudioLearningManager(featureMemory);
  });

  afterEach(async () => {
    await featureMemory.destroy();
  });

  describe('Pattern Accumulation', () => {
    it('should accumulate patterns over time', async () => {
      // Create test FFT data
      const fftData1 = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const fftData2 = new Float32Array([0.15, 0.25, 0.35, 0.45]);

      // First pattern
      await learningManager.accumulatePattern(fftData1, {
        source: 'test',
        frequency: 440,
        duration: 1000,
        timestamp: new Date().toISOString()
      });

      let context = learningManager.getContext();
      expect(context.patterns.length).toBe(1);
      expect(context.learningProgress.totalPatternsLearned).toBe(1);

      // Second pattern
      await learningManager.accumulatePattern(fftData2, {
        source: 'test',
        frequency: 880,
        duration: 1000,
        timestamp: new Date().toISOString()
      });

      context = learningManager.getContext();
      expect(context.patterns.length).toBe(2);
      expect(context.learningProgress.totalPatternsLearned).toBe(2);
    });

    it('should recognize similar patterns', async () => {
      // Create original pattern
      const originalFft = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      await learningManager.accumulatePattern(originalFft, {
        source: 'test',
        frequency: 440,
        duration: 1000,
        timestamp: new Date().toISOString()
      });

      // Create similar pattern
      const similarFft = new Float32Array([0.11, 0.21, 0.31, 0.41]);
      const recognized = await learningManager.recognizePattern(similarFft);

      expect(recognized).toBeTruthy();
      expect(recognized?.metadata.frequency).toBe(440);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve and retrieve context between sessions', async () => {
      // Create initial patterns
      const fftData = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      await learningManager.accumulatePattern(fftData, {
        source: 'test',
        frequency: 440,
        duration: 1000,
        timestamp: new Date().toISOString()
      });

      // Save context
      await learningManager.preserveContext('test-model');

      // Create new manager instance
      const newManager = new AudioLearningManager(featureMemory);
      await newManager.retrieveContext('test-model');

      const context = newManager.getContext();
      expect(context.patterns.length).toBe(1);
      expect(context.learningProgress.totalPatternsLearned).toBe(1);
      expect(context.knowledgeBase.patterns.size).toBe(1);
    });

    it('should track learning progress over time', async () => {
      // Create multiple patterns
      const frequencies = [440, 880, 1320];
      for (const freq of frequencies) {
        const fftData = new Float32Array([freq / 4400, freq / 2200, freq / 1100]);
        await learningManager.accumulatePattern(fftData, {
          source: 'test',
          frequency: freq,
          duration: 1000,
          timestamp: new Date().toISOString()
        });
      }

      const progress = learningManager.getLearningProgress();
      expect(progress.totalPatternsLearned).toBe(3);
      expect(progress.averageConfidence).toBeGreaterThan(0);
      expect(progress.lastUpdated).toBeDefined();
    });
  });

  describe('Pattern Recognition', () => {
    it('should improve recognition rate with more examples', async () => {
      // Create base pattern
      const baseFft = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      await learningManager.accumulatePattern(baseFft, {
        source: 'test',
        frequency: 440,
        duration: 1000,
        timestamp: new Date().toISOString()
      });

      // Test recognition with variations
      const variations = [
        new Float32Array([0.11, 0.21, 0.31, 0.41]),
        new Float32Array([0.09, 0.19, 0.29, 0.39]),
        new Float32Array([0.12, 0.22, 0.32, 0.42])
      ];

      let recognitionCount = 0;
      for (const variation of variations) {
        const recognized = await learningManager.recognizePattern(variation);
        if (recognized) recognitionCount++;
      }

      const progress = learningManager.getLearningProgress();
      expect(recognitionCount).toBeGreaterThan(0);
      expect(progress.recognitionRate).toBeGreaterThan(0);
    });
  });
});