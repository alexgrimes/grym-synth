import { AudioProcessingManager } from '../audio-processing-manager';
import { ProjectManager } from '../project-manager';
import { ModelHealthMonitor } from '../model-health-monitor';
import { MetricsCollector } from '../metrics-collector';
import { FeatureMemorySystem } from '../feature-memory-system';

describe('Audio Learning Integration', () => {
  let audioManager: AudioProcessingManager;
  let projectManager: ProjectManager;
  let healthMonitor: ModelHealthMonitor;
  let metricsCollector: MetricsCollector;
  let featureMemory: FeatureMemorySystem;

  beforeEach(async () => {
    metricsCollector = new MetricsCollector();
    healthMonitor = new ModelHealthMonitor(metricsCollector, undefined, {
      maxActiveModels: 3,
      maxQueueDepth: 5,
      minAvailableMemory: 256 * 1024 * 1024
    });

    jest.spyOn(healthMonitor, 'checkModelHealth').mockResolvedValue({
      resources: {
        memoryAvailable: 512 * 1024 * 1024,
        cpuAvailable: 70,
        activeModels: 1
      },
      orchestration: {
        status: 'available',
        activeHandoffs: 0,
        queueDepth: 0
      },
      canAcceptTasks: true
    });

    featureMemory = new FeatureMemorySystem();
    projectManager = new ProjectManager(featureMemory, healthMonitor);
    audioManager = new AudioProcessingManager(projectManager, healthMonitor, featureMemory);

    await projectManager.initializeModel('audio', { 
      type: 'processing',
      memoryRequirement: 100 * 1024 * 1024 
    });

    await projectManager.initializeModel('pattern', { 
      type: 'analysis',
      memoryRequirement: 150 * 1024 * 1024 
    });
  });

  describe('Pattern Learning Lifecycle', () => {
    it('should accumulate and recognize patterns over multiple processing runs', async () => {
      // Create test audio data
      const createTestData = (frequency: number) => ({
        id: `test-${frequency}`,
        path: `/test/audio-${frequency}.wav`,
        size: 1024 * 1024,
        format: 'wav'
      });

      // First processing run
      const result1 = await audioManager.processAudio(createTestData(440));
      expect(result1.success).toBe(true);
      expect(result1.patterns.length).toBeGreaterThan(0);
      expect(result1.learningMetrics?.knownPatternsCount).toBe(1);
      expect(result1.learningMetrics?.patternRecognitionRate).toBe(0);

      // Process similar audio - should recognize patterns
      const result2 = await audioManager.processAudio(createTestData(442)); // Slightly different frequency
      expect(result2.success).toBe(true);
      expect(result2.learningMetrics?.patternRecognitionRate).toBeGreaterThan(0);

      // Process different audio - should learn new patterns
      const result3 = await audioManager.processAudio(createTestData(880));
      expect(result3.success).toBe(true);
      expect(result3.learningMetrics?.knownPatternsCount || 0).toBeGreaterThan(
        result1.learningMetrics?.knownPatternsCount || 0
      );
    });

    it('should maintain learning state between sessions', async () => {
      const testData = {
        id: 'test-session',
        path: '/test/audio-session.wav',
        size: 1024 * 1024,
        format: 'wav'
      };

      // Initial processing
      const result1 = await audioManager.processAudio(testData);
      expect(result1.success).toBe(true);
      const initialPatterns = result1.learningMetrics?.knownPatternsCount || 0;

      // Create new manager instance but keep feature memory
      const newManager = new AudioProcessingManager(projectManager, healthMonitor, featureMemory);
      const result2 = await newManager.processAudio(testData);

      // Should retain knowledge from previous session
      expect(result2.learningMetrics?.knownPatternsCount || 0).toBeGreaterThanOrEqual(initialPatterns);
      expect(result2.learningMetrics?.patternRecognitionRate || 0).toBeGreaterThan(0);
    });

    it('should handle concurrent audio processing while maintaining learning state', async () => {
      const audioFiles = [440, 880, 1320].map(freq => ({
        id: `test-${freq}`,
        path: `/test/audio-${freq}.wav`,
        size: 1024 * 1024,
        format: 'wav'
      }));

      // Process files concurrently
      const results = await Promise.all(audioFiles.map(file => 
        audioManager.processAudio(file)
      ));

      // Verify all processing succeeded
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.patterns.length).toBeGreaterThan(0);
      });

      // Verify learning progress
      const finalResult = results[results.length - 1];
      expect(finalResult.learningMetrics?.knownPatternsCount || 0).toBeGreaterThanOrEqual(results.length);
      expect(finalResult.learningMetrics?.averageConfidence || 0).toBeGreaterThan(0);
    });

    it('should maintain system health during learning', async () => {
      const iterations = 5;
      const results = [];

      // Process multiple files while monitoring health
      for (let i = 0; i < iterations; i++) {
        const result = await audioManager.processAudio({
          id: `health-test-${i}`,
          path: `/test/audio-${i}.wav`,
          size: 1024 * 1024,
          format: 'wav'
        });
        results.push(result);

        // Verify system health after each processing
        const health = await healthMonitor.checkModelHealth();
        expect(health.canAcceptTasks).toBe(true);
        expect(health.orchestration.status).not.toBe('unavailable');
      }

      // Verify learning progress maintained throughout
      const finalResult = results[results.length - 1];
      expect(finalResult.learningMetrics?.knownPatternsCount || 0).toBeGreaterThanOrEqual(iterations);
      expect(finalResult.success).toBe(true);
    });
  });
});