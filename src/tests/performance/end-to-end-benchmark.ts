/**
 * End-to-End Performance Benchmark
 *
 * End-to-end performance benchmarking for the Audio Learning Hub
 */
import { performance } from 'perf_hooks';
import { systemBootstrap, getSystemHealth } from '../../services/integration';
import { contextManager } from '../../context';
import { taskRouter } from '../../orchestration';
import { Logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger({ namespace: 'e2e-benchmark' });

// Define benchmark configuration
interface BenchmarkConfig {
  // Number of iterations to run
  iterations: number;

  // Warm-up iterations (not included in results)
  warmupIterations: number;

  // Test data directory
  testDataDir: string;

  // Output directory for results
  outputDir: string;

  // Whether to generate detailed reports
  detailedReporting: boolean;

  // Whether to run in parallel
  parallel: boolean;

  // Maximum parallel operations
  maxParallelOperations: number;
}

// Define benchmark result
interface BenchmarkResult {
  // Name of the benchmark
  name: string;

  // Timestamp
  timestamp: Date;

  // Number of iterations
  iterations: number;

  // Execution times in milliseconds
  executionTimes: number[];

  // Average execution time in milliseconds
  averageExecutionTimeMs: number;

  // Minimum execution time in milliseconds
  minExecutionTimeMs: number;

  // Maximum execution time in milliseconds
  maxExecutionTimeMs: number;

  // Standard deviation of execution times
  stdDevExecutionTimeMs: number;

  // 95th percentile execution time
  p95ExecutionTimeMs: number;

  // 99th percentile execution time
  p99ExecutionTimeMs: number;

  // Memory usage
  memoryUsage: {
    start: number;
    end: number;
    peak: number;
  };

  // System health before benchmark
  initialHealth: any;

  // System health after benchmark
  finalHealth: any;

  // Error count
  errorCount: number;

  // Errors
  errors: Error[];
}

// Default benchmark configuration
const DEFAULT_CONFIG: BenchmarkConfig = {
  iterations: 10,
  warmupIterations: 2,
  testDataDir: path.join(process.cwd(), 'test-data'),
  outputDir: path.join(process.cwd(), 'benchmark-results'),
  detailedReporting: true,
  parallel: false,
  maxParallelOperations: 5
};

/**
 * Run an end-to-end benchmark
 */
export async function runEndToEndBenchmark(
  config: Partial<BenchmarkConfig> = {}
): Promise<BenchmarkResult> {
  // Merge with default configuration
  const benchmarkConfig: BenchmarkConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  logger.info('Starting end-to-end benchmark', benchmarkConfig);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(benchmarkConfig.outputDir)) {
    fs.mkdirSync(benchmarkConfig.outputDir, { recursive: true });
  }

  // Bootstrap system
  systemBootstrap();

  // Check initial system health
  const initialHealth = await getSystemHealth();

  // Track memory usage
  const memoryUsage = {
    start: process.memoryUsage().heapUsed,
    peak: 0,
    end: 0
  };

  // Prepare result
  const result: BenchmarkResult = {
    name: 'End-to-End Benchmark',
    timestamp: new Date(),
    iterations: benchmarkConfig.iterations,
    executionTimes: [],
    averageExecutionTimeMs: 0,
    minExecutionTimeMs: 0,
    maxExecutionTimeMs: 0,
    stdDevExecutionTimeMs: 0,
    p95ExecutionTimeMs: 0,
    p99ExecutionTimeMs: 0,
    memoryUsage,
    initialHealth,
    finalHealth: null,
    errorCount: 0,
    errors: []
  };

  try {
    // Run warm-up iterations
    logger.info(`Running ${benchmarkConfig.warmupIterations} warm-up iterations`);

    for (let i = 0; i < benchmarkConfig.warmupIterations; i++) {
      await runBenchmarkIteration(i, true);
    }

    // Run benchmark iterations
    logger.info(`Running ${benchmarkConfig.iterations} benchmark iterations`);

    if (benchmarkConfig.parallel) {
      // Run iterations in parallel
      const batchSize = benchmarkConfig.maxParallelOperations;
      const batches = Math.ceil(benchmarkConfig.iterations / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, benchmarkConfig.iterations);
        const batchPromises = [];

        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push(runBenchmarkIteration(i, false));
        }

        const batchResults = await Promise.all(batchPromises);
        result.executionTimes.push(...batchResults.filter(r => r !== null));
      }
    } else {
      // Run iterations sequentially
      for (let i = 0; i < benchmarkConfig.iterations; i++) {
        const executionTime = await runBenchmarkIteration(i, false);
        if (executionTime !== null) {
          result.executionTimes.push(executionTime);
        }
      }
    }

    // Update memory usage
    memoryUsage.end = process.memoryUsage().heapUsed;

    // Check final system health
    result.finalHealth = await getSystemHealth();

    // Calculate statistics
    if (result.executionTimes.length > 0) {
      result.minExecutionTimeMs = Math.min(...result.executionTimes);
      result.maxExecutionTimeMs = Math.max(...result.executionTimes);
      result.averageExecutionTimeMs = result.executionTimes.reduce((sum, time) => sum + time, 0) / result.executionTimes.length;

      // Calculate standard deviation
      const variance = result.executionTimes.reduce(
        (sum, time) => sum + Math.pow(time - result.averageExecutionTimeMs, 2),
        0
      ) / result.executionTimes.length;

      result.stdDevExecutionTimeMs = Math.sqrt(variance);

      // Calculate percentiles
      const sortedTimes = [...result.executionTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);

      result.p95ExecutionTimeMs = sortedTimes[p95Index];
      result.p99ExecutionTimeMs = sortedTimes[p99Index];
    }

    // Generate report
    if (benchmarkConfig.detailedReporting) {
      generateBenchmarkReport(result, benchmarkConfig);
    }

    // Log results
    logger.info('Benchmark completed', {
      iterations: result.iterations,
      averageTimeMs: result.averageExecutionTimeMs.toFixed(2),
      p95TimeMs: result.p95ExecutionTimeMs.toFixed(2),
      errorCount: result.errorCount
    });

    return result;
  } catch (error) {
    logger.error('Benchmark failed', { error });

    if (error instanceof Error) {
      result.errors.push(error);
    } else {
      result.errors.push(new Error(String(error)));
    }

    result.errorCount = result.errors.length;

    return result;
  }

  /**
   * Run a single benchmark iteration
   */
  async function runBenchmarkIteration(
    iteration: number,
    isWarmup: boolean
  ): Promise<number | null> {
    try {
      logger.debug(`Running ${isWarmup ? 'warm-up' : 'benchmark'} iteration ${iteration}`);

      const startTime = performance.now();

      // Execute end-to-end workflow
      await executeEndToEndWorkflow();

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Update peak memory usage
      const currentMemory = process.memoryUsage().heapUsed;
      memoryUsage.peak = Math.max(memoryUsage.peak, currentMemory);

      logger.debug(`Iteration ${iteration} completed in ${executionTime.toFixed(2)}ms`);

      return isWarmup ? null : executionTime;
    } catch (error) {
      logger.error(`Iteration ${iteration} failed`, { error });

      if (!isWarmup) {
        result.errorCount++;

        if (error instanceof Error) {
          result.errors.push(error);
        } else {
          result.errors.push(new Error(String(error)));
        }
      }

      return null;
    }
  }
}

/**
 * Execute end-to-end workflow
 */
async function executeEndToEndWorkflow(): Promise<void> {
  // Step 1: Store context
  const contextId = `benchmark-context-${Date.now()}`;
  await contextManager.storeContext({
    id: contextId,
    type: 'benchmark',
    content: {
      timestamp: Date.now(),
      parameters: {
        sampleRate: 44100,
        channels: 2,
        format: 'wav'
      }
    },
    metadata: {
      timestamp: Date.now(),
      source: 'benchmark',
      priority: 1,
      tags: ['benchmark', 'performance-test']
    }
  });

  // Step 2: Route task
  const task = {
    id: `benchmark-task-${Date.now()}`,
    type: 'audio_process',
    modelType: 'wav2vec2',
    data: new Float32Array(1024).fill(0.5),
    storeResults: true,
    context: {
      contextId,
      tags: ['benchmark', 'performance-test']
    }
  };

  const result = await taskRouter.routeTask(task);

  if (!result.success) {
    throw new Error(`Task execution failed: ${result.error?.message}`);
  }

  // Step 3: Retrieve results
  const retrievedContext = await contextManager.getContextForModel('task_history', {
    types: ['task_history'],
    tags: ['task-result', 'audio_process']
  });

  if (!retrievedContext) {
    throw new Error('Failed to retrieve task results');
  }

  // Step 4: Check system health
  const health = await getSystemHealth();

  if (health.status !== 'healthy') {
    throw new Error(`System health degraded: ${health.status}`);
  }
}

/**
 * Generate benchmark report
 */
function generateBenchmarkReport(
  result: BenchmarkResult,
  config: BenchmarkConfig
): void {
  const reportPath = path.join(
    config.outputDir,
    `benchmark-report-${result.timestamp.toISOString().replace(/:/g, '-')}.json`
  );

  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  logger.info(`Benchmark report generated: ${reportPath}`);
}

// If this file is run directly, execute the benchmark
if (require.main === module) {
  runEndToEndBenchmark()
    .then(result => {
      console.log(JSON.stringify({
        name: result.name,
        iterations: result.iterations,
        averageExecutionTimeMs: result.averageExecutionTimeMs,
        p95ExecutionTimeMs: result.p95ExecutionTimeMs,
        errorCount: result.errorCount
      }, null, 2));

      process.exit(0);
    })
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
