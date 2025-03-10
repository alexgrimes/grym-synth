/**
 * Reliability Testing
 *
 * Test system stability over extended operations
 */
import { performance } from 'perf_hooks';
import { systemBootstrap, getSystemHealth } from '../../services/integration';
import { contextManager } from '../../context';
import { taskRouter } from '../../orchestration';
import { Logger } from '../../utils/logger';

const logger = new Logger({ namespace: 'reliability-testing' });

// Define reliability test configuration
interface ReliabilityTestConfig {
  // Duration of the test in milliseconds
  testDurationMs: number;

  // Interval between health checks in milliseconds
  healthCheckIntervalMs: number;

  // Interval between operations in milliseconds
  operationIntervalMs: number;

  // Whether to introduce simulated failures
  introduceFailures: boolean;

  // Failure rate (0-1)
  failureRate: number;

  // Whether to log detailed metrics
  detailedLogging: boolean;

  // Maximum acceptable error rate
  maxAcceptableErrorRate: number;

  // Maximum acceptable degraded time (percentage)
  maxAcceptableDegradedTimePercent: number;
}

// Define reliability test results
interface ReliabilityTestResults {
  // Total operations executed
  totalOperations: number;

  // Successful operations
  successfulOperations: number;

  // Failed operations
  failedOperations: number;

  // Error rate (percentage)
  errorRate: number;

  // System health checks
  healthChecks: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };

  // Percentage of time in each health state
  healthPercentages: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };

  // Memory usage over time
  memoryUsage: {
    start: number;
    end: number;
    peak: number;
    average: number;
  };

  // Test duration in milliseconds
  testDurationMs: number;

  // Whether the test passed
  passed: boolean;

  // Failure reasons if the test failed
  failureReasons: string[];
}

// Default reliability test configuration
const DEFAULT_CONFIG: ReliabilityTestConfig = {
  testDurationMs: 300000, // 5 minutes
  healthCheckIntervalMs: 5000, // 5 seconds
  operationIntervalMs: 100, // 100ms
  introduceFailures: true,
  failureRate: 0.01, // 1%
  detailedLogging: true,
  maxAcceptableErrorRate: 2, // 2%
  maxAcceptableDegradedTimePercent: 5 // 5%
};

/**
 * Run a reliability test with the specified configuration
 */
export async function runReliabilityTest(
  config: Partial<ReliabilityTestConfig> = {}
): Promise<ReliabilityTestResults> {
  // Merge with default configuration
  const testConfig: ReliabilityTestConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };

  logger.info('Starting reliability test', testConfig);

  // Bootstrap system
  const { registry } = systemBootstrap();

  // Prepare test data
  const startTime = performance.now();
  const endTime = startTime + testConfig.testDurationMs;
  let totalOperations = 0;
  let successfulOperations = 0;
  let failedOperations = 0;

  // Health check data
  const healthChecks = {
    total: 0,
    healthy: 0,
    degraded: 0,
    unhealthy: 0
  };

  // Memory usage data
  const memoryUsage = {
    start: process.memoryUsage().heapUsed,
    current: 0,
    peak: 0,
    samples: [] as number[]
  };

  // Set up health check interval
  const healthCheckInterval = setInterval(async () => {
    try {
      const health = await getSystemHealth();
      healthChecks.total++;

      switch (health.status) {
        case 'healthy':
          healthChecks.healthy++;
          break;
        case 'degraded':
          healthChecks.degraded++;
          break;
        case 'unhealthy':
          healthChecks.unhealthy++;
          break;
      }

      // Track memory usage
      const currentMemory = process.memoryUsage().heapUsed;
      memoryUsage.current = currentMemory;
      memoryUsage.samples.push(currentMemory);
      memoryUsage.peak = Math.max(memoryUsage.peak, currentMemory);

      if (testConfig.detailedLogging) {
        logger.debug('Health check', {
          status: health.status,
          memoryUsageMB: (currentMemory / 1024 / 1024).toFixed(2),
          operationsCompleted: totalOperations
        });
      }
    } catch (error) {
      logger.error('Health check failed', { error });
    }
  }, testConfig.healthCheckIntervalMs);

  // Run operations until test duration is reached
  while (performance.now() < endTime) {
    try {
      // Determine if this operation should fail
      const shouldFail = testConfig.introduceFailures && Math.random() < testConfig.failureRate;

      if (shouldFail) {
        // Simulate failure
        throw new Error('Simulated failure');
      }

      // Execute operation
      await executeReliabilityOperation(totalOperations);
      successfulOperations++;
    } catch (error) {
      failedOperations++;

      if (testConfig.detailedLogging && failedOperations % 10 === 0) {
        logger.warn(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    totalOperations++;

    // Add delay between operations
    await new Promise(resolve => setTimeout(resolve, testConfig.operationIntervalMs));
  }

  // Clear health check interval
  clearInterval(healthCheckInterval);

  // Calculate test duration
  const actualTestDuration = performance.now() - startTime;

  // Calculate error rate
  const errorRate = (failedOperations / totalOperations) * 100;

  // Calculate health percentages
  const healthPercentages = {
    healthy: (healthChecks.healthy / healthChecks.total) * 100,
    degraded: (healthChecks.degraded / healthChecks.total) * 100,
    unhealthy: (healthChecks.unhealthy / healthChecks.total) * 100
  };

  // Calculate average memory usage
  const averageMemory = memoryUsage.samples.reduce((sum, mem) => sum + mem, 0) / memoryUsage.samples.length;

  // Determine if test passed
  const failureReasons: string[] = [];

  if (errorRate > testConfig.maxAcceptableErrorRate) {
    failureReasons.push(`Error rate (${errorRate.toFixed(2)}%) exceeds maximum acceptable (${testConfig.maxAcceptableErrorRate}%)`);
  }

  if (healthPercentages.degraded > testConfig.maxAcceptableDegradedTimePercent) {
    failureReasons.push(`System was degraded for ${healthPercentages.degraded.toFixed(2)}% of the time, exceeding maximum acceptable (${testConfig.maxAcceptableDegradedTimePercent}%)`);
  }

  if (healthPercentages.unhealthy > 0) {
    failureReasons.push(`System was unhealthy for ${healthPercentages.unhealthy.toFixed(2)}% of the time`);
  }

  const passed = failureReasons.length === 0;

  // Create results
  const results: ReliabilityTestResults = {
    totalOperations,
    successfulOperations,
    failedOperations,
    errorRate,
    healthChecks,
    healthPercentages,
    memoryUsage: {
      start: memoryUsage.start,
      end: memoryUsage.current,
      peak: memoryUsage.peak,
      average: averageMemory
    },
    testDurationMs: actualTestDuration,
    passed,
    failureReasons
  };

  // Log results
  logger.info('Reliability test completed', {
    totalOperations,
    errorRate: errorRate.toFixed(2) + '%',
    healthPercentages: {
      healthy: healthPercentages.healthy.toFixed(2) + '%',
      degraded: healthPercentages.degraded.toFixed(2) + '%',
      unhealthy: healthPercentages.unhealthy.toFixed(2) + '%'
    },
    memoryUsageMB: {
      start: (memoryUsage.start / 1024 / 1024).toFixed(2),
      end: (memoryUsage.current / 1024 / 1024).toFixed(2),
      peak: (memoryUsage.peak / 1024 / 1024).toFixed(2),
      average: (averageMemory / 1024 / 1024).toFixed(2)
    },
    passed,
    testDurationMs: actualTestDuration.toFixed(2)
  });

  if (!passed) {
    logger.warn('Reliability test failed', { failureReasons });
  }

  return results;
}

/**
 * Execute a reliability test operation
 */
async function executeReliabilityOperation(operationIndex: number): Promise<void> {
  // Alternate between different operation types
  const operationType = operationIndex % 4;

  switch (operationType) {
    case 0:
      // Context storage operation
      await contextManager.storeContext({
        id: `reliability-test-${operationIndex}`,
        type: 'test',
        content: { value: operationIndex },
        metadata: {
          timestamp: Date.now(),
          source: 'reliability-test',
          priority: 1,
          tags: ['reliability-test']
        }
      });
      break;

    case 1:
      // Context retrieval operation
      await contextManager.getContextForModel('test', {
        types: ['test']
      });
      break;

    case 2:
      // Task routing operation
      await taskRouter.routeTask({
        id: `reliability-test-${operationIndex}`,
        type: 'audio_process',
        modelType: 'test',
        data: new Float32Array(512).fill(0.5),
        storeResults: false
      });
      break;

    case 3:
      // Health check operation
      await getSystemHealth();
      break;
  }
}

/**
 * Run a long-term reliability test
 */
export async function runLongTermReliabilityTest(
  durationHours = 24
): Promise<ReliabilityTestResults> {
  const durationMs = durationHours * 60 * 60 * 1000;

  logger.info(`Starting long-term reliability test (${durationHours} hours)`);

  return runReliabilityTest({
    testDurationMs: durationMs,
    healthCheckIntervalMs: 60000, // 1 minute
    operationIntervalMs: 500, // 500ms
    detailedLogging: false
  });
}

/**
 * Run a reliability test with simulated component failures
 */
export async function runFailureRecoveryTest(): Promise<ReliabilityTestResults> {
  logger.info('Starting failure recovery test');

  // Bootstrap system
  const { registry } = systemBootstrap();

  // Get component names
  const componentNames = registry.getComponentIds();

  // Set up failure simulation
  let failureIndex = 0;
  const failureInterval = setInterval(() => {
    // Select a component to fail
    const componentName = componentNames[failureIndex % componentNames.length];
    const component = registry.getComponent(componentName);

    if (component && !registry.isComponentCritical(componentName)) {
      // Save original checkHealth method
      const originalCheckHealth = component.checkHealth;

      // Simulate failure
      component.checkHealth = () => ({
        status: 'unhealthy',
        error: new Error('Simulated failure')
      });

      logger.info(`Simulated failure in component: ${componentName}`);

      // Restore after 10 seconds
      setTimeout(() => {
        if (component.checkHealth !== originalCheckHealth) {
          component.checkHealth = originalCheckHealth;
          logger.info(`Restored component: ${componentName}`);
        }
      }, 10000);
    }

    failureIndex++;
  }, 30000); // Introduce a failure every 30 seconds

  // Run reliability test
  const results = await runReliabilityTest({
    testDurationMs: 300000, // 5 minutes
    introduceFailures: false, // We're manually introducing failures
    maxAcceptableDegradedTimePercent: 30 // Allow more degraded time for this test
  });

  // Clear failure interval
  clearInterval(failureInterval);

  return results;
}

// If this file is run directly, execute a reliability test
if (require.main === module) {
  runReliabilityTest()
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Reliability test failed with error:', error);
      process.exit(1);
    });
}
