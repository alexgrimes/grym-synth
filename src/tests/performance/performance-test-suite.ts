import {
  systemBootstrap,
  initializeSystem,
  shutdownSystem,
} from "../../integration";
import { taskRouter } from "../../orchestration";
import { contextManager } from "../../context";
import { serviceRegistry } from "../../services";
import { Logger } from "../../utils/logger";

const logger = new Logger({ namespace: "performance-tests" });

interface PerformanceMetrics {
  initializationTime: number;
  contextRetrievalTime: number;
  taskRoutingTime: number;
  endToEndTime: number;
}

interface TestResult {
  passed: boolean;
  metrics: PerformanceMetrics;
  failures: string[];
}

const PERFORMANCE_TARGETS = {
  INIT_TIME_MS: 1000, // 1 second
  CONTEXT_TIME_MS: 20, // 20ms
  ROUTING_TIME_MS: 30, // 30ms
  OVERHEAD_TIME_MS: 50, // 50ms
};

async function measureInitializationTime(): Promise<number> {
  const start = process.hrtime.bigint();
  await initializeSystem();
  const end = process.hrtime.bigint();
  await shutdownSystem(); // Clean up after measurement
  return Number(end - start) / 1_000_000; // Convert to milliseconds
}

async function measureContextRetrieval(): Promise<number> {
  // Set up test context
  await contextManager.storeContext({
    id: "test-context",
    type: "audio_parameters",
    content: {
      sampleRate: 44100,
      channels: 2,
    },
    metadata: {
      timestamp: new Date(),
      source: "performance-test",
      priority: 1,
    },
  });

  const start = process.hrtime.bigint();
  await contextManager.getContextForModel("wav2vec2", {
    types: ["audio_parameters"],
    minPriority: 1,
  });
  const end = process.hrtime.bigint();

  return Number(end - start) / 1_000_000;
}

async function measureTaskRouting(): Promise<number> {
  const task = {
    id: "perf-test-task",
    type: "audio_process",
    modelType: "wav2vec2",
    data: new Float32Array(1024), // Sample audio data
    storeResults: false,
  };

  const start = process.hrtime.bigint();
  await taskRouter.routeTask(task);
  const end = process.hrtime.bigint();

  return Number(end - start) / 1_000_000;
}

async function measureEndToEndExecution(): Promise<number> {
  const task = {
    id: "perf-test-e2e",
    type: "audio_process",
    modelType: "wav2vec2",
    data: new Float32Array(1024),
    storeResults: true,
    context: {
      tags: ["performance-test"],
    },
  };

  const start = process.hrtime.bigint();
  await taskRouter.routeTask(task);
  const end = process.hrtime.bigint();

  return Number(end - start) / 1_000_000;
}

export async function runPerformanceTests(
  iterations: number = 100
): Promise<TestResult> {
  const metrics: PerformanceMetrics[] = [];
  const failures: string[] = [];

  logger.info("Starting performance test suite", { iterations });

  try {
    // Measure initialization time (only once)
    const initTime = await measureInitializationTime();
    if (initTime > PERFORMANCE_TARGETS.INIT_TIME_MS) {
      failures.push(
        `Initialization time (${initTime}ms) exceeds target (${PERFORMANCE_TARGETS.INIT_TIME_MS}ms)`
      );
    }

    // Initialize system for remaining tests
    await initializeSystem();

    // Run multiple iterations
    for (let i = 0; i < iterations; i++) {
      const iterationMetrics: PerformanceMetrics = {
        initializationTime: initTime,
        contextRetrievalTime: await measureContextRetrieval(),
        taskRoutingTime: await measureTaskRouting(),
        endToEndTime: await measureEndToEndExecution(),
      };

      metrics.push(iterationMetrics);

      // Log progress
      if ((i + 1) % 10 === 0) {
        logger.debug(`Completed ${i + 1}/${iterations} iterations`);
      }
    }

    // Calculate averages
    const averageMetrics: PerformanceMetrics = {
      initializationTime: initTime,
      contextRetrievalTime:
        metrics.reduce((sum, m) => sum + m.contextRetrievalTime, 0) /
        iterations,
      taskRoutingTime:
        metrics.reduce((sum, m) => sum + m.taskRoutingTime, 0) / iterations,
      endToEndTime:
        metrics.reduce((sum, m) => sum + m.endToEndTime, 0) / iterations,
    };

    // Check against targets
    if (
      averageMetrics.contextRetrievalTime > PERFORMANCE_TARGETS.CONTEXT_TIME_MS
    ) {
      failures.push(
        `Average context retrieval time (${averageMetrics.contextRetrievalTime.toFixed(
          2
        )}ms) exceeds target (${PERFORMANCE_TARGETS.CONTEXT_TIME_MS}ms)`
      );
    }

    if (averageMetrics.taskRoutingTime > PERFORMANCE_TARGETS.ROUTING_TIME_MS) {
      failures.push(
        `Average task routing time (${averageMetrics.taskRoutingTime.toFixed(
          2
        )}ms) exceeds target (${PERFORMANCE_TARGETS.ROUTING_TIME_MS}ms)`
      );
    }

    const overhead =
      averageMetrics.endToEndTime - averageMetrics.taskRoutingTime;
    if (overhead > PERFORMANCE_TARGETS.OVERHEAD_TIME_MS) {
      failures.push(
        `Average overhead time (${overhead.toFixed(2)}ms) exceeds target (${
          PERFORMANCE_TARGETS.OVERHEAD_TIME_MS
        }ms)`
      );
    }

    logger.info("Performance test results", {
      averageMetrics,
      failures: failures.length,
    });

    return {
      passed: failures.length === 0,
      metrics: averageMetrics,
      failures,
    };
  } catch (error) {
    logger.error("Performance tests failed", { error });
    throw error;
  } finally {
    await shutdownSystem();
  }
}

// Example usage:
/*
async function verifyPerformance() {
  try {
    const result = await runPerformanceTests();
    console.log('Performance Test Results:', {
      passed: result.passed,
      metrics: {
        initializationTime: `${result.metrics.initializationTime.toFixed(2)}ms`,
        contextRetrievalTime: `${result.metrics.contextRetrievalTime.toFixed(2)}ms`,
        taskRoutingTime: `${result.metrics.taskRoutingTime.toFixed(2)}ms`,
        endToEndTime: `${result.metrics.endToEndTime.toFixed(2)}ms`
      }
    });

    if (!result.passed) {
      console.error('Performance Test Failures:', result.failures);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to run performance tests:', error);
    process.exit(1);
  }
}
*/
