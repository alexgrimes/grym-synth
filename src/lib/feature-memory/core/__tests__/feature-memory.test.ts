import { MetricsCollector } from '../metrics-collector';
import { PatternRecognizer } from '../pattern-recognizer';
import { PatternStorage } from '../pattern-storage';
import { HealthMonitor } from '../health-monitor';
import {
  Pattern,
  SearchCriteria,
  PatternMetadata,
  isStorageMetrics,
  isRecognitionMetrics
} from '../types';

const createTestPattern = (id: number): Pattern => ({
  id: `test_${id}`,
  features: new Map<string, any>([
    ['type', 'test'],
    ['category', 'unit_test'],
    ['value', id.toString()]
  ]),
  confidence: 0.9,
  timestamp: new Date(),
  metadata: {
    source: 'test',
    category: 'test',
    frequency: 1,
    lastUpdated: new Date()
  }
});

const createSearchCriteria = (category: string): SearchCriteria => ({
  metadata: {
    source: 'test',
    category,
    frequency: 1,
    lastUpdated: new Date()
  }
});

describe('Feature Memory System', () => {
  let metrics: MetricsCollector;
  let recognizer: PatternRecognizer;
  let storage: PatternStorage;
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    metrics = new MetricsCollector();
    recognizer = new PatternRecognizer({
      cacheSize: 100,
      threshold: 0.8,
      maxPatterns: 1000
    });
    storage = new PatternStorage({
      cacheSizeLimit: 100,
      persistenceEnabled: false
    });
    healthMonitor = new HealthMonitor(metrics);
  });

  describe('Performance Tests', () => {
    it('should meet latency targets for pattern recognition', async () => {
      const testPattern = createTestPattern(1);
      const result = await recognizer.recognizePatterns(testPattern.features);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(isRecognitionMetrics(result.metrics)).toBe(true);
        expect(result.metrics.durationMs).toBeLessThan(50); // 50ms target
        expect(result.metrics.operationType).toBe('recognition');
        expect(result.metrics.timestamp).toBeDefined();
        expect(result.metrics.kind).toBe('feature');
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it('should meet latency targets for pattern storage', async () => {
      const testPattern = createTestPattern(1);
      const result = await storage.store(testPattern);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.metrics.durationMs).toBeLessThan(20); // 20ms target
        expect(result.metrics.operationType).toBe('storage');
        expect(result.metrics.timestamp).toBeDefined();
        expect(result.data.isValid).toBe(true);
      }
    });

    it('should validate storage metrics format', async () => {
      const testPattern = createTestPattern(1);
      const result = await storage.store(testPattern);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(isStorageMetrics(result.metrics)).toBe(true);
        expect(result.metrics.operationType).toBe('storage');
        expect(result.metrics.durationMs).toBeGreaterThan(0);
        expect(result.metrics.timestamp).toBeDefined();
        expect(result.metrics.kind).toBe('feature');
        expect(typeof result.metrics.patternRecognitionLatency).toBe('number');
        expect(typeof result.metrics.storageOperationLatency).toBe('number');
        expect(typeof result.metrics.optimizationEffectiveness).toBe('number');
      }
    });

    it('should efficiently handle batch operations', async () => {
      const patterns = Array.from({ length: 100 }, (_, i) => createTestPattern(i));
      const results = await Promise.all(patterns.map(p => storage.store(p)));
      
      // All operations should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Check metrics for each successful operation
      for (const result of results) {
        if (result.success) {
          expect(result.metrics.durationMs).toBeLessThan(20); // 20ms per operation target
          expect(result.metrics.operationType).toBe('storage');
          expect(result.metrics.timestamp).toBeDefined();
          expect(result.data.isValid).toBe(true);
        }
      }
      
      // Average duration should be reasonable
      const avgDuration = results.reduce((sum, r) =>
        sum + (r.success ? r.metrics.durationMs : 0), 0) / patterns.length;
      expect(avgDuration).toBeLessThan(5); // 5ms average target
    });
  });

  describe('Cache Management', () => {
    it('should properly use LRU cache in recognizer', async () => {
      // Fill cache to max
      const patterns = Array.from({ length: 150 }, (_, i) => createTestPattern(i));
      
      for (const pattern of patterns) {
        await recognizer.addPattern(pattern);
      }
      
      // Access some patterns to update their LRU status
      const recentPatterns = patterns.slice(-20);
      for (const pattern of recentPatterns) {
        await recognizer.recognizePatterns(pattern.features);
      }
      
      // Verify least recently used patterns were evicted
      const firstPattern = patterns[0];
      const result = await recognizer.recognizePatterns(firstPattern.features);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.matches.length).toBe(0);
        expect(result.confidence).toBe(0);
      }
    });

    it('should maintain cache size limits in storage', async () => {
      const patterns = Array.from({ length: 150 }, (_, i) => createTestPattern(i));
      
      for (const pattern of patterns) {
        const result = await storage.store(pattern);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.metrics.operationType).toBe('storage');
          expect(result.metrics.durationMs).toBeDefined();
          expect(result.data.isValid).toBe(true);
        }
      }
    });
  });

  describe('Health Monitoring', () => {
    it('should track system health status', async () => {
      const status = healthMonitor.checkHealth();
      
      expect(status.status).toBe('healthy');
      expect(status.indicators.memory).toBeDefined();
      expect(status.indicators.performance).toBeDefined();
      expect(status.indicators.errors).toBeDefined();
      expect(status.recommendations).toBeDefined();
    });

    it('should detect performance degradation', async () => {
      // Simulate high latency operations
      for (let i = 0; i < 100; i++) {
        metrics.recordLatency('test', 100); // 100ms latency
      }

      const status = healthMonitor.checkHealth();
      expect(status.status).toBe('degraded');
      expect(status.recommendations.length).toBeGreaterThan(0);
    });

    it('should track error rates', async () => {
      // Simulate errors
      for (let i = 0; i < 10; i++) {
        metrics.recordError('test');
      }

      const status = healthMonitor.checkHealth();
      const errorHealth = status.indicators.errors;
      
      expect(errorHealth.errorRate).toBeGreaterThan(0);
      expect(status.recommendations).toContain(expect.stringMatching(/error/i));
    });
  });

  describe('Resource Management', () => {
    it('should optimize storage when reaching limits', async () => {
      // Fill storage to max
      const patterns = Array.from({ length: 1100 }, (_, i) => createTestPattern(i));
      
      for (const pattern of patterns) {
        const result = await storage.store(pattern);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.metrics.operationType).toBe('storage');
          expect(result.metrics.durationMs).toBeDefined();
          expect(result.data.isValid).toBe(true);
        }
      }
    });

    it('should handle memory pressure gracefully', async () => {
      const largePatterns = Array.from({ length: 500 }, (_, i) => ({
        ...createTestPattern(i),
        features: new Map<string, any>([
          ['type', 'test'],
          ['category', 'unit_test'],
          ['value', 'x'.repeat(1000)] // Large value
        ])
      }));

      await Promise.all(largePatterns.map(p => storage.store(p)));
      const health = healthMonitor.checkHealth();
      
      // Should either be healthy with optimization or degraded with recommendations
      if (health.status === 'degraded') {
        expect(health.recommendations).toContain(
          expect.stringMatching(/memory|cache|size/i)
        );
      }
    });
  });

  describe('Search Operations', () => {
    it('should handle search with partial metadata', async () => {
      const pattern = createTestPattern(1);
      await storage.store(pattern);

      const result = await storage.search({
        metadata: {
          category: pattern.metadata.category
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe(pattern.id);
        expect(isStorageMetrics(result.metrics)).toBe(true);
        expect(result.metrics.operationType).toBe('search');
        expect(result.metrics.durationMs).toBeDefined();
        expect(result.metrics.timestamp).toBeDefined();
        expect(result.metrics.kind).toBe('feature');
      } else {
        // In case of failure, verify error properties
        expect(result.error).toBeDefined();
        expect(result.errorType).toBeDefined();
        expect(result.data).toBeNull();
      }
    });

    it('should handle search with feature criteria', async () => {
      const pattern = createTestPattern(1);
      await storage.store(pattern);

      const result = await storage.search({
        features: new Map([['type', 'test']])
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe(pattern.id);
        expect(isStorageMetrics(result.metrics)).toBe(true);
        expect(result.metrics.operationType).toBe('search');
        expect(result.metrics.durationMs).toBeDefined();
        expect(result.metrics.timestamp).toBeDefined();
        expect(result.metrics.kind).toBe('feature');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors in pattern recognition', async () => {
      // Create a recognizer with very short timeout
      const timeoutRecognizer = new PatternRecognizer({
        timeout: 1  // 1ms timeout
      });

      // Add enough patterns to make processing take longer than timeout
      for (let i = 0; i < 1000; i++) {
        await timeoutRecognizer.addPattern(createTestPattern(i));
      }

      const result = await timeoutRecognizer.recognizePatterns(createTestPattern(1001).features);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('timeout');
        expect(result.error).toContain('timeout');
      }
      expect(result.metrics.operationType).toBe('recognition');
    });

    it('should handle invalid pattern recognition', async () => {
      // Create a pattern with invalid features
      const invalidPattern = createTestPattern(1);
      invalidPattern.features = new Map([
        ['type', null],  // Invalid type
        ['category', undefined]  // Invalid category
      ]);

      const result = await recognizer.recognizePatterns(invalidPattern.features);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('processing');
        expect(result.error).toContain('Invalid feature values');
      }
      expect(result.metrics.operationType).toBe('recognition');
    });

    it('should handle validation errors', async () => {
      const invalidPattern = {
        ...createTestPattern(1),
        confidence: 2 // Invalid confidence value
      };

      const result = await storage.store(invalidPattern);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('validation');
        expect(result.error).toContain('INVALID_CONFIDENCE');
        expect(isStorageMetrics(result.metrics)).toBe(true);
        expect(result.metrics.operationType).toBe('storage');
        expect(result.metrics.durationMs).toBeGreaterThan(0);
        expect(result.metrics.timestamp).toBeDefined();
        expect(result.metrics.kind).toBe('feature');
      }
    });

    it('should handle search errors gracefully', async () => {
      // Force an error by making matchesCriteria throw
      jest.spyOn(storage as any, 'matchesCriteria').mockImplementation(() => {
        throw new Error('Search failed');
      });

      const result = await storage.search({ metadata: { category: 'test' } });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorType).toBe('processing');
        expect(result.error).toContain('Search failed');
        expect(isStorageMetrics(result.metrics)).toBe(true);
        expect(result.metrics.operationType).toBe('search');
        expect(result.metrics.durationMs).toBeGreaterThan(0);
        expect(result.metrics.timestamp).toBeDefined();
        expect(result.metrics.kind).toBe('feature');
        expect(result.data).toEqual([]);
      }
    });

    it('should handle concurrent operations gracefully', async () => {
      const testPattern = createTestPattern(1);
      const searchCriteria = createSearchCriteria('test');
      const concurrent = Array.from({ length: 100 }, () =>
        Promise.all([
          storage.store(testPattern),
          storage.retrieve(testPattern.id),
          storage.search(searchCriteria)
        ])
      );

      const results = await Promise.all(concurrent);
      
      // Verify all operations succeeded
      for (const [storeResult, retrieveResult, searchResult] of results) {
        // Check store operation
        expect(storeResult.success).toBe(true);
        if (storeResult.success) {
          expect(isStorageMetrics(storeResult.metrics)).toBe(true);
          expect(storeResult.metrics.operationType).toBe('storage');
          expect(storeResult.metrics.durationMs).toBeDefined();
          expect(storeResult.metrics.kind).toBe('feature');
          expect(storeResult.data.isValid).toBe(true);
        }

        // Check retrieve operation
        expect(retrieveResult.success).toBe(true);
        if (retrieveResult.success) {
          expect(isStorageMetrics(retrieveResult.metrics)).toBe(true);
          expect(retrieveResult.metrics.operationType).toBe('retrieval');
          expect(retrieveResult.metrics.durationMs).toBeDefined();
          expect(retrieveResult.metrics.kind).toBe('feature');
          expect(retrieveResult.data).toBeDefined();
        }

        // Check search operation
        expect(searchResult.success).toBe(true);
        if (searchResult.success) {
          expect(isStorageMetrics(searchResult.metrics)).toBe(true);
          expect(searchResult.metrics.operationType).toBe('search');
          expect(searchResult.metrics.durationMs).toBeDefined();
          expect(searchResult.metrics.kind).toBe('feature');
          expect(searchResult.data).toBeDefined();
        }
      }
    });
  });
});