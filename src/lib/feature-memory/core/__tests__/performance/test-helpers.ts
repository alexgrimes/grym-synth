import {
  FeatureMemorySystem,
  Pattern,
  FeatureValue,
  SearchResult,
  PatternMatchResult,
} from "../../../index";
import { Wav2Vec2FeatureAdapter } from "../../wav2vec2-feature-adapter";
import { SimpleAudioBuffer } from "../../../../../types/audio";
import { performance } from "perf_hooks";

export interface TestPatternSet {
  patterns: Pattern[];
  audioBuffer: SimpleAudioBuffer;
  adapter: Wav2Vec2FeatureAdapter;
}

export interface LatencyMeasurement {
  average: number;
  max: number;
  min: number;
  p95: number;
  samples: number[];
}

export interface StressTestResults {
  latencies: LatencyMeasurement;
  successRate: number;
  errorRate: number;
  memoryUsage: {
    start: number;
    end: number;
    peak: number;
  };
}

export async function createTestPatternSet(
  count: number = 10
): Promise<TestPatternSet> {
  const audioBuffer: SimpleAudioBuffer = {
    data: new Float32Array(16000),
    channels: 1,
    sampleRate: 16000,
    metadata: {
      duration: 1,
      format: "wav",
    },
  };

  const adapter = new Wav2Vec2FeatureAdapter({
    maxMemory: "1GB",
    modelPath: "test/model/path",
  });

  const patterns = await Promise.all(
    Array(count)
      .fill(0)
      .map(async (_, i) => {
        const audio = {
          ...audioBuffer,
          data: new Float32Array(
            audioBuffer.data.map((x) => x * (1 + i * 0.1))
          ),
        };
        const result = await adapter.extractFeatures(audio);
        return adapter.createPattern(result.features);
      })
  );

  return {
    patterns,
    audioBuffer,
    adapter,
  };
}

export async function measureOperationLatency(
  system: FeatureMemorySystem,
  patterns: Pattern[],
  iterations: number = 50
): Promise<LatencyMeasurement> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const pattern = patterns[i % patterns.length];
    const start = performance.now();
    await system.recognizePattern(pattern.features);
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);

  return {
    average: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    max: Math.max(...latencies),
    min: Math.min(...latencies),
    p95: latencies[p95Index],
    samples: latencies,
  };
}

export async function measureStorageSizes(
  system: FeatureMemorySystem,
  patterns: Pattern[]
): Promise<number[]> {
  return Promise.all(
    patterns.map(async (pattern) => {
      const before = process.memoryUsage().heapUsed;
      await system.storePattern(pattern);
      return process.memoryUsage().heapUsed - before;
    })
  );
}

export function calculateVariance(numbers: number[]): number {
  const avg = average(numbers);
  return average(numbers.map((n) => Math.pow(n - avg, 2)));
}

export function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export async function cleanupTestResources(
  testSet?: TestPatternSet
): Promise<void> {
  if (testSet?.adapter) {
    await testSet.adapter.dispose();
  }
}

export function collectMemoryStats(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
} {
  const stats = process.memoryUsage();
  return {
    heapUsed: stats.heapUsed,
    heapTotal: stats.heapTotal,
    external: stats.external,
  };
}

export async function runStressTest(
  system: FeatureMemorySystem,
  patterns: Pattern[],
  duration: number = 30000, // 30 seconds
  concurrentOperations: number = 10
): Promise<StressTestResults> {
  const startMemory = process.memoryUsage().heapUsed;
  let peakMemory = startMemory;
  const startTime = performance.now();
  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;

  while (performance.now() - startTime < duration) {
    const operations = Array(concurrentOperations)
      .fill(0)
      .map(async () => {
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const opStart = performance.now();
        try {
          const result = await system.recognizePattern(pattern.features);
          latencies.push(performance.now() - opStart);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
        peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed);
      });

    await Promise.all(operations);
  }

  const endMemory = process.memoryUsage().heapUsed;
  const totalOperations = successCount + errorCount;

  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);

  return {
    latencies: {
      average: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      max: Math.max(...latencies),
      min: Math.min(...latencies),
      p95: latencies[p95Index],
      samples: latencies,
    },
    successRate: successCount / totalOperations,
    errorRate: errorCount / totalOperations,
    memoryUsage: {
      start: startMemory,
      end: endMemory,
      peak: peakMemory,
    },
  };
}
