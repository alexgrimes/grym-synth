import { FeatureMemorySystem, Pattern, FeatureValue } from "../../../index";
import {
  TestPatternSet,
  createTestPatternSet,
  cleanupTestResources,
} from "./test-helpers";
import { monitor, PerformanceThresholds } from "./monitor-utils";
import { profiler } from "./profile-utils";
import * as fs from "fs/promises";
import * as path from "path";

const PERF_THRESHOLDS: PerformanceThresholds = {
  cpu: {
    max: 85,
    sustained: 65,
    interval: 5000,
  },
  memory: {
    max: 1024 * 1024 * 1024, // 1GB
    growth: 1024 * 1024 * 5, // 5MB/s
    leakThreshold: 1024 * 1024 * 50, // 50MB
  },
  load: {
    max: 80,
    warning: 65,
  },
};

describe("Feature Memory System Performance Monitoring", () => {
  let testSet: TestPatternSet;
  let system: FeatureMemorySystem;
  const reportDir = path.join(__dirname, "performance-reports");

  beforeAll(async () => {
    testSet = await createTestPatternSet(100);
    await fs.mkdir(reportDir, { recursive: true });

    // Setup monitoring with custom thresholds
    monitor.on("monitoringStarted", ({ sessionId }) => {
      console.log(`\nStarted monitoring session: ${sessionId}`);
    });

    monitor.on("monitoringStopped", async ({ sessionId, report }) => {
      console.log(`\nCompleted monitoring session: ${sessionId}`);
      await saveReport(sessionId, report);
    });
  }, 60000);

  afterAll(async () => {
    await cleanupTestResources(testSet);
  });

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

  async function saveReport(sessionId: string, report: any): Promise<void> {
    const filename = `perf-report-${sessionId}-${Date.now()}.json`;
    await fs.writeFile(
      path.join(reportDir, filename),
      JSON.stringify(report, null, 2)
    );
  }

  describe("Pattern Recognition Performance", () => {
    it("should maintain performance under sustained load", async () => {
      const sessionId = `recognition-test-${Date.now()}`;
      monitor.startMonitoring(sessionId);

      try {
        // Load initial patterns
        await Promise.all(testSet.patterns.map((p) => system.storePattern(p)));

        // Run recognition operations in batches
        const batches = 5;
        const operationsPerBatch = 100;

        for (let batch = 0; batch < batches; batch++) {
          const operations = Array(operationsPerBatch)
            .fill(0)
            .map(async () => {
              const pattern =
                testSet.patterns[
                  Math.floor(Math.random() * testSet.patterns.length)
                ];
              return system.recognizePattern(pattern.features);
            });

          const results = await Promise.all(operations);
          const successRate =
            results.filter((r) => r.success).length / results.length;

          expect(successRate).toBeGreaterThan(0.95);

          // Allow system to stabilize between batches
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const report = monitor.stopMonitoring(sessionId);

        // Verify performance meets requirements
        expect(report.violations).toHaveLength(0);
        expect(report.trends.cpu.trend).not.toBe("increasing");
        expect(report.trends.memory.trend).not.toBe("increasing");
        expect(report.trends.load.anomalies).toBe(0);
      } catch (error) {
        monitor.stopMonitoring(sessionId);
        throw error;
      }
    }, 300000);

    it("should handle cache pressure efficiently", async () => {
      const sessionId = `cache-test-${Date.now()}`;
      monitor.startMonitoring(sessionId);

      try {
        const cacheSizes = [100, 500, 1000];
        const results = new Map<number, number>();

        for (const size of cacheSizes) {
          // Reconfigure system with new cache size
          await system.updateConfiguration({ cacheSize: size });

          // Clear existing patterns
          await system.dispose();
          system = new FeatureMemorySystem({
            maxPatterns: 10000,
            cacheSize: size,
            persistenceEnabled: false,
          });

          // Load patterns and measure performance
          await Promise.all(
            testSet.patterns.map((p) => system.storePattern(p))
          );

          const operations = Array(200)
            .fill(0)
            .map(async () => {
              const pattern =
                testSet.patterns[
                  Math.floor(Math.random() * testSet.patterns.length)
                ];
              const start = performance.now();
              await system.recognizePattern(pattern.features);
              return performance.now() - start;
            });

          const latencies = await Promise.all(operations);
          results.set(size, average(latencies));
        }

        const report = monitor.stopMonitoring(sessionId);

        // Verify cache size impact
        const latencies = Array.from(results.values());
        for (let i = 1; i < latencies.length; i++) {
          expect(latencies[i]).toBeLessThan(latencies[i - 1]);
        }

        // Verify monitoring results
        expect(report.trends.memory.anomalies).toBe(0);
        expect(report.recommendations.length).toBeGreaterThan(0);
      } catch (error) {
        monitor.stopMonitoring(sessionId);
        throw error;
      }
    });
  });

  describe("Memory Management", () => {
    it("should maintain stable memory usage under load", async () => {
      const sessionId = `memory-test-${Date.now()}`;
      monitor.startMonitoring(sessionId);

      try {
        const patterns = await Promise.all(
          Array(1000)
            .fill(0)
            .map(async (_, i) => {
              const audio = {
                ...testSet.audioBuffer,
                data: new Float32Array(
                  testSet.audioBuffer.data.map((x) => x * (1 + i * 0.01))
                ),
              };
              const result = await testSet.adapter.extractFeatures(audio);
              return testSet.adapter.createPattern(result.features);
            })
        );

        // Store patterns in batches
        const batchSize = 50;
        for (let i = 0; i < patterns.length; i += batchSize) {
          const batch = patterns.slice(i, i + batchSize);
          await Promise.all(batch.map((p) => system.storePattern(p)));

          // Run some queries to generate cache activity
          await Promise.all(
            batch.slice(0, 5).map((p) => system.recognizePattern(p.features))
          );

          // Allow GC opportunity to run
          if (global.gc) {
            global.gc();
          }
        }

        const report = monitor.stopMonitoring(sessionId);

        // Verify memory stability
        expect(report.trends.memory.trend).not.toBe("increasing");
        expect(
          report.violations.filter((v) => v.type === "memory")
        ).toHaveLength(0);
      } catch (error) {
        monitor.stopMonitoring(sessionId);
        throw error;
      }
    });
  });
});

function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}
