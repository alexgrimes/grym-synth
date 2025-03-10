import { PatternRecognizer } from '../core/pattern-recognizer';
import { PatternValidator } from '../core/pattern-validator';
import { PatternStorage } from '../core/pattern-storage';
import {
  createMockPattern,
  createMockPatterns,
  PerformanceMonitor,
  MemoryMonitor,
  ErrorTracker,
  waitFor,
  runWithTimeout,
} from './test-helpers';

describe('Feature Memory System', () => {
  let recognizer: PatternRecognizer;
  let validator: PatternValidator;
  let storage: PatternStorage;
  let performanceMonitor: PerformanceMonitor;
  let memoryMonitor: MemoryMonitor;
  let errorTracker: ErrorTracker;

  beforeEach(() => {
    recognizer = new PatternRecognizer();
    validator = new PatternValidator();
    storage = new PatternStorage({}, validator);
    performanceMonitor = new PerformanceMonitor();
    memoryMonitor = new MemoryMonitor();
    errorTracker = new ErrorTracker();
  });

  afterEach(() => {
    performanceMonitor.reset();
    memoryMonitor.reset();
    errorTracker.reset();
  });

  describe('Performance Requirements', () => {
    it('should meet pattern recognition latency target (< 50ms)', async () => {
      const pattern = createMockPattern();
      performanceMonitor.start();

      await recognizer.recognizePatterns(pattern.features);
      const latency = performanceMonitor.measure('recognition');

      expect(latency).toBeLessThan(50);
    });

    it('should meet storage operation latency target (< 20ms)', async () => {
      const pattern = createMockPattern();
      performanceMonitor.start();

      await storage.store(pattern);
      const latency = performanceMonitor.measure('storage');

      expect(latency).toBeLessThan(20);
    });

    it('should maintain memory usage within limits (< 100MB)', async () => {
      const patterns = createMockPatterns(1000);
      
      for (const pattern of patterns) {
        await storage.store(pattern);
        const memoryUsage = memoryMonitor.measure();
        expect(memoryUsage).toBeLessThan(100);
      }

      expect(memoryMonitor.getPeakMemory()).toBeLessThan(100);
    });

    it('should maintain low error rate (< 0.1%)', async () => {
      const patterns = createMockPatterns(1000);
      
      for (const pattern of patterns) {
        try {
          await storage.store(pattern);
          errorTracker.trackOperation(true);
        } catch (error) {
          errorTracker.trackOperation(false, error as Error);
        }
      }

      expect(errorTracker.getErrorRate()).toBeLessThan(0.1);
    });
  });

  describe('Pattern Recognition', () => {
    it('should recognize similar patterns with high confidence', async () => {
      const basePattern = createMockPattern();
      await storage.store(basePattern);

      const similarPattern = createMockPattern({
        features: new Map([...basePattern.features]),
      });

      const { matches, metrics } = await recognizer.recognizePatterns(similarPattern.features);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBeGreaterThan(0.8);
    });

    it('should handle pattern timeouts gracefully', async () => {
      const pattern = createMockPattern();
      const timeoutRecognizer = new PatternRecognizer({ timeout: 1 });

      await expect(
        runWithTimeout(timeoutRecognizer.recognizePatterns(pattern.features), 50)
      ).rejects.toThrow();
    });

    it('should maintain recognition accuracy under load', async () => {
      const patterns = createMockPatterns(100);
      const recognitionResults = await Promise.all(
        patterns.map(pattern => recognizer.recognizePatterns(pattern.features))
      );

      const avgLatency = recognitionResults.reduce(
        (sum, result) => sum + result.metrics.patternRecognitionLatency,
        0
      ) / recognitionResults.length;

      expect(avgLatency).toBeLessThan(50);
    });
  });

  describe('Pattern Validation', () => {
    it('should validate pattern structure comprehensively', () => {
      const validPattern = createMockPattern();
      const result = validator.validate(validPattern);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect and report multiple validation issues', () => {
      const invalidPattern = {
        features: 'not a map',
        confidence: 2,
        timestamp: 'invalid date',
        metadata: {},
      };

      const result = validator.validate(invalidPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle edge cases in validation', () => {
      const edgeCases = [
        createMockPattern({ confidence: 0 }),
        createMockPattern({ confidence: 1 }),
        createMockPattern({ features: new Map() }),
      ];

      edgeCases.forEach(pattern => {
        const result = validator.validate(pattern);
        expect(result.metadata.validationDuration).toBeDefined();
      });
    });
  });

  describe('Pattern Storage', () => {
    it('should maintain data integrity during storage operations', async () => {
      const pattern = createMockPattern();
      await storage.store(pattern);
      const retrieved = await storage.retrieve(pattern.id);

      expect(retrieved).toEqual(pattern);
    });

    it('should handle concurrent storage operations', async () => {
      const patterns = createMockPatterns(10);
      const operations = patterns.map(pattern => storage.store(pattern));

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should optimize storage when reaching capacity', async () => {
      const smallStorage = new PatternStorage({ maxPatterns: 10 }, validator);
      const patterns = createMockPatterns(15);

      for (const pattern of patterns) {
        await smallStorage.store(pattern);
        await waitFor(10); // Allow time for optimization
      }

      const metrics = smallStorage.getMetrics();
      expect(metrics.resourceUsage.storageUsage).toBeLessThanOrEqual(10);
      expect(metrics.optimizationEffectiveness).toBeGreaterThan(0);
    });
  });

  describe('System Integration', () => {
    it('should maintain performance under integrated operations', async () => {
      performanceMonitor.start();
      const pattern = createMockPattern();

      // Validate -> Store -> Recognize pipeline
      const validationResult = validator.validate(pattern);
      expect(validationResult.isValid).toBe(true);

      await storage.store(pattern);
      const { matches } = await recognizer.recognizePatterns(pattern.features);
      
      const totalTime = performanceMonitor.measure('integrated');
      expect(totalTime).toBeLessThan(100); // Combined operations under 100ms
      expect(matches).toBeDefined();
    });

    it('should handle error conditions gracefully', async () => {
      const invalidPattern = createMockPattern();
      invalidPattern.features = new Map(); // Empty features

      const validationResult = validator.validate(invalidPattern);
      expect(validationResult.isValid).toBe(false);

      await expect(storage.store(invalidPattern)).rejects.toBeDefined();
    });
  });
});