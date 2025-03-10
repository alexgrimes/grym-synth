import {
  FeatureMemorySystem,
  Pattern,
  FeatureValue,
  SearchResult,
  PatternMatchResult,
  StorageStats,
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
  average,
  calculateVariance,
} from "./test-helpers";
import { performance } from "perf_hooks";

// TDR Requirements
const TDR_REQUIREMENTS = {
  patternRecognitionLatency: 50, // ms
  storageOperationLatency: 20, // ms
  memoryOverhead: 100, // MB
  cpuUsage: 10, // %
  errorRate: 0.001, // 0.1%
  minThroughput: 100, // ops/sec
};

interface BenchmarkMetrics {
  latency: LatencyMeasurement;
  memoryUsage: {
    start: number;
    peak: number;
    end: number;
    growth: number;
  };
  operationStats: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    throughput: number;
    hitRate?: number;
  };
  errorRate: number;
}

describe("Wav2Vec2 Feature Memory Benchmarks", () => {
  let testSet: TestPatternSet;
  let system: FeatureMemorySystem;

  const runOperationBenchmark = async (
    operation: (pattern: Pattern) => Promise<any>,
    iterations: number = 1000
  ): Promise<BenchmarkMetrics> => {
    const startStats = collectMemoryStats();
    let peakMemory = startStats.heapUsed;
    const latencies: number[] = [];
    let successfulOps = 0;
    let failedOps = 0;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const pattern = testSet.patterns[i % testSet.patterns.length];
      const start = performance.now();
      try {
        await operation(pattern);
        latencies.push(performance.now() - start);
        successfulOps++;
      } catch (error) {
        failedOps++;
      }
      peakMemory = Math.max(peakMemory, collectMemoryStats().heapUsed);
    }

    const endStats = collectMemoryStats();
    const duration = performance.now() - startTime;

    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);

    const stats = await system.getStats();
    const hitRate = (stats as StorageStats & { cacheHitRate?: number })
      .cacheHitRate;

    return {
      latency: {
        average: average(latencies),
        max: Math.max(...latencies),
        min: Math.min(...latencies),
        p95: latencies[p95Index],
        samples: latencies,
      },
      memoryUsage: {
        start: startStats.heapUsed,
        peak: peakMemory,
        end: endStats.heapUsed,
        growth: endStats.heapUsed - startStats.heapUsed,
      },
      operationStats: {
        totalOperations: iterations,
        successfulOperations: successfulOps,
        failedOperations: failedOps,
        throughput: iterations / (duration / 1000),
        hitRate,
      },
      errorRate: failedOps / iterations,
    };
  };

  beforeAll(async () => {
    testSet = await createTestPatternSet(100);
  }, 60000);

  afterAll(async () => {
    await cleanupTestResources(testSet);
  });

  describe("Core Operation Benchmarks", () => {
    beforeEach(() => {
      system = new FeatureMemorySystem({
        maxPatterns: 10000,
        cacheSize: 1000,
        persistenceEnabled: false,
      });
    });

    afterEach(async () => {
      await system.dispose();
    });

    it("should meet pattern recognition latency requirements", async () => {
      const metrics = await runOperationBenchmark(async (pattern: Pattern) =>
        system.recognizePattern(pattern.features)
      );

      expect(metrics.latency.average).toBeLessThan(
        TDR_REQUIREMENTS.patternRecognitionLatency
      );
      expect(metrics.latency.p95).toBeLessThan(
        TDR_REQUIREMENTS.patternRecognitionLatency * 1.5
      );
      expect(metrics.errorRate).toBeLessThan(TDR_REQUIREMENTS.errorRate);
      expect(metrics.operationStats.throughput).toBeGreaterThan(
        TDR_REQUIREMENTS.minThroughput
      );
    });

    it("should meet storage operation latency requirements", async () => {
      const metrics = await runOperationBenchmark(async (pattern: Pattern) =>
        system.storePattern(pattern)
      );

      expect(metrics.latency.average).toBeLessThan(
        TDR_REQUIREMENTS.storageOperationLatency
      );
      expect(metrics.latency.p95).toBeLessThan(
        TDR_REQUIREMENTS.storageOperationLatency * 1.5
      );
      expect(metrics.memoryUsage.growth / (1024 * 1024)).toBeLessThan(
        TDR_REQUIREMENTS.memoryOverhead
      );
    });

    it("should maintain performance under sustained load", async () => {
      const results = await runStressTest(system, testSet.patterns, 30000, 20);

      expect(results.latencies.average).toBeLessThan(
        TDR_REQUIREMENTS.patternRecognitionLatency
      );
      expect(results.successRate).toBeGreaterThan(
        1 - TDR_REQUIREMENTS.errorRate
      );
      expect(results.errorRate).toBeLessThan(TDR_REQUIREMENTS.errorRate);

      const memoryGrowthMB =
        (results.memoryUsage.peak - results.memoryUsage.start) / (1024 * 1024);
      expect(memoryGrowthMB).toBeLessThan(TDR_REQUIREMENTS.memoryOverhead);
    });
  });

  describe("Cache Efficiency Benchmarks", () => {
    it("should demonstrate effective cache utilization", async () => {
      const cacheSizes = [100, 500, 1000, 5000];
      const results = new Map<number, BenchmarkMetrics>();

      for (const size of cacheSizes) {
        system = new FeatureMemorySystem({
          maxPatterns: 10000,
          cacheSize: size,
          persistenceEnabled: false,
        });

        // Warm up cache
        await Promise.all(
          testSet.patterns.map((p: Pattern) => system.storePattern(p))
        );

        // Run benchmark
        const metrics = await runOperationBenchmark(async (pattern: Pattern) =>
          system.recognizePattern(pattern.features)
        );

        results.set(size, metrics);
        await system.dispose();
      }

      // Verify cache size impact
      const latencies = Array.from(results.values()).map(
        (m) => m.latency.average
      );
      const variance = calculateVariance(latencies);

      expect(variance).toBeLessThan(
        TDR_REQUIREMENTS.patternRecognitionLatency / 2
      );

      const hitRates = Array.from(results.values()).map(
        (m) => m.operationStats.hitRate || 0
      );
      for (let i = 1; i < hitRates.length; i++) {
        expect(hitRates[i]).toBeGreaterThanOrEqual(hitRates[i - 1]);
      }
    });
  });

  describe("Resource Utilization", () => {
    it("should maintain efficient resource usage over time", async () => {
      system = new FeatureMemorySystem({
        maxPatterns: 10000,
        cacheSize: 1000,
        persistenceEnabled: false,
      });

      const metrics: BenchmarkMetrics[] = [];
      const intervals = [0, 1000, 5000, 10000];

      for (const interval of intervals) {
        if (interval > 0) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }

        const result = await runOperationBenchmark(
          async (pattern: Pattern) => system.recognizePattern(pattern.features),
          100
        );
        metrics.push(result);
      }

      const avgLatencies = metrics.map((m) => m.latency.average);
      const latencyVariance = calculateVariance(avgLatencies);
      expect(latencyVariance).toBeLessThan(
        TDR_REQUIREMENTS.patternRecognitionLatency / 4
      );

      const memoryGrowth =
        metrics[metrics.length - 1].memoryUsage.end -
        metrics[0].memoryUsage.start;
      expect(memoryGrowth / (1024 * 1024)).toBeLessThan(
        TDR_REQUIREMENTS.memoryOverhead
      );

      await system.dispose();
    });
  });
});
