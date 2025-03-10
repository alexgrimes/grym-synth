import { AudioProcessingManager, AudioFile } from '../audio-processing-manager';
import { ProjectManager } from '../project-manager';
import { ModelHealthMonitor } from '../model-health-monitor';
import { MetricsCollector } from '../metrics-collector';
import { FeatureMemorySystem } from '../feature-memory-system';

describe('Audio Processing Integration', () => {
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
    await projectManager.initializeModel('verification', { 
      type: 'analysis',
      memoryRequirement: 100 * 1024 * 1024 
    });
  });

  describe('Pattern Learning', () => {
    it('should learn patterns from processed audio', async () => {
      const testFile: AudioFile = {
        id: 'test-1',
        path: '/test/audio1.wav',
        size: 1024 * 1024,
        format: 'wav'
      };

      const result = await audioManager.processAudio(testFile);

      expect(result.success).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.learningMetrics).toBeDefined();
      expect(result.learningMetrics?.knownPatternsCount).toBeGreaterThan(0);
    });

    it('should recognize similar patterns across files', async () => {
      const audioFiles = [
        {
          id: 'similar-1',
          path: '/test/similar1.wav',
          size: 1024 * 1024,
          format: 'wav'
        },
        {
          id: 'similar-2',
          path: '/test/similar2.wav',
          size: 1024 * 1024,
          format: 'wav'
        }
      ];

      // Process first file
      const result1 = await audioManager.processAudio(audioFiles[0]);
      expect(result1.success).toBe(true);
      expect(result1.learningMetrics?.knownPatternsCount).toBe(1);

      // Process second file
      const result2 = await audioManager.processAudio(audioFiles[1]);
      expect(result2.success).toBe(true);
      expect(result2.learningMetrics?.patternRecognitionRate).toBeGreaterThan(0);
    });

    it('should improve pattern recognition rate over time', async () => {
      const testFiles = Array(5).fill(0).map((_, i) => ({
        id: `learning-${i}`,
        path: `/test/audio${i}.wav`,
        size: 1024 * 1024,
        format: 'wav'
      }));

      const results = await audioManager.processBatch(testFiles);
      
      const initialRate = results[0].learningMetrics?.patternRecognitionRate || 0;
      const finalRate = results[results.length - 1].learningMetrics?.patternRecognitionRate || 0;
      
      expect(finalRate).toBeGreaterThan(initialRate);
    });
  });

  describe('Resource Management', () => {
    it('should handle resource pressure during learning', async () => {
      // Create a large file that will stress the system
      const largeFile: AudioFile = {
        id: 'large-1',
        path: '/test/large.wav',
        size: 500 * 1024 * 1024, // 500MB
        format: 'wav'
      };

      // Mock resource pressure
      jest.spyOn(healthMonitor, 'checkModelHealth').mockImplementationOnce(async () => ({
        resources: {
          memoryAvailable: 100 * 1024 * 1024, // Only 100MB available
          cpuAvailable: 20,
          activeModels: 2
        },
        orchestration: {
          status: 'degraded',
          activeHandoffs: 1,
          queueDepth: 4
        },
        canAcceptTasks: false
      }));

      await expect(audioManager.processAudio(largeFile))
        .rejects.toThrow('System cannot accept new tasks');
    });
  });

  describe('System Integration', () => {
    it('should maintain learning state during batch processing', async () => {
      const testFiles = Array(3).fill(0).map((_, i) => ({
        id: `batch-${i}`,
        path: `/test/audio${i}.wav`,
        size: 1024 * 1024,
        format: 'wav'
      }));

      const results = await audioManager.processBatch(testFiles);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.patterns.length).toBeGreaterThan(0);
        expect(result.learningMetrics).toBeDefined();
      });

      // Verify learning progress
      const lastResult = results[results.length - 1];
      expect(lastResult.learningMetrics?.knownPatternsCount).toBeGreaterThanOrEqual(1);
      expect(lastResult.learningMetrics?.averageConfidence).toBeGreaterThan(0);
    });
  });
});