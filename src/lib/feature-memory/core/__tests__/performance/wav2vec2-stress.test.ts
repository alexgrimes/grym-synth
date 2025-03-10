import {
  FeatureMemorySystem,
  Pattern,
  FeatureValue,
  SearchResult,
  PatternMatchResult,
  FeatureExtractionResult,
} from "../../../index";
import {
  TestPatternSet,
  createTestPatternSet,
  measureOperationLatency,
  collectMemoryStats,
  runStressTest,
  cleanupTestResources,
  LatencyMeasurement,
  StressTestResults,
} from "./test-helpers";
import { performance } from "perf_hooks";

const PERFORMANCE_THRESHOLDS = {
  maxLatency: 50, // ms
  p95Latency: 30, // ms
  minSuccessRate: 0.99,
  maxErrorRate: 0.001,
  maxMemoryGrowth: 100 * 1024 * 1024, // 100MB
};

describe("Wav2Vec2 Feature Memory Stress Tests", () => {
  let testSet: TestPatternSet;

  beforeAll(async () => {
    testSet = await createTestPatternSet(100); // Create larger test set for stress testing
  }, 60000);

  afterAll(async () => {
    await cleanupTestResources(testSet);
  });

  describe("Memory Pressure Tests", () => {
    it("should handle large pattern sets without memory leaks", async () => {
      const system = new FeatureMemorySystem({
        maxPatterns: 10000,
        cacheSize: 1000,
        persistenceEnabled: false,
      });

      const initialMemory = collectMemoryStats();
      const memorySnapshots: number[] = [];

      // Load patterns in batches
      const BATCH_SIZE = 100;
      const TOTAL_PATTERNS = 5000;

      for (let i = 0; i < TOTAL_PATTERNS; i += BATCH_SIZE) {
        const patterns = await Promise.all(
          Array(BATCH_SIZE)
            .fill(0)
            .map(async (_, j) => {
              const noise = Math.random() * 0.1;
              const audio = {
                ...testSet.audioBuffer,
                data: new Float32Array(
                  testSet.audioBuffer.data.map((x) => x * (1 + noise))
                ),
              };
              const result = await testSet.adapter.extractFeatures(audio);
              return testSet.adapter.createPattern(result.features);
            })
        );

        await Promise.all(patterns.map((p) => system.storePattern(p)));
        memorySnapshots.push(
          collectMemoryStats().heapUsed - initialMemory.heapUsed
        );

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Verify memory growth is bounded
      const maxMemoryGrowth = Math.max(...memorySnapshots);
      expect(maxMemoryGrowth).toBeLessThan(
        PERFORMANCE_THRESHOLDS.maxMemoryGrowth
      );

      await system.dispose();
    }, 300000);
  });

  describe("High Concurrency Tests", () => {
    it("should handle high concurrent operation load", async () => {
      const system = new FeatureMemorySystem({
        maxPatterns: 10000,
        cacheSize: 1000,
        persistenceEnabled: false,
      });

      // Load initial patterns
      await Promise.all(testSet.patterns.map((p) => system.storePattern(p)));

      const results = await runStressTest(
        system,
        testSet.patterns,
        60000, // 1 minute
        50 // 50 concurrent operations
      );

      // Verify performance meets thresholds
      expect(results.latencies.max).toBeLessThan(
        PERFORMANCE_THRESHOLDS.maxLatency
      );
      expect(results.latencies.p95).toBeLessThan(
        PERFORMANCE_THRESHOLDS.p95Latency
      );
      expect(results.successRate).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.minSuccessRate
      );
      expect(results.errorRate).toBeLessThan(
        PERFORMANCE_THRESHOLDS.maxErrorRate
      );

      await system.dispose();
    }, 120000);
  });

  describe("Recovery and Resilience Tests", () => {
    it("should recover from simulated system pressure", async () => {
      const system = new FeatureMemorySystem({
        maxPatterns: 1000,
        cacheSize: 100,
        persistenceEnabled: false,
      });

      const pressureTest = async (): Promise<boolean> => {
        const largeArrays: Float32Array[] = [];
        const startMemory = collectMemoryStats();

        try {
          // Create memory pressure
          for (let i = 0; i < 100; i++) {
            largeArrays.push(new Float32Array(1024 * 1024)); // 4MB each

            if (i % 10 === 0) {
              const pattern =
                testSet.patterns[
                  Math.floor(Math.random() * testSet.patterns.length)
                ];
              await system.recognizePattern(pattern.features);
            }
          }
        } catch (error) {
          // Expected to potentially run out of memory
        }

        // Clear memory pressure
        largeArrays.length = 0;
        if (global.gc) {
          global.gc();
        }

        // Verify system recovers
        const afterMemory = collectMemoryStats();
        const memoryRecovered =
          afterMemory.heapUsed - startMemory.heapUsed <
          PERFORMANCE_THRESHOLDS.maxMemoryGrowth;

        const pattern = testSet.patterns[0];
        const result = await system.recognizePattern(pattern.features);
        return result.success && memoryRecovered;
      };

      // Run pressure test multiple times
      const recoveryResults = await Promise.all(
        Array(5)
          .fill(0)
          .map(() => pressureTest())
      );

      // System should recover each time
      expect(recoveryResults.every((success) => success)).toBe(true);

      await system.dispose();
    });

    it("should handle rapid feature extraction requests", async () => {
      const system = new FeatureMemorySystem({
        maxPatterns: 1000,
        cacheSize: 100,
        persistenceEnabled: false,
      });

      const startTime = performance.now();
      const operations = Array(100)
        .fill(0)
        .map(async (_, i) => {
          const pattern = testSet.patterns[i % testSet.patterns.length];
          return system.recognizePattern(pattern.features);
        });

      const results = await Promise.all(operations);
      const duration = performance.now() - startTime;
      const avgLatency = duration / results.length;

      // Verify performance under load
      expect(avgLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.maxLatency);
      expect(results.filter((r) => r.success).length).toBe(results.length);

      await system.dispose();
    });
  });
});
