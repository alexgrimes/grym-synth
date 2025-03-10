import { TestRunner } from './test-runner';
import { TestResults, TestReport } from './types';

/**
 * Run performance tests and handle results
 */
export async function runPerformanceTests(
  outputDir: string = 'test-results'
): Promise<{
  success: boolean;
  results: TestResults[];
  report: TestReport;
}> {
  const runner = new TestRunner(outputDir);

  try {
    const { results, report } = await runner.runTests();
    const success = results.every(r => r.success);

    // Log test results
    console.log('\nPerformance Test Results:');
    console.log('------------------------');
    
    results.forEach(result => {
      console.log(`\nPhase: ${result.phaseName}`);
      console.log(`Status: ${result.success ? 'PASS' : 'FAIL'}`);
      
      if (result.metrics) {
        console.log('\nMetrics:');
        console.log(`- Memory Usage: ${formatBytes(result.metrics.memoryUsage.peak)}`);
        console.log(`- Response Time: ${result.metrics.modelMetrics.responseLatency}ms`);
        console.log(`- Context Preservation: ${(result.metrics.contextStats.compressionRatio * 100).toFixed(1)}%`);
      }

      if (result.error) {
        console.log(`\nError: ${result.error}`);
      }
    });

    // Log summary
    console.log('\nTest Summary:');
    console.log('-------------');
    console.log(`Total Phases: ${report.summary.totalPhases}`);
    console.log(`Passed Phases: ${report.summary.passedPhases}`);
    console.log(`Total Duration: ${formatDuration(report.summary.duration)}`);
    console.log(`Overall Status: ${success ? 'PASS' : 'FAIL'}`);

    // Log recommendations if any
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      console.log('----------------');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    await runner.cleanup();

    return {
      success,
      results,
      report
    };

  } catch (error) {
    console.error('Error running performance tests:', error);
    throw error;
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration to human readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ') || '0s';
}