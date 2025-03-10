/**
 * Memory Usage Test
 *
 * Tests for memory usage across the system
 */
import { performance } from 'perf_hooks';
import { systemBootstrap, getSystemHealth } from '../../services/integration';
import { contextManager } from '../../context';
import { taskRouter } from '../../orchestration';
import { Logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger({ namespace: 'memory-usage-test' });

// Define memory test configuration
interface MemoryTestConfig {
  // Test duration in milliseconds
  testDurationMs: number;

  // Memory sampling interval in milliseconds
  samplingIntervalMs: number;

  // Number of operations to perform
  operations: number;

  // Operation batch size
  batchSize: number;

  // Output directory for results
  outputDir: string;

  // Whether to generate detailed reports
  detailedReporting: boolean;

  // Whether to force garbage collection between tests (if available)
  forceGC: boolean;

  // Whether to test memory leaks
  testMemoryLeaks: boolean;

  // Number of leak test iterations
  leakTestIterations: number;
}

// Define memory test result
interface MemoryTestResult {
  // Timestamp
  timestamp: Date;

  // Initial memory usage in bytes
  initialMemoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };

  // Peak memory usage in bytes
  peakMemoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };

  // Final memory usage in bytes
  finalMemoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };

  // Memory usage samples over time
  samples: {
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    operationsCompleted: number;
  }[];

  // Memory usage per operation
  memoryPerOperation: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };

  // Memory leak test results (if performed)
  leakTestResults?: {
    iterations: number;
    memoryRetained: number;
    averageRetentionPerIteration: number;
    leakDetected: boolean;
  };

  // Recommendations
  recommendations: string[];
}

// Default memory test configuration
const DEFAULT_CONFIG: MemoryTestConfig = {
  testDurationMs: 60000, // 1 minute
  samplingIntervalMs: 1000, // 1 second
  operations: 1000,
  batchSize: 10,
  outputDir: path.join(process.cwd(), 'memory-test-results'),
  detailedReporting: true,
  forceGC: true,
  testMemoryLeaks: true,
  leakTestIterations: 5
};

/**
 * Run memory usage tests
 */
export async function runMemoryUsageTests(
  config: Partial<MemoryTestConfig> = {}
): Promise<MemoryTestResult> {
  // Merge with default configuration
  const testConfig: MemoryTestConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  logger.info('Starting memory usage tests', testConfig);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(testConfig.outputDir)) {
    fs.mkdirSync(testConfig.outputDir, { recursive: true });
  }

  // Bootstrap system
  systemBootstrap();

  // Force garbage collection if enabled and available
  if (testConfig.forceGC && global.gc) {
    logger.debug('Forcing garbage collection before test');
    global.gc();
  }

  // Get initial memory usage
  const initialMemoryUsage = process.memoryUsage();

  // Prepare result
  const result: MemoryTestResult = {
    timestamp: new Date(),
    initialMemoryUsage: {
      heapUsed: initialMemoryUsage.heapUsed,
      heapTotal: initialMemoryUsage.heapTotal,
      external: initialMemoryUsage.external,
      rss: initialMemoryUsage.rss
    },
    peakMemoryUsage: {
      heapUsed: initialMemoryUsage.heapUsed,
      heapTotal: initialMemoryUsage.heapTotal,
      external: initialMemoryUsage.external,
      rss: initialMemoryUsage.rss
    },
    finalMemoryUsage: {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    },
    samples: [],
    memoryPerOperation: {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    },
    recommendations: []
  };

  try {
    // Start memory sampling
    const samplingInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();

      // Update peak memory usage
      result.peakMemoryUsage.heapUsed = Math.max(result.peakMemoryUsage.heapUsed, memoryUsage.heapUsed);
      result.peakMemoryUsage.heapTotal = Math.max(result.peakMemoryUsage.heapTotal, memoryUsage.heapTotal);
      result.peakMemoryUsage.external = Math.max(result.peakMemoryUsage.external, memoryUsage.external);
      result.peakMemoryUsage.rss = Math.max(result.peakMemoryUsage.rss, memoryUsage.rss);

      // Add sample
      result.samples.push({
        timestamp: Date.now(),
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        operationsCompleted: 0 // Will be updated during test
      });
    }, testConfig.samplingIntervalMs);

    // Run operations
    const startTime = performance.now();
    let operationsCompleted = 0;

    logger.info(`Running ${testConfig.operations} operations in batches of ${testConfig.batchSize}`);

    for (let i = 0; i < testConfig.operations; i += testConfig.batchSize) {
      const batchSize = Math.min(testConfig.batchSize, testConfig.operations - i);
      const batchPromises = [];

      for (let j = 0; j < batchSize; j++) {
        batchPromises.push(executeOperation(i + j));
      }

      await Promise.all(batchPromises);

      operationsCompleted += batchSize;

      // Update operations completed in the latest sample
      if (result.samples.length > 0) {
        result.samples[result.samples.length - 1].operationsCompleted = operationsCompleted;
      }

      // Check if test duration has been reached
      if (performance.now() - startTime >= testConfig.testDurationMs) {
        logger.info(`Test duration reached after ${operationsCompleted} operations`);
        break;
      }
    }

    // Stop memory sampling
    clearInterval(samplingInterval);

    // Get final memory usage
    const finalMemoryUsage = process.memoryUsage();
    result.finalMemoryUsage = {
      heapUsed: finalMemoryUsage.heapUsed,
      heapTotal: finalMemoryUsage.heapTotal,
      external: finalMemoryUsage.external,
      rss: finalMemoryUsage.rss
    };

    // Calculate memory per operation
    if (operationsCompleted > 0) {
      const memoryDelta = {
        heapUsed: finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed,
        heapTotal: finalMemoryUsage.heapTotal - initialMemoryUsage.heapTotal,
        external: finalMemoryUsage.external - initialMemoryUsage.external,
        rss: finalMemoryUsage.rss - initialMemoryUsage.rss
      };

      result.memoryPerOperation = {
        heapUsed: memoryDelta.heapUsed / operationsCompleted,
        heapTotal: memoryDelta.heapTotal / operationsCompleted,
        external: memoryDelta.external / operationsCompleted,
        rss: memoryDelta.rss / operationsCompleted
      };
    }

    // Run memory leak test if enabled
    if (testConfig.testMemoryLeaks) {
      logger.info('Running memory leak test');

      result.leakTestResults = await runMemoryLeakTest(testConfig);
    }

    // Generate recommendations
    result.recommendations = generateRecommendations(result);

    // Generate report
    if (testConfig.detailedReporting) {
      generateTestReport(result, testConfig);
    }

    // Log results
    logger.info('Memory usage tests completed', {
      initialHeapUsedMB: (result.initialMemoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      peakHeapUsedMB: (result.peakMemoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      finalHeapUsedMB: (result.finalMemoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      memoryPerOperationKB: (result.memoryPerOperation.heapUsed / 1024).toFixed(2),
      leakDetected: result.leakTestResults?.leakDetected
    });

    return result;
  } catch (error) {
    logger.error('Memory usage tests failed', { error });
    throw error;
  }
}

/**
 * Execute a test operation
 */
async function executeOperation(index: number): Promise<void> {
  // Store context
  const contextId = `memory-test-${index}`;
  await contextManager.storeContext({
    id: contextId,
    type: 'memory-test',
    content: {
      index,
      timestamp: Date.now(),
      data: generateTestData(index)
    },
    metadata: {
      timestamp: Date.now(),
      source: 'memory-test',
      priority: 1,
      tags: ['memory-test']
    }
  });

  // Route task
  const task = {
    id: `memory-test-task-${index}`,
    type: 'audio_process',
    modelType: 'wav2vec2',
    data: new Float32Array(512).fill(0.5),
    storeResults: true,
    context: {
      contextId,
      tags: ['memory-test']
    }
  };

  await taskRouter.routeTask(task);
}

/**
 * Generate test data
 */
function generateTestData(index: number): any {
  // Generate test data with some variety to avoid optimization
  return {
    id: `data-${index}`,
    values: new Float32Array(100).fill(index / 1000),
    metadata: {
      timestamp: Date.now(),
      source: 'memory-test',
      index
    }
  };
}

/**
 * Run memory leak test
 */
async function runMemoryLeakTest(
  config: MemoryTestConfig
): Promise<MemoryTestResult['leakTestResults']> {
  const iterations = config.leakTestIterations;
  const memoryUsages: number[] = [];

  for (let i = 0; i < iterations; i++) {
    logger.debug(`Running leak test iteration ${i + 1}/${iterations}`);

    // Force garbage collection if enabled and available
    if (config.forceGC && global.gc) {
      global.gc();
    }

    // Get initial memory usage
    const initialMemoryUsage = process.memoryUsage().heapUsed;

    // Run a batch of operations
    const batchPromises = [];
    for (let j = 0; j < 100; j++) {
      batchPromises.push(executeOperation(i * 1000 + j));
    }

    await Promise.all(batchPromises);

    // Force garbage collection if enabled and available
    if (config.forceGC && global.gc) {
      global.gc();
    }

    // Get final memory usage
    const finalMemoryUsage = process.memoryUsage().heapUsed;

    // Calculate memory retained
    const memoryRetained = finalMemoryUsage - initialMemoryUsage;
    memoryUsages.push(memoryRetained);

    logger.debug(`Iteration ${i + 1} retained ${(memoryRetained / 1024 / 1024).toFixed(2)}MB`);
  }

  // Calculate average memory retained per iteration
  const totalMemoryRetained = memoryUsages.reduce((sum, mem) => sum + mem, 0);
  const averageRetentionPerIteration = totalMemoryRetained / iterations;

  // Determine if a leak is detected
  // A leak is detected if the average retention is positive and significant
  const leakDetected = averageRetentionPerIteration > 1024 * 1024; // More than 1MB per iteration

  return {
    iterations,
    memoryRetained: totalMemoryRetained,
    averageRetentionPerIteration,
    leakDetected
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(result: MemoryTestResult): string[] {
  const recommendations: string[] = [];

  // Check memory growth
  const memoryGrowth = result.finalMemoryUsage.heapUsed - result.initialMemoryUsage.heapUsed;
  const memoryGrowthMB = memoryGrowth / 1024 / 1024;

  if (memoryGrowthMB > 50) {
    recommendations.push(`High memory growth detected (${memoryGrowthMB.toFixed(2)}MB). Consider implementing memory optimization strategies.`);
  }

  // Check memory per operation
  const memoryPerOperationKB = result.memoryPerOperation.heapUsed / 1024;

  if (memoryPerOperationKB > 50) {
    recommendations.push(`High memory usage per operation (${memoryPerOperationKB.toFixed(2)}KB). Review data structures and object creation patterns.`);
  }

  // Check peak memory usage
  const peakMemoryUsageMB = result.peakMemoryUsage.heapUsed / 1024 / 1024;

  if (peakMemoryUsageMB > 200) {
    recommendations.push(`High peak memory usage (${peakMemoryUsageMB.toFixed(2)}MB). Consider implementing incremental processing or streaming for large datasets.`);
  }

  // Check memory leak
  if (result.leakTestResults?.leakDetected) {
    const leakRateMB = result.leakTestResults.averageRetentionPerIteration / 1024 / 1024;
    recommendations.push(`Memory leak detected (${leakRateMB.toFixed(2)}MB per iteration). Investigate object retention patterns and event listeners.`);
  }

  // Check external memory usage
  const externalMemoryMB = result.finalMemoryUsage.external / 1024 / 1024;

  if (externalMemoryMB > 50) {
    recommendations.push(`High external memory usage (${externalMemoryMB.toFixed(2)}MB). Review native objects and buffers.`);
  }

  return recommendations;
}

/**
 * Generate test report
 */
function generateTestReport(
  result: MemoryTestResult,
  config: MemoryTestConfig
): void {
  const reportPath = path.join(
    config.outputDir,
    `memory-test-report-${result.timestamp.toISOString().replace(/:/g, '-')}.json`
  );

  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  logger.info(`Memory test report generated: ${reportPath}`);

  // Generate CSV for memory samples
  const csvPath = path.join(
    config.outputDir,
    `memory-samples-${result.timestamp.toISOString().replace(/:/g, '-')}.csv`
  );

  const csvHeader = 'timestamp,heapUsed,heapTotal,external,rss,operationsCompleted\n';
  const csvRows = result.samples.map(sample =>
    `${sample.timestamp},${sample.heapUsed},${sample.heapTotal},${sample.external},${sample.rss},${sample.operationsCompleted}`
  ).join('\n');

  fs.writeFileSync(csvPath, csvHeader + csvRows);

  logger.info(`Memory samples CSV generated: ${csvPath}`);
}

// If this file is run directly, execute the tests
if (require.main === module) {
  runMemoryUsageTests()
    .then(result => {
      console.log(JSON.stringify({
        initialHeapUsedMB: (result.initialMemoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        peakHeapUsedMB: (result.peakMemoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        finalHeapUsedMB: (result.finalMemoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        memoryPerOperationKB: (result.memoryPerOperation.heapUsed / 1024).toFixed(2),
        leakDetected: result.leakTestResults?.leakDetected,
        recommendations: result.recommendations
      }, null, 2));

      process.exit(0);
    })
    .catch(error => {
      console.error('Memory usage tests failed:', error);
      process.exit(1);
    });
}
