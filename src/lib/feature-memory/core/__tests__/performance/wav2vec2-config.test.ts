import { FeatureMemorySystem } from "../../feature-memory-system";
import { FeatureMemoryOptions, ConfigurationUpdate } from "../../types/system";
import {
  TestPatternSet,
  createTestPatternSet,
  measureOperationLatency,
  measureStorageSizes,
  calculateVariance,
  average,
  cleanupTestResources,
} from "./test-helpers";
import { performance } from "perf_hooks";

describe("Wav2Vec2 Feature Memory Configuration Tests", () => {
  let testSet: TestPatternSet;

  beforeAll(async () => {
    testSet = await createTestPatternSet(10);
  }, 30000);

  afterAll(async () => {
    await cleanupTestResources(testSet);
  });

  describe("Dynamic Configuration Tests", () => {
    it("should adapt to different cache sizes", async () => {
      const testCacheSizes = [10, 50, 100, 500];
      const results = new Map<number, number>();

      for (const cacheSize of testCacheSizes) {
        const config: FeatureMemoryOptions = {
          maxPatterns: 1000,
          cacheSize,
          persistenceEnabled: false,
          optimizationInterval: 1000,
        };

        const system = new FeatureMemorySystem(config);

        // Store patterns
        await Promise.all(testSet.patterns.map((p) => system.storePattern(p)));

        // Measure cache hit rate
        const startTime = performance.now();
        let cacheHits = 0;

        for (let i = 0; i < 100; i++) {
          const pattern = testSet.patterns[i % testSet.patterns.length];
          const result = await system.searchPatterns({
            features: pattern.features,
          });
          if (result.metrics.patternRecognitionLatency < 1) {
            // Fast response indicates cache hit
            cacheHits++;
          }
        }

        results.set(cacheSize, cacheHits);
      }

      // Verify cache effectiveness scales with size
      const hitRates = Array.from(results.entries()).map(([size, hits]) => ({
        size,
        hitRate: hits / 100,
      }));

      // Larger caches should have better hit rates
      for (let i = 1; i < hitRates.length; i++) {
        expect(hitRates[i].hitRate).toBeGreaterThanOrEqual(
          hitRates[i - 1].hitRate
        );
      }
    });

    it("should handle optimization interval changes", async () => {
      const configurations: FeatureMemoryOptions[] = [
        {
          maxPatterns: 1000,
          cacheSize: 100,
          persistenceEnabled: false,
          optimizationInterval: 100, // Aggressive optimization
        },
        {
          maxPatterns: 1000,
          cacheSize: 100,
          persistenceEnabled: false,
          optimizationInterval: 5000, // Relaxed optimization
        },
      ];

      const results = await Promise.all(
        configurations.map(async (config) => {
          const system = new FeatureMemorySystem(config);
          const metrics = {
            storageOps: 0,
            avgLatency: 0,
            memoryUsage: [] as number[],
          };

          // Run intensive operations
          const startTime = performance.now();
          for (let i = 0; i < 100; i++) {
            const pattern = testSet.patterns[i % testSet.patterns.length];
            await system.storePattern(pattern);
            metrics.storageOps++;
            metrics.memoryUsage.push(process.memoryUsage().heapUsed);
          }

          metrics.avgLatency =
            (performance.now() - startTime) / metrics.storageOps;

          return {
            optimizationInterval: config.optimizationInterval,
            metrics,
          };
        })
      );

      // Compare results
      const [aggressive, relaxed] = results;

      // Aggressive optimization should have higher latency but more stable memory
      expect(aggressive.metrics.avgLatency).toBeGreaterThan(
        relaxed.metrics.avgLatency
      );

      const aggressiveMemoryVariance = calculateVariance(
        aggressive.metrics.memoryUsage
      );
      const relaxedMemoryVariance = calculateVariance(
        relaxed.metrics.memoryUsage
      );
      expect(aggressiveMemoryVariance).toBeLessThan(relaxedMemoryVariance);
    });

    it("should adapt to persistence configuration changes", async () => {
      const initialConfig: FeatureMemoryOptions = {
        maxPatterns: 1000,
        cacheSize: 100,
        persistenceEnabled: true,
        persistenceBatchSize: 10,
        persistenceInterval: 100,
      };

      const system = new FeatureMemorySystem(initialConfig);

      // Store initial patterns
      await Promise.all(testSet.patterns.map((p) => system.storePattern(p)));

      // Measure baseline performance
      const baselineLatency = await measureOperationLatency(
        system,
        testSet.patterns
      );

      // Change persistence settings
      const configUpdate: ConfigurationUpdate = {
        persistenceBatchSize: 50,
        persistenceInterval: 1000,
      };

      await system.updateConfiguration(configUpdate);

      // Measure updated performance
      const updatedLatency = await measureOperationLatency(
        system,
        testSet.patterns
      );

      // Larger batch size should improve average latency
      expect(updatedLatency.average).toBeLessThan(baselineLatency.average);
    });

    it("should handle compression configuration changes", async () => {
      const initialConfig: FeatureMemoryOptions = {
        maxPatterns: 1000,
        cacheSize: 100,
        persistenceEnabled: true,
        compressionEnabled: false,
      };

      const system = new FeatureMemorySystem(initialConfig);

      // Store patterns without compression
      const uncompressedSizes = await measureStorageSizes(
        system,
        testSet.patterns
      );

      // Enable compression
      await system.updateConfiguration({ compressionEnabled: true });

      // Store patterns with compression
      const compressedSizes = await measureStorageSizes(
        system,
        testSet.patterns
      );

      // Compressed storage should be smaller
      const avgUncompressed = average(uncompressedSizes);
      const avgCompressed = average(compressedSizes);
      expect(avgCompressed).toBeLessThan(avgUncompressed);
    });
  });

  describe("Configuration Edge Cases", () => {
    it("should handle minimum viable configuration", async () => {
      const minConfig: FeatureMemoryOptions = {
        maxPatterns: 10,
        cacheSize: 1,
        persistenceEnabled: false,
      };

      const minSystem = new FeatureMemorySystem(minConfig);

      // System should still function with minimal config
      const pattern = testSet.patterns[0];
      const storeResult = await minSystem.storePattern(pattern);
      expect(storeResult.success).toBe(true);

      const searchResult = await minSystem.searchPatterns({
        features: pattern.features,
      });
      expect(searchResult.success).toBe(true);
    });

    it("should handle configuration updates during operation", async () => {
      const initialConfig: FeatureMemoryOptions = {
        maxPatterns: 1000,
        cacheSize: 100,
        persistenceEnabled: false,
      };

      const system = new FeatureMemorySystem(initialConfig);

      // Start concurrent operations
      const operations = Array(50)
        .fill(0)
        .map(async (_, i) => {
          const pattern = testSet.patterns[i % testSet.patterns.length];

          // Update config while operations are in progress
          if (i === 25) {
            await system.updateConfiguration({
              cacheSize: 50,
              optimizationInterval: 100,
            });
          }

          return system.recognizePattern(pattern.features);
        });

      const results = await Promise.all(operations);
      const successRate =
        results.filter((r) => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.95);
    });
  });
});
