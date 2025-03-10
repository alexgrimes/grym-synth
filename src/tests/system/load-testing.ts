/**
 * Load Testing
 *
 * Test system performance under various load conditions
 */
import { performance } from 'perf_hooks';
import { systemBootstrap, getSystemHealth } from '../../services/integration';
import { contextManager } from '../../context';
import { taskRouter } from '../../orchestration';
import { Logger } from '../../utils/logger';

const logger = new Logger({ namespace: 'load-testing' });

// Define load test configuration
interface LoadTestConfig {
  // Number of concurrent operations
  concurrentOperations: number;

  // Duration of the test in milliseconds
  testDurationMs: number;

  // Delay between operations in milliseconds
  operationDelayMs: number;

  // Whether to log detailed metrics
  detailedLogging: boolean;

  // Maximum acceptable response time in milliseconds
  maxAcceptableResponseTimeMs: number;

  // Target operations per second
  targetOpsPerSecond: number;
}

// Define load test results
interface LoadTestResults {
  // Total operations executed
  totalOperations: number;

  // Operations per second
  operationsPerSecond: number;

  // Average response time in milliseconds
  averageResponseTimeMs: number;

  // Minimum response time in milliseconds
  minResponseTimeMs: number;

  // Maximum response time in milliseconds
  maxResponseTimeMs: number;

  // Standard deviation of response times
  responseTimeStdDevMs: number;

  // 95th percentile response time
  p95ResponseTimeMs: number;

  // 99th percentile response time
  p99ResponseTimeMs: number;

  // Error rate (percentage)
  errorRate: number;

  // System health before test
  initialHealth: any;

  // System health after test
  finalHealth: any;

  // Test duration in milliseconds
  testDurationMs: number;

  // Whether the test passed
  passed: boolean;

  // Failure reasons if the test failed
  failureReasons: string[];
}

// Default load test configuration
const DEFAULT_CONFIG: LoadTestConfig = {
  concurrentOperations: 50,
  testDurationMs: 30000, // 30 seconds
  operationDelayMs: 0,
  detailedLogging: true,
  maxAcceptableResponseTimeMs: 500,
  targetOpsPerSecond: 100
};

/**
 * Run a load test with the specified configuration
 */
export async function runLoadTest(
  config: Partial<LoadTestConfig> = {}
): Promise<LoadTestResults> {
  // Merge with default configuration
  const testConfig: LoadTestConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  logger.info('Starting load test', testConfig);

  // Bootstrap system
  const { registry } = systemBootstrap();

  // Check initial system health
  const initialHealth = await getSystemHealth();

  // Prepare test data
  const startTime = performance.now();
  const endTime = startTime + testConfig.testDurationMs;
  const responseTimes: number[] = [];
  const errors: Error[] = [];
  let totalOperations = 0;

  // Run test until duration is reached
  while (performance.now() < endTime) {
    const batchPromises: Promise<void>[] = [];

    // Create batch of concurrent operations
    for (let i = 0; i < testConfig.concurrentOperations; i++) {
      if (performance.now() >= endTime) break;

      // Create a test operation
      const operationPromise = executeTestOperation(i, totalOperations)
        .then(responseTime => {
          responseTimes.push(responseTime);
          if (testConfig.detailedLogging && totalOperations % 100 === 0) {
            logger.debug(`Operation ${totalOperations} completed in ${responseTime.toFixed(2)}ms`);
          }
        })
        .catch(error => {
          errors.push(error);
          logger.error(`Operation failed: ${error.message}`);
        });

      batchPromises.push(operationPromise);
      totalOperations++;

      // Add delay if configured
      if (testConfig.operationDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, testConfig.operationDelayMs));
      }
    }

    // Wait for batch to complete
    await Promise.all(batchPromises);
  }

  // Calculate test duration
  const actualTestDuration = performance.now() - startTime;

  // Check final system health
  const finalHealth = await getSystemHealth();

  // Calculate metrics
  const operationsPerSecond = totalOperations / (actualTestDuration / 1000);
  const averageResponseTimeMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const minResponseTimeMs = Math.min(...responseTimes);
  const maxResponseTimeMs = Math.max(...responseTimes);

  // Calculate standard deviation
  const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - averageResponseTimeMs, 2), 0) / responseTimes.length;
  const responseTimeStdDevMs = Math.sqrt(variance);

  // Calculate percentiles
  const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
  const p99Index = Math.floor(sortedResponseTimes.length * 0.99);
  const p95ResponseTimeMs = sortedResponseTimes[p95Index];
  const p99ResponseTimeMs = sortedResponseTimes[p99Index];

  // Calculate error rate
  const errorRate = (errors.length / totalOperations) * 100;

  // Determine if test passed
  const failureReasons: string[] = [];

  if (averageResponseTimeMs > testConfig.maxAcceptableResponseTimeMs) {
    failureReasons.push(`Average response time (${averageResponseTimeMs.toFixed(2)}ms) exceeds maximum acceptable (${testConfig.maxAcceptableResponseTimeMs}ms)`);
  }

  if (operationsPerSecond < testConfig.targetOpsPerSecond) {
    failureReasons.push(`Operations per second (${operationsPerSecond.toFixed(2)}) below target (${testConfig.targetOpsPerSecond})`);
  }

  if (errorRate > 1) {
    failureReasons.push(`Error rate (${errorRate.toFixed(2)}%) exceeds 1%`);
  }

  if (finalHealth.status !== 'healthy') {
    failureReasons.push(`System health degraded after test: ${finalHealth.status}`);
  }

  const passed = failureReasons.length === 0;

  // Create results
  const results: LoadTestResults = {
    totalOperations,
    operationsPerSecond,
    averageResponseTimeMs,
    minResponseTimeMs,
    maxResponseTimeMs,
    responseTimeStdDevMs,
    p95ResponseTimeMs,
    p99ResponseTimeMs,
    errorRate,
    initialHealth,
    finalHealth,
    testDurationMs: actualTestDuration,
    passed,
    failureReasons
  };

  // Log results
  logger.info('Load test completed', {
    totalOperations,
    operationsPerSecond: operationsPerSecond.toFixed(2),
    averageResponseTimeMs: averageResponseTimeMs.toFixed(2),
    p95ResponseTimeMs: p95ResponseTimeMs.toFixed(2),
    errorRate: errorRate.toFixed(2) + '%',
    passed,
    testDurationMs: actualTestDuration.toFixed(2)
  });

  if (!passed) {
    logger.warn('Load test failed', { failureReasons });
  }

  return results;
}

/**
 * Execute a test operation and measure response time
 */
async function executeTestOperation(
  operationIndex: number,
  globalIndex: number
): Promise<number> {
  const operationStartTime = performance.now();

  // Alternate between different operation types
  const operationType = globalIndex % 3;

  try {
    switch (operationType) {
      case 0:
        // Context operation
        await contextManager.storeContext({
          id: `load-test-${globalIndex}`,
          type: 'test',
          content: { value: operationIndex },
          metadata: {
            timestamp: Date.now(),
            source: 'load-test',
            priority: 1,
            tags: ['load-test']
          }
        });
        break;

      case 1:
        // Task routing operation
        await taskRouter.routeTask({
          id: `load-test-${globalIndex}`,
          type: 'audio_process',
          modelType: 'test',
          data: new Float32Array(1024).fill(0.5),
          storeResults: false
        });
        break;

      case 2:
        // Health check operation
        await getSystemHealth();
        break;
    }

    const operationEndTime = performance.now();
    return operationEndTime - operationStartTime;
  } catch (error) {
    const operationEndTime = performance.now();
    const duration = operationEndTime - operationStartTime;

    // Re-throw with duration information
    const enhancedError = new Error(`Operation failed after ${duration.toFixed(2)}ms: ${error instanceof Error ? error.message : String(error)}`);
    throw enhancedError;
  }
}

/**
 * Run a load test with increasing concurrency
 */
export async function runScalabilityTest(
  maxConcurrency = 100,
  step = 10
): Promise<Record<number, LoadTestResults>> {
  const results: Record<number, LoadTestResults> = {};

  logger.info('Starting scalability test', {
    maxConcurrency,
    step
  });

  for (let concurrency = step; concurrency <= maxConcurrency; concurrency += step) {
    logger.info(`Testing with concurrency: ${concurrency}`);

    const testResult = await runLoadTest({
      concurrentOperations: concurrency,
      testDurationMs: 10000, // 10 seconds per concurrency level
      detailedLogging: false
    });

    results[concurrency] = testResult;

    // If the test failed, stop increasing concurrency
    if (!testResult.passed) {
      logger.warn(`Scalability test stopped at concurrency ${concurrency} due to failures`);
      break;
    }

    // Short pause between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Log summary
  const concurrencyLevels = Object.keys(results).map(Number);
  const maxPassedConcurrency = Math.max(
    ...concurrencyLevels.filter(level => results[level].passed)
  );

  logger.info('Scalability test completed', {
    testedConcurrencyLevels: concurrencyLevels,
    maxPassedConcurrency,
    maxOpsPerSecond: results[maxPassedConcurrency].operationsPerSecond.toFixed(2)
  });

  return results;
}

// If this file is run directly, execute a load test
if (require.main === module) {
  runLoadTest()
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Load test failed with error:', error);
      process.exit(1);
    });
}
