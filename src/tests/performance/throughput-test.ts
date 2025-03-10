/**
 * Throughput Test
 *
 * Tests for system throughput under load
 */
import { performance } from 'perf_hooks';
import { systemBootstrap, getSystemHealth } from '../../services/integration';
import { contextManager } from '../../context';
import { taskRouter } from '../../orchestration';
import { Logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger({ namespace: 'throughput-test' });

// Define throughput test configuration
interface ThroughputTestConfig {
  // Test duration in milliseconds
  testDurationMs: number;

  // Ramp-up period in milliseconds
  rampUpMs: number;

  // Cool-down period in milliseconds
  coolDownMs: number;

  // Target operations per second
  targetOpsPerSecond: number;

  // Maximum concurrent operations
  maxConcurrentOps: number;

  // Output directory for results
  outputDir: string;

  // Whether to generate detailed reports
  detailedReporting: boolean;

  // Whether to test different operation types
  testDifferentOpTypes: boolean;

  // Operation types to test
  operationTypes: ('context' | 'task' | 'health')[];

  // Whether to test system limits
  testSystemLimits: boolean;
}

// Define throughput test result
interface ThroughputTestResult {
  // Timestamp
  timestamp: Date;

  // Test duration in milliseconds
  testDurationMs: number;

  // Total operations completed
  totalOperations: number;

  // Operations per second
  operationsPerSecond: number;

  // Response times in milliseconds
  responseTimes: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };

  // Concurrency levels achieved
  concurrency: {
    average: number;
    peak: number;
  };

  // Error rate
  errorRate: number;

  // Results per operation type (if tested)
  operationTypeResults?: {
    type: string;
    operationsPerSecond: number;
    averageResponseTimeMs: number;
    errorRate: number;
  }[];

  // System limit results (if tested)
  systemLimitResults?: {
    maxOpsPerSecond: number;
    concurrencyAtMax: number;
    responseTimeAtMax: number;
    errorRateAtMax: number;
    limitingFactor: 'cpu' | 'memory' | 'errors' | 'unknown';
  };

  // System health during test
  systemHealth: {
    before: any;
    during: any;
    after: any;
  };

  // Recommendations
  recommendations: string[];
}

// Default throughput test configuration
const DEFAULT_CONFIG: ThroughputTestConfig = {
  testDurationMs: 60000, // 1 minute
  rampUpMs: 5000, // 5 seconds
  coolDownMs: 5000, // 5 seconds
  targetOpsPerSecond: 100,
  maxConcurrentOps: 50,
  outputDir: path.join(process.cwd(), 'throughput-test-results'),
  detailedReporting: true,
  testDifferentOpTypes: true,
  operationTypes: ['context', 'task', 'health'],
  testSystemLimits: false
};

/**
 * Run throughput tests
 */
export async function runThroughputTests(
  config: Partial<ThroughputTestConfig> = {}
): Promise<ThroughputTestResult> {
  // Merge with default configuration
  const testConfig: ThroughputTestConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  logger.info('Starting throughput tests', testConfig);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(testConfig.outputDir)) {
    fs.mkdirSync(testConfig.outputDir, { recursive: true });
  }

  // Bootstrap system
  systemBootstrap();

  // Check initial system health
  const initialHealth = await getSystemHealth();

  // Prepare result
  const result: ThroughputTestResult = {
    timestamp: new Date(),
    testDurationMs: testConfig.testDurationMs,
    totalOperations: 0,
    operationsPerSecond: 0,
    responseTimes: {
      average: 0,
      median: 0,
      p95: 0,
      p99: 0,
      min: 0,
      max: 0
    },
    concurrency: {
      average: 0,
      peak: 0
    },
    errorRate: 0,
    systemHealth: {
      before: initialHealth,
      during: null,
      after: null
    },
    recommendations: []
  };

  try {
    // Run main throughput test
    await runMainThroughputTest(testConfig, result);

    // Test different operation types if enabled
    if (testConfig.testDifferentOpTypes) {
      result.operationTypeResults = await testOperationTypes(testConfig);
    }

    // Test system limits if enabled
    if (testConfig.testSystemLimits) {
      result.systemLimitResults = await testSystemLimits(testConfig);
    }

    // Check final system health
    result.systemHealth.after = await getSystemHealth();

    // Generate recommendations
    result.recommendations = generateRecommendations(result);

    // Generate report
    if (testConfig.detailedReporting) {
      generateTestReport(result, testConfig);
    }

    // Log results
    logger.info('Throughput tests completed', {
      operationsPerSecond: result.operationsPerSecond.toFixed(2),
      averageResponseTimeMs: result.responseTimes.average.toFixed(2),
      errorRate: (result.errorRate * 100).toFixed(2) + '%'
    });

    return result;
  } catch (error) {
    logger.error('Throughput tests failed', { error });
    throw error;
  }
}

/**
 * Run main throughput test
 */
async function runMainThroughputTest(
  config: ThroughputTestConfig,
  result: ThroughputTestResult
): Promise<void> {
  logger.info('Running main throughput test');

  // Track response times
  const responseTimes: number[] = [];

  // Track errors
  let errorCount = 0;

  // Track concurrency
  let currentConcurrency = 0;
  let peakConcurrency = 0;
  const concurrencySamples: number[] = [];

  // Track operations
  let completedOperations = 0;

  // Start time
  const startTime = performance.now();

  // Health check interval
  let duringTestHealth: any = null;
  const healthCheckInterval = setInterval(async () => {
    try {
      duringTestHealth = await getSystemHealth();
    } catch (error) {
      logger.error('Health check failed during test', { error });
    }
  }, 10000); // Check health every 10 seconds

  // Calculate operation interval based on target ops/sec
  const operationIntervalMs = 1000 / config.targetOpsPerSecond;

  // Run test until duration is reached
  while (performance.now() - startTime < config.testDurationMs) {
    // Check if we're in ramp-up, steady state, or cool-down
    const elapsedMs = performance.now() - startTime;
    let targetConcurrency = config.maxConcurrentOps;

    if (elapsedMs < config.rampUpMs) {
      // Ramp-up: linearly increase concurrency
      targetConcurrency = Math.floor((elapsedMs / config.rampUpMs) * config.maxConcurrentOps);
    } else if (elapsedMs > config.testDurationMs - config.coolDownMs) {
      // Cool-down: linearly decrease concurrency
      const coolDownElapsed = elapsedMs - (config.testDurationMs - config.coolDownMs);
      targetConcurrency = Math.floor(((config.coolDownMs - coolDownElapsed) / config.coolDownMs) * config.maxConcurrentOps);
    }

    // Launch operations to maintain target concurrency
    while (currentConcurrency < targetConcurrency) {
      launchOperation();
    }

    // Wait for a short interval
    await new Promise(resolve => setTimeout(resolve, operationIntervalMs));
  }

  // Wait for all operations to complete
  while (currentConcurrency > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Clear health check interval
  clearInterval(healthCheckInterval);

  // Calculate results
  const endTime = performance.now();
  const actualTestDurationMs = endTime - startTime;

  result.totalOperations = completedOperations;
  result.operationsPerSecond = completedOperations / (actualTestDurationMs / 1000);
  result.errorRate = errorCount / completedOperations;

  // Calculate response time statistics
  if (responseTimes.length > 0) {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);

    result.responseTimes.average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    result.responseTimes.median = sortedTimes[Math.floor(sortedTimes.length / 2)];
    result.responseTimes.min = sortedTimes[0];
    result.responseTimes.max = sortedTimes[sortedTimes.length - 1];
    result.responseTimes.p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    result.responseTimes.p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  }

  // Calculate concurrency statistics
  result.concurrency.peak = peakConcurrency;
  result.concurrency.average = concurrencySamples.reduce((sum, c) => sum + c, 0) / concurrencySamples.length;

  // Set during test health
  result.systemHealth.during = duringTestHealth;

  /**
   * Launch a single operation
   */
  function launchOperation(): void {
    currentConcurrency++;
    peakConcurrency = Math.max(peakConcurrency, currentConcurrency);
    concurrencySamples.push(currentConcurrency);

    const operationStartTime = performance.now();

    executeOperation()
      .then(() => {
        const operationEndTime = performance.now();
        const responseTime = operationEndTime - operationStartTime;

        responseTimes.push(responseTime);
        completedOperations++;
      })
      .catch(() => {
        errorCount++;
      })
      .finally(() => {
        currentConcurrency--;
      });
  }
}

/**
 * Execute a single operation
 */
async function executeOperation(): Promise<void> {
  // Generate a random operation ID
  const operationId = `throughput-test-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  // Store context
  await contextManager.storeContext({
    id: operationId,
    type: 'throughput-test',
    content: {
      timestamp: Date.now(),
      data: new Float32Array(100).fill(0.5)
    },
    metadata: {
      timestamp: Date.now(),
      source: 'throughput-test',
      priority: 1,
      tags: ['throughput-test']
    }
  });

  // Route task
  await taskRouter.routeTask({
    id: `task-${operationId}`,
    type: 'audio_process',
    modelType: 'wav2vec2',
    data: new Float32Array(512).fill(0.5),
    storeResults: true,
    context: {
      contextId: operationId,
      tags: ['throughput-test']
    }
  });
}

/**
 * Test different operation types
 */
async function testOperationTypes(
  config: ThroughputTestConfig
): Promise<ThroughputTestResult['operationTypeResults']> {
  logger.info('Testing different operation types');

  const results: ThroughputTestResult['operationTypeResults'] = [];

  for (const opType of config.operationTypes) {
    logger.info(`Testing operation type: ${opType}`);

    // Run a shorter test for each operation type
    const testDurationMs = 10000; // 10 seconds
    const startTime = performance.now();
    let completedOperations = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    // Run operations until test duration is reached
    while (performance.now() - startTime < testDurationMs) {
      const operationStartTime = performance.now();

      try {
        await executeTypedOperation(opType);

        const operationEndTime = performance.now();
        responseTimes.push(operationEndTime - operationStartTime);
        completedOperations++;
      } catch (error) {
        errorCount++;
      }
    }

    const endTime = performance.now();
    const actualTestDurationMs = endTime - startTime;

    // Calculate results
    const operationsPerSecond = completedOperations / (actualTestDurationMs / 1000);
    const averageResponseTimeMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const errorRate = errorCount / (completedOperations + errorCount);

    results.push({
      type: opType,
      operationsPerSecond,
      averageResponseTimeMs,
      errorRate
    });
  }

  return results;
}

/**
 * Execute a typed operation
 */
async function executeTypedOperation(
  type: 'context' | 'task' | 'health'
): Promise<void> {
  const operationId = `throughput-test-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  switch (type) {
    case 'context':
      await contextManager.storeContext({
        id: operationId,
        type: 'throughput-test',
        content: {
          timestamp: Date.now(),
          data: new Float32Array(100).fill(0.5)
        },
        metadata: {
          timestamp: Date.now(),
          source: 'throughput-test',
          priority: 1,
          tags: ['throughput-test']
        }
      });
      break;

    case 'task':
      await taskRouter.routeTask({
        id: `task-${operationId}`,
        type: 'audio_process',
        modelType: 'wav2vec2',
        data: new Float32Array(512).fill(0.5),
        storeResults: false
      });
      break;

    case 'health':
      await getSystemHealth();
      break;
  }
}

/**
 * Test system limits
 */
async function testSystemLimits(
  config: ThroughputTestConfig
): Promise<ThroughputTestResult['systemLimitResults']> {
  logger.info('Testing system limits');

  // Start with a low ops/sec target and increase until we hit limits
  let currentTarget = 10; // Start with 10 ops/sec
  const maxTarget = 1000; // Don't go above 1000 ops/sec
  const testDurationMs = 10000; // 10 seconds per level

  let maxOpsPerSecond = 0;
  let concurrencyAtMax = 0;
  let responseTimeAtMax = 0;
  let errorRateAtMax = 0;
  let limitingFactor: 'cpu' | 'memory' | 'errors' | 'unknown' = 'unknown';

  while (currentTarget <= maxTarget) {
    logger.info(`Testing limit at ${currentTarget} ops/sec`);

    // Run a short test at the current target
    const startTime = performance.now();
    let completedOperations = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];
    let currentConcurrency = 0;
    let peakConcurrency = 0;

    // Calculate operation interval
    const operationIntervalMs = 1000 / currentTarget;

    // Run test until duration is reached
    const testEndTime = startTime + testDurationMs;
    let lastOperationTime = startTime;

    while (performance.now() < testEndTime) {
      const now = performance.now();

      // Check if it's time to launch a new operation
      if (now - lastOperationTime >= operationIntervalMs) {
        lastOperationTime = now;

        // Launch operation
        currentConcurrency++;
        peakConcurrency = Math.max(peakConcurrency, currentConcurrency);

        const operationStartTime = performance.now();

        executeOperation()
          .then(() => {
            const operationEndTime = performance.now();
            responseTimes.push(operationEndTime - operationStartTime);
            completedOperations++;
          })
          .catch(() => {
            errorCount++;
          })
          .finally(() => {
            currentConcurrency--;
          });
      }

      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Wait for operations to complete
    while (currentConcurrency > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate results
    const actualTestDurationSec = (performance.now() - startTime) / 1000;
    const achievedOpsPerSecond = completedOperations / actualTestDurationSec;
    const averageResponseTimeMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const errorRate = errorCount / (completedOperations + errorCount);

    logger.info(`Achieved ${achievedOpsPerSecond.toFixed(2)} ops/sec with ${(errorRate * 100).toFixed(2)}% errors`);

    // Check if we've hit a limit
    const targetEfficiency = achievedOpsPerSecond / currentTarget;
    const highErrorRate = errorRate > 0.1; // More than 10% errors
    const highResponseTime = averageResponseTimeMs > 1000; // More than 1 second

    if (targetEfficiency < 0.8 || highErrorRate || highResponseTime) {
      // We've hit a limit
      if (achievedOpsPerSecond > maxOpsPerSecond) {
        maxOpsPerSecond = achievedOpsPerSecond;
        concurrencyAtMax = peakConcurrency;
        responseTimeAtMax = averageResponseTimeMs;
        errorRateAtMax = errorRate;
      }

      // Determine limiting factor
      if (highErrorRate) {
        limitingFactor = 'errors';
      } else if (highResponseTime) {
        // Check system health to determine if it's CPU or memory
        const health = await getSystemHealth();

        if (health.metrics && health.metrics.criticalComponentsHealthy < health.metrics.criticalComponentsTotal) {
          limitingFactor = 'errors';
        } else {
          // This is a simplified approach - in a real system you would
          // have more sophisticated metrics to determine the limiting factor
          const memoryUsage = process.memoryUsage();
          const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

          if (memoryUsagePercent > 0.8) {
            limitingFactor = 'memory';
          } else {
            limitingFactor = 'cpu';
          }
        }
      }

      // Stop testing if we've clearly hit a limit
      if (targetEfficiency < 0.5 || errorRate > 0.2 || averageResponseTimeMs > 2000) {
        logger.info(`Stopping limit test at ${currentTarget} ops/sec due to performance degradation`);
        break;
      }
    }

    // Increase target for next iteration
    currentTarget *= 2;
  }

  return {
    maxOpsPerSecond,
    concurrencyAtMax,
    responseTimeAtMax,
    errorRateAtMax,
    limitingFactor
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(result: ThroughputTestResult): string[] {
  const recommendations: string[] = [];

  // Check throughput
  if (result.operationsPerSecond < 10) {
    recommendations.push('System throughput is very low. Consider optimizing core processing paths and database operations.');
  }

  // Check response times
  if (result.responseTimes.average > 500) {
    recommendations.push(`High average response time (${result.responseTimes.average.toFixed(2)}ms). Identify and optimize slow operations.`);
  }

  if (result.responseTimes.p95 > 1000) {
    recommendations.push(`High 95th percentile response time (${result.responseTimes.p95.toFixed(2)}ms). Investigate outliers and optimize for consistent performance.`);
  }

  // Check error rate
  if (result.errorRate > 0.01) {
    recommendations.push(`High error rate (${(result.errorRate * 100).toFixed(2)}%). Investigate error patterns and implement better error handling.`);
  }

  // Check operation type results
  if (result.operationTypeResults) {
    const slowestOpType = result.operationTypeResults.reduce(
      (slowest, current) => current.averageResponseTimeMs > slowest.averageResponseTimeMs ? current : slowest,
      result.operationTypeResults[0]
    );

    if (slowestOpType.averageResponseTimeMs > 500) {
      recommendations.push(`Operation type '${slowestOpType.type}' is particularly slow (${slowestOpType.averageResponseTimeMs.toFixed(2)}ms). Consider optimizing this operation type.`);
    }

    const highestErrorOpType = result.operationTypeResults.reduce(
      (highest, current) => current.errorRate > highest.errorRate ? current : highest,
      result.operationTypeResults[0]
    );

    if (highestErrorOpType.errorRate > 0.05) {
      recommendations.push(`Operation type '${highestErrorOpType.type}' has a high error rate (${(highestErrorOpType.errorRate * 100).toFixed(2)}%). Investigate and fix errors for this operation type.`);
    }
  }

  // Check system limit results
  if (result.systemLimitResults) {
    recommendations.push(`System throughput limit is approximately ${result.systemLimitResults.maxOpsPerSecond.toFixed(2)} operations per second.`);

    switch (result.systemLimitResults.limitingFactor) {
      case 'cpu':
        recommendations.push('System appears to be CPU-bound. Consider optimizing CPU-intensive operations or scaling horizontally.');
        break;

      case 'memory':
        recommendations.push('System appears to be memory-bound. Consider optimizing memory usage or increasing available memory.');
        break;

      case 'errors':
        recommendations.push('System throughput is limited by error rate. Fix errors to improve throughput.');
        break;
    }
  }

  // Check system health
  if (
    result.systemHealth.after &&
    result.systemHealth.before &&
    result.systemHealth.after.status !== result.systemHealth.before.status
  ) {
    recommendations.push(`System health degraded from ${result.systemHealth.before.status} to ${result.systemHealth.after.status} during the test. Investigate system stability under load.`);
  }

  return recommendations;
}

/**
 * Generate test report
 */
function generateTestReport(
  result: ThroughputTestResult,
  config: ThroughputTestConfig
): void {
  const reportPath = path.join(
    config.outputDir,
    `throughput-test-report-${result.timestamp.toISOString().replace(/:/g, '-')}.json`
  );

  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  logger.info(`Throughput test report generated: ${reportPath}`);
}

// If this file is run directly, execute the tests
if (require.main === module) {
  runThroughputTests()
    .then(result => {
      console.log(JSON.stringify({
        operationsPerSecond: result.operationsPerSecond.toFixed(2),
        averageResponseTimeMs: result.responseTimes.average.toFixed(2),
        p95ResponseTimeMs: result.responseTimes.p95.toFixed(2),
        errorRate: (result.errorRate * 100).toFixed(2) + '%',
        recommendations: result.recommendations
      }, null, 2));

      process.exit(0);
    })
    .catch(error => {
      console.error('Throughput tests failed:', error);
      process.exit(1);
    });
}
