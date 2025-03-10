/**
 * Performance Benchmark Tests for grym-synth Backend
 *
 * This file contains comprehensive performance benchmarks for the grym-synth backend,
 * measuring response times, throughput, memory usage, and other performance metrics
 * across different operations and load scenarios.
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import { cpus, totalmem, freemem } from 'os';
import { spawn } from 'child_process';

// Import API modules
import {
  audioGeneration,
  patternRecognition,
  parameterMapping,
  modelManagement,
  midiGeneration,
} from '../../api';

// Import utilities
import { Logger } from '../../utils/logger';

// Performance metrics types
interface PerformanceResult {
  operation: string;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputOpsPerSec: number;
  successRate: number;
  memoryUsageMB: number;
  memoryDeltaMB: number;
  cpuUsagePercent: number;
  timestamp: string;
  parameters: Record<string, any>;
}

interface BenchmarkConfig {
  name: string;
  description: string;
  iterations: number;
  warmupIterations: number;
  cooldownMs: number;
  concurrentRequests: number;
  targetLatencyMs: number;
  targetThroughput: number;
  parameters: Record<string, any>;
}

// Create logger
const logger = new Logger({ namespace: 'performance-benchmarks' });

// Utility functions
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function measureMemoryUsage(): Promise<{ usedMB: number, totalMB: number, percentUsed: number }> {
  const used = process.memoryUsage();
  const totalMemory = totalmem() / (1024 * 1024); // MB
  const freeMemory = freemem() / (1024 * 1024); // MB
  const usedMemory = totalMemory - freeMemory;

  return {
    usedMB: Math.round(used.heapUsed / (1024 * 1024)),
    totalMB: Math.round(totalMemory),
    percentUsed: Math.round((usedMemory / totalMemory) * 100),
  };
}

async function measureCpuUsage(durationMs: number = 1000): Promise<number> {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime.bigint();

    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const endTime = process.hrtime.bigint();

      const elapsedMs = Number(endTime - startTime) / 1000000;
      const totalUsage = endUsage.user + endUsage.system;
      const cpuPercent = (totalUsage / 1000 / elapsedMs) * 100 / cpus().length;

      resolve(Math.round(cpuPercent * 100) / 100);
    }, durationMs);
  });
}

// Benchmark runner
async function runBenchmark(
  operation: () => Promise<any>,
  config: BenchmarkConfig
): Promise<PerformanceResult> {
  logger.info(`Starting benchmark: ${config.name}`, { config });

  // Warmup phase
  if (config.warmupIterations > 0) {
    logger.debug(`Warmup phase: ${config.warmupIterations} iterations`);
    for (let i = 0; i < config.warmupIterations; i++) {
      try {
        await operation();
        if (config.cooldownMs > 0) {
          await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
        }
      } catch (error) {
        logger.warn(`Error during warmup iteration ${i}`, { error });
      }
    }
  }

  // Measurement phase
  const latencies: number[] = [];
  const initialMemory = await measureMemoryUsage();
  const startTime = performance.now();
  let successCount = 0;

  logger.debug(`Measurement phase: ${config.iterations} iterations`);

  if (config.concurrentRequests <= 1) {
    // Sequential execution
    for (let i = 0; i < config.iterations; i++) {
      const iterationStart = performance.now();
      try {
        await operation();
        successCount++;
      } catch (error) {
        logger.warn(`Error during iteration ${i}`, { error });
      }
      const iterationEnd = performance.now();
      latencies.push(iterationEnd - iterationStart);

      if (config.cooldownMs > 0) {
        await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
      }

      if ((i + 1) % 10 === 0 || i === config.iterations - 1) {
        logger.debug(`Completed ${i + 1}/${config.iterations} iterations`);
      }
    }
  } else {
    // Concurrent execution
    const batchSize = config.concurrentRequests;
    const batches = Math.ceil(config.iterations / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const remaining = Math.min(batchSize, config.iterations - batch * batchSize);
      const batchPromises = [];

      for (let i = 0; i < remaining; i++) {
        const iterationStart = performance.now();
        const promise = operation()
          .then(result => {
            const iterationEnd = performance.now();
            latencies.push(iterationEnd - iterationStart);
            successCount++;
            return result;
          })
          .catch(error => {
            logger.warn(`Error during concurrent iteration ${batch * batchSize + i}`, { error });
          });

        batchPromises.push(promise);
      }

      await Promise.all(batchPromises);

      if (config.cooldownMs > 0) {
        await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
      }

      logger.debug(`Completed batch ${batch + 1}/${batches} (${Math.min((batch + 1) * batchSize, config.iterations)}/${config.iterations} iterations)`);
    }
  }

  const endTime = performance.now();
  const finalMemory = await measureMemoryUsage();
  const cpuUsage = await measureCpuUsage();

  // Calculate metrics
  const totalTimeMs = endTime - startTime;
  const throughput = (successCount / totalTimeMs) * 1000;
  const successRate = (successCount / config.iterations) * 100;

  const result: PerformanceResult = {
    operation: config.name,
    averageLatencyMs: latencies.reduce((sum, val) => sum + val, 0) / latencies.length,
    p50LatencyMs: calculatePercentile(latencies, 50),
    p95LatencyMs: calculatePercentile(latencies, 95),
    p99LatencyMs: calculatePercentile(latencies, 99),
    minLatencyMs: Math.min(...latencies),
    maxLatencyMs: Math.max(...latencies),
    throughputOpsPerSec: throughput,
    successRate: successRate,
    memoryUsageMB: finalMemory.usedMB,
    memoryDeltaMB: finalMemory.usedMB - initialMemory.usedMB,
    cpuUsagePercent: cpuUsage,
    timestamp: new Date().toISOString(),
    parameters: config.parameters,
  };

  logger.info(`Benchmark completed: ${config.name}`, {
    averageLatency: `${result.averageLatencyMs.toFixed(2)}ms`,
    p95Latency: `${result.p95LatencyMs.toFixed(2)}ms`,
    throughput: `${result.throughputOpsPerSec.toFixed(2)} ops/sec`,
    successRate: `${result.successRate.toFixed(2)}%`,
    memoryDelta: `${result.memoryDeltaMB.toFixed(2)}MB`,
  });

  // Check against targets
  if (result.averageLatencyMs > config.targetLatencyMs) {
    logger.warn(`Average latency (${result.averageLatencyMs.toFixed(2)}ms) exceeds target (${config.targetLatencyMs}ms)`);
  }

  if (result.throughputOpsPerSec < config.targetThroughput) {
    logger.warn(`Throughput (${result.throughputOpsPerSec.toFixed(2)} ops/sec) below target (${config.targetThroughput} ops/sec)`);
  }

  return result;
}

// Save results to file
async function saveResults(results: PerformanceResult[], filename: string): Promise<void> {
  const resultsDir = path.join(process.cwd(), 'reports', 'performance');

  // Create directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const filePath = path.join(resultsDir, filename);
  await fs.promises.writeFile(filePath, JSON.stringify(results, null, 2));

  logger.info(`Results saved to ${filePath}`);
}

// Benchmark definitions
const benchmarks = {
  audioGeneration: async (config: BenchmarkConfig): Promise<PerformanceResult> => {
    return runBenchmark(
      async () => {
        return audioGeneration.generateAudio(
          config.parameters.prompt || 'Test audio generation prompt',
          {
            duration: config.parameters.duration || 3,
            model: config.parameters.model || 'default',
            style: config.parameters.style || 'electronic',
            tempo: config.parameters.tempo || 120,
          }
        );
      },
      config
    );
  },

  patternRecognition: async (config: BenchmarkConfig): Promise<PerformanceResult> => {
    // Create a sample audio buffer for testing
    const sampleRate = 44100;
    const duration = config.parameters.duration || 3;
    const audioBuffer = new Float32Array(sampleRate * duration);

    // Generate a simple sine wave
    for (let i = 0; i < audioBuffer.length; i++) {
      audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }

    return runBenchmark(
      async () => {
        return patternRecognition.analyzeAudio(
          'test-audio-id',
          {
            sensitivity: config.parameters.sensitivity || 0.8,
            minFrequency: config.parameters.minFrequency || 20,
            maxFrequency: config.parameters.maxFrequency || 20000,
          }
        );
      },
      config
    );
  },

  modelManagement: async (config: BenchmarkConfig): Promise<PerformanceResult> => {
    return runBenchmark(
      async () => {
        return modelManagement.checkModels();
      },
      config
    );
  },

  parameterMapping: async (config: BenchmarkConfig): Promise<PerformanceResult> => {
    return runBenchmark(
      async () => {
        return parameterMapping.getAllParameterMaps();
      },
      config
    );
  },

  midiGeneration: async (config: BenchmarkConfig): Promise<PerformanceResult> => {
    return runBenchmark(
      async () => {
        return midiGeneration.generateMIDI(
          config.parameters.prompt || 'Test MIDI generation prompt',
          {
            tempo: config.parameters.tempo || 120,
            key: config.parameters.key || 'C',
          }
        );
      },
      config
    );
  },
};

// Main benchmark runner
export async function runAllBenchmarks(): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = [];

  // Audio Generation benchmarks
  results.push(await benchmarks.audioGeneration({
    name: 'Audio Generation - Single Request',
    description: 'Measures performance of generating a single audio sample',
    iterations: 10,
    warmupIterations: 2,
    cooldownMs: 500,
    concurrentRequests: 1,
    targetLatencyMs: 5000,
    targetThroughput: 0.2,
    parameters: {
      prompt: 'A simple electronic beat with synth melody',
      duration: 3,
      model: 'audioldm',
      style: 'electronic',
      tempo: 120,
    },
  }));

  results.push(await benchmarks.audioGeneration({
    name: 'Audio Generation - Concurrent Requests',
    description: 'Measures performance under concurrent audio generation load',
    iterations: 20,
    warmupIterations: 2,
    cooldownMs: 1000,
    concurrentRequests: 5,
    targetLatencyMs: 8000,
    targetThroughput: 0.5,
    parameters: {
      prompt: 'A simple electronic beat with synth melody',
      duration: 2,
      model: 'audioldm',
      style: 'electronic',
      tempo: 120,
    },
  }));

  // Pattern Recognition benchmarks
  results.push(await benchmarks.patternRecognition({
    name: 'Pattern Recognition - Single Request',
    description: 'Measures performance of analyzing a single audio sample',
    iterations: 10,
    warmupIterations: 2,
    cooldownMs: 200,
    concurrentRequests: 1,
    targetLatencyMs: 1000,
    targetThroughput: 1.0,
    parameters: {
      duration: 3,
      sensitivity: 0.8,
    },
  }));

  results.push(await benchmarks.patternRecognition({
    name: 'Pattern Recognition - Concurrent Requests',
    description: 'Measures performance under concurrent pattern recognition load',
    iterations: 20,
    warmupIterations: 2,
    cooldownMs: 500,
    concurrentRequests: 5,
    targetLatencyMs: 2000,
    targetThroughput: 2.0,
    parameters: {
      duration: 2,
      sensitivity: 0.8,
    },
  }));

  // Model Management benchmarks
  results.push(await benchmarks.modelManagement({
    name: 'Model Management - Check Models',
    description: 'Measures performance of checking available models',
    iterations: 10,
    warmupIterations: 1,
    cooldownMs: 100,
    concurrentRequests: 1,
    targetLatencyMs: 500,
    targetThroughput: 5.0,
    parameters: {},
  }));

  // Parameter Mapping benchmarks
  results.push(await benchmarks.parameterMapping({
    name: 'Parameter Mapping - Get All Maps',
    description: 'Measures performance of retrieving all parameter maps',
    iterations: 10,
    warmupIterations: 1,
    cooldownMs: 100,
    concurrentRequests: 1,
    targetLatencyMs: 300,
    targetThroughput: 10.0,
    parameters: {},
  }));

  // MIDI Generation benchmarks
  results.push(await benchmarks.midiGeneration({
    name: 'MIDI Generation - Single Request',
    description: 'Measures performance of generating a single MIDI file',
    iterations: 10,
    warmupIterations: 2,
    cooldownMs: 200,
    concurrentRequests: 1,
    targetLatencyMs: 2000,
    targetThroughput: 0.5,
    parameters: {
      prompt: 'A simple melody in C major',
      tempo: 120,
      key: 'C',
    },
  }));

  results.push(await benchmarks.midiGeneration({
    name: 'MIDI Generation - Concurrent Requests',
    description: 'Measures performance under concurrent MIDI generation load',
    iterations: 20,
    warmupIterations: 2,
    cooldownMs: 500,
    concurrentRequests: 5,
    targetLatencyMs: 3000,
    targetThroughput: 1.0,
    parameters: {
      prompt: 'A simple melody in C major',
      tempo: 120,
      key: 'C',
    },
  }));

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  await saveResults(results, `benchmark-results-${timestamp}.json`);

  return results;
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runAllBenchmarks()
    .then(() => {
      logger.info('All benchmarks completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error running benchmarks', { error });
      process.exit(1);
    });
}

