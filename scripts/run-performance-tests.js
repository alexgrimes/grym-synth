#!/usr/bin/env node

/**
 * Performance Test Runner
 *
 * This script runs all performance tests and generates a comprehensive report.
 */

const { runEndToEndBenchmark } = require('../dist/tests/performance/end-to-end-benchmark');
const { runVisualizationTests } = require('../dist/tests/performance/visualization-performance');
const { runMemoryUsageTest } = require('../dist/tests/performance/memory-usage-test');
const { runThroughputTest } = require('../dist/tests/performance/throughput-test');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  reportDir: path.join(process.cwd(), 'reports', 'performance'),
  endToEndConfig: {
    iterations: 50,
    testDataSize: 'medium',
    parallel: true,
    maxParallelOperations: 4
  },
  visualizationConfig: {
    iterations: 5,
    complexityLevel: 5,
    resolutionWidth: 1280,
    resolutionHeight: 720
  },
  memoryConfig: {
    durationMs: 60000, // 1 minute
    simulateLeaks: false
  },
  throughputConfig: {
    durationMs: 30000, // 30 seconds
    targetOpsPerSecond: 50,
    testDataSize: 'medium'
  }
};

// Ensure report directory exists
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir, { recursive: true });
}

/**
 * Runs all performance tests
 */
async function runPerformanceTests() {
  console.log('Starting Performance Tests');
  console.log('=========================');

  const startTime = Date.now();
  const results = {};

  try {
    // Run end-to-end benchmark
    console.log('\nRunning End-to-End Benchmark...');
    results.benchmark = await runEndToEndBenchmark(config.endToEndConfig);
    console.log(`✓ Benchmark completed: ${results.benchmark.metrics.operationsPerSecond.toFixed(2)} ops/sec`);

    // Run visualization tests
    console.log('\nRunning Visualization Performance Tests...');
    results.visualization = await runVisualizationTests(config.visualizationConfig);
    console.log(`✓ Visualization tests completed: ${results.visualization.metrics.avgFps.toFixed(2)} FPS`);

    // Run memory usage test
    console.log('\nRunning Memory Usage Tests...');
    results.memory = await runMemoryUsageTest(config.memoryConfig);
    console.log(`✓ Memory tests completed: ${results.memory.metrics.peakMemoryUsageMB.toFixed(2)} MB peak`);

    // Run throughput test
    console.log('\nRunning Throughput Tests...');
    results.throughput = await runThroughputTest(config.throughputConfig);
    console.log(`✓ Throughput tests completed: ${results.throughput.metrics.operationsPerSecond.toFixed(2)} ops/sec`);

    // Generate summary report
    const summaryReport = generateSummaryReport(results);

    // Save summary report
    const reportPath = path.join(config.reportDir, `performance-summary-${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2));

    // Print summary
    console.log('\nPerformance Test Summary');
    console.log('=======================');
    console.log(`Total Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
    console.log(`End-to-End Benchmark: ${summaryReport.benchmark.operationsPerSecond} ops/sec`);
    console.log(`Visualization Performance: ${summaryReport.visualization.avgFps} FPS`);
    console.log(`Memory Usage: ${summaryReport.memory.peakMemoryUsageMB} MB peak`);
    console.log(`Throughput: ${summaryReport.throughput.operationsPerSecond} ops/sec`);
    console.log(`Report saved to: ${reportPath}`);

    // Return success code
    process.exit(0);
  } catch (error) {
    console.error('Performance tests failed:', error);
    process.exit(1);
  }
}

/**
 * Generates a summary report from all test results
 *
 * @param {Object} results - Test results
 * @returns {Object} Summary report
 */
function generateSummaryReport(results) {
  return {
    timestamp: new Date().toISOString(),
    benchmark: {
      operationsPerSecond: results.benchmark.metrics.operationsPerSecond.toFixed(2),
      avgExecutionTimeMs: results.benchmark.metrics.avgExecutionTimeMs.toFixed(2),
      p95ExecutionTimeMs: results.benchmark.metrics.p95ExecutionTimeMs.toFixed(2)
    },
    visualization: {
      avgFps: results.visualization.metrics.avgFps.toFixed(2),
      minFps: results.visualization.metrics.minFps.toFixed(2),
      avgFrameTimeMs: results.visualization.metrics.avgFrameTimeMs.toFixed(2),
      timeToFirstFrameMs: results.visualization.metrics.timeToFirstFrameMs.toFixed(2)
    },
    memory: {
      initialMemoryUsageMB: results.memory.metrics.initialMemoryUsageMB.toFixed(2),
      finalMemoryUsageMB: results.memory.metrics.finalMemoryUsageMB.toFixed(2),
      peakMemoryUsageMB: results.memory.metrics.peakMemoryUsageMB.toFixed(2),
      memoryGrowthRateMBPerMinute: results.memory.metrics.memoryGrowthRateMBPerMinute.toFixed(2),
      leaksDetected: results.memory.metrics.leaksDetected
    },
    throughput: {
      operationsPerSecond: results.throughput.metrics.operationsPerSecond.toFixed(2),
      dataThroughputMBps: (results.throughput.metrics.dataThroughputBytesPerSecond / 1024 / 1024).toFixed(2),
      avgExecutionTimeMs: results.throughput.metrics.avgExecutionTimeMs.toFixed(2),
      errorRate: (results.throughput.metrics.errorRate * 100).toFixed(2)
    },
    systemInfo: results.benchmark.systemInfo
  };
}

// Run the tests
runPerformanceTests();
