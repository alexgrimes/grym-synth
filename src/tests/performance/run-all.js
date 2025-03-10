/**
 * Performance Test Runner Script
 *
 * This script runs all performance tests and generates a comprehensive report
 */
const { runEndToEndBenchmark } = require('./end-to-end-benchmark');
const { runVisualizationPerformanceTests } = require('./visualization-performance');
const { runMemoryUsageTests } = require('./memory-usage-test');
const { runThroughputTests } = require('./throughput-test');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('Performance Test Runner');
    console.log('=======================');

    // Create output directory
    const outputDir = path.join(process.cwd(), 'reports', 'performance');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const summaryPath = path.join(outputDir, `performance-summary-${timestamp}.json`);

    // Run tests
    console.log('\nRunning End-to-End Benchmark...');
    const benchmarkResult = await runEndToEndBenchmark({
      iterations: 5,
      warmupIterations: 1,
      outputDir,
      detailedReporting: true
    }).catch(error => {
      console.error('Error running end-to-end benchmark:', error);
      return null;
    });

    console.log('\nRunning Visualization Performance Tests...');
    const visualizationResult = await runVisualizationPerformanceTests({
      complexityLevels: [
        { dataPoints: 1000, iterations: 3 },
        { dataPoints: 10000, iterations: 2 }
      ],
      outputDir,
      detailedReporting: true
    }).catch(error => {
      console.error('Error running visualization performance tests:', error);
      return null;
    });

    console.log('\nRunning Memory Usage Tests...');
    const memoryResult = await runMemoryUsageTests({
      testDurationMs: 30000,
      operations: 500,
      outputDir,
      detailedReporting: true
    }).catch(error => {
      console.error('Error running memory usage tests:', error);
      return null;
    });

    console.log('\nRunning Throughput Tests...');
    const throughputResult = await runThroughputTests({
      testDurationMs: 30000,
      targetOpsPerSecond: 50,
      outputDir,
      detailedReporting: true
    }).catch(error => {
      console.error('Error running throughput tests:', error);
      return null;
    });

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      tests: {
        benchmark: benchmarkResult ? {
          success: true,
          averageExecutionTimeMs: benchmarkResult.averageExecutionTimeMs,
          p95ExecutionTimeMs: benchmarkResult.p95ExecutionTimeMs,
          errorCount: benchmarkResult.errorCount
        } : { success: false },

        visualization: visualizationResult ? {
          success: true,
          performanceScore: visualizationResult.performanceScore,
          recommendations: visualizationResult.recommendations
        } : { success: false },

        memory: memoryResult ? {
          success: true,
          initialHeapUsedMB: memoryResult.initialMemoryUsage.heapUsed / 1024 / 1024,
          peakHeapUsedMB: memoryResult.peakMemoryUsage.heapUsed / 1024 / 1024,
          memoryPerOperationKB: memoryResult.memoryPerOperation.heapUsed / 1024,
          leakDetected: memoryResult.leakTestResults?.leakDetected
        } : { success: false },

        throughput: throughputResult ? {
          success: true,
          operationsPerSecond: throughputResult.operationsPerSecond,
          averageResponseTimeMs: throughputResult.responseTimes.average,
          errorRate: throughputResult.errorRate
        } : { success: false }
      },

      overallPerformance: {
        score: calculateOverallScore(benchmarkResult, visualizationResult, memoryResult, throughputResult),
        recommendations: collectRecommendations(benchmarkResult, visualizationResult, memoryResult, throughputResult)
      }
    };

    // Write summary to file
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Print summary
    console.log('\nPerformance Test Summary:');
    console.log('========================');
    console.log(`Overall Performance Score: ${summary.overallPerformance.score}/100`);

    if (benchmarkResult) {
      console.log('\nEnd-to-End Benchmark:');
      console.log(`  Average Execution Time: ${benchmarkResult.averageExecutionTimeMs.toFixed(2)}ms`);
      console.log(`  95th Percentile: ${benchmarkResult.p95ExecutionTimeMs.toFixed(2)}ms`);
      console.log(`  Error Count: ${benchmarkResult.errorCount}`);
    } else {
      console.log('\nEnd-to-End Benchmark: Failed');
    }

    if (visualizationResult) {
      console.log('\nVisualization Performance:');
      console.log(`  Performance Score: ${visualizationResult.performanceScore}/100`);
    } else {
      console.log('\nVisualization Performance: Failed');
    }

    if (memoryResult) {
      console.log('\nMemory Usage:');
      console.log(`  Initial Heap: ${(memoryResult.initialMemoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Peak Heap: ${(memoryResult.peakMemoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Memory per Operation: ${(memoryResult.memoryPerOperation.heapUsed / 1024).toFixed(2)}KB`);
      console.log(`  Memory Leak Detected: ${memoryResult.leakTestResults?.leakDetected ? 'Yes' : 'No'}`);
    } else {
      console.log('\nMemory Usage: Failed');
    }

    if (throughputResult) {
      console.log('\nThroughput:');
      console.log(`  Operations per Second: ${throughputResult.operationsPerSecond.toFixed(2)}`);
      console.log(`  Average Response Time: ${throughputResult.responseTimes.average.toFixed(2)}ms`);
      console.log(`  Error Rate: ${(throughputResult.errorRate * 100).toFixed(2)}%`);
    } else {
      console.log('\nThroughput: Failed');
    }

    console.log('\nTop Recommendations:');
    summary.overallPerformance.recommendations.slice(0, 5).forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });

    console.log(`\nFull summary saved to: ${summaryPath}`);

    process.exit(0);
  } catch (error) {
    console.error('Error running performance tests:', error);
    process.exit(1);
  }
}

/**
 * Calculate overall performance score
 */
function calculateOverallScore(benchmark, visualization, memory, throughput) {
  let score = 0;
  let testsCount = 0;

  // Benchmark score (max 25 points)
  if (benchmark) {
    testsCount++;

    // Lower execution time is better
    const benchmarkScore = Math.max(0, 25 - (benchmark.averageExecutionTimeMs / 100));
    score += benchmarkScore;
  }

  // Visualization score (max 25 points)
  if (visualization) {
    testsCount++;
    score += visualization.performanceScore * 0.25;
  }

  // Memory score (max 25 points)
  if (memory) {
    testsCount++;

    // Lower memory per operation is better (target: <10KB)
    const memoryScore = Math.max(0, 25 - (memory.memoryPerOperation.heapUsed / 1024 / 10) * 5);

    // Penalty for memory leaks
    const leakPenalty = memory.leakTestResults?.leakDetected ? 10 : 0;

    score += Math.max(0, memoryScore - leakPenalty);
  }

  // Throughput score (max 25 points)
  if (throughput) {
    testsCount++;

    // Higher operations per second is better (target: 100 ops/sec)
    const throughputScore = Math.min(15, throughput.operationsPerSecond / 100 * 15);

    // Lower response time is better (target: <100ms)
    const responseTimeScore = Math.max(0, 10 - (throughput.responseTimes.average / 100));

    score += throughputScore + responseTimeScore;
  }

  // Adjust score if not all tests ran
  if (testsCount === 0) return 0;

  return Math.round((score / testsCount) * (4 / testsCount));
}

/**
 * Collect recommendations from all tests
 */
function collectRecommendations(benchmark, visualization, memory, throughput) {
  const recommendations = [];

  if (benchmark && benchmark.recommendations) {
    recommendations.push(...benchmark.recommendations);
  }

  if (visualization && visualization.recommendations) {
    recommendations.push(...visualization.recommendations);
  }

  if (memory && memory.recommendations) {
    recommendations.push(...memory.recommendations);
  }

  if (throughput && throughput.recommendations) {
    recommendations.push(...throughput.recommendations);
  }

  // Add overall recommendations
  if (recommendations.length === 0) {
    recommendations.push('Run individual performance tests for detailed recommendations');
  }

  return recommendations;
}

main();
