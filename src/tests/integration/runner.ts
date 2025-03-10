/**
 * Integration Test Runner and Reporter
 *
 * Executes all integration tests with proper setup/teardown and generates detailed reports.
 */

import { integrationTestFramework } from './framework';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { Logger } from '../../utils/logger';

// Configure logger
const logger = new Logger({ namespace: 'integration-test-runner' });

// Test result types
interface TestResult {
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
  memoryUsage?: number;
  cpuUsage?: number;
}

interface SuiteResult {
  name: string;
  tests: TestResult[];
  duration: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

interface TestReport {
  timestamp: string;
  duration: number;
  suites: SuiteResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  memoryUsage: number;
  cpuUsage?: number;
  bottlenecks: {
    slowestTests: TestResult[];
    highestMemoryTests: TestResult[];
    highestCpuTests: TestResult[];
  };
}

// Runner configuration
interface RunnerConfig {
  suites?: string[];
  outputDir?: string;
  reportFormat?: 'json' | 'html' | 'console' | 'all';
  failFast?: boolean;
  timeout?: number;
  concurrency?: number;
  memoryThreshold?: number; // MB
  cpuThreshold?: number; // percentage
}

/**
 * Main test runner class
 */
export class IntegrationTestRunner {
  private config: RunnerConfig;
  private results: TestResult[] = [];
  private startTime: bigint = 0n;
  private endTime: bigint = 0n;
  private initialMemoryUsage: number = 0;

  constructor(config: RunnerConfig = {}) {
    // Set default configuration
    this.config = {
      suites: config.suites || ['pattern-recognition', 'audio-processing', 'orchestration', 'end-to-end'],
      outputDir: config.outputDir || path.join(process.cwd(), 'reports', 'integration'),
      reportFormat: config.reportFormat || 'all',
      failFast: config.failFast !== undefined ? config.failFast : false,
      timeout: config.timeout || 60000, // 60 seconds
      concurrency: config.concurrency || 1,
      memoryThreshold: config.memoryThreshold || 200, // 200 MB
      cpuThreshold: config.cpuThreshold || 80, // 80%
    };
  }

  /**
   * Run all integration tests
   */
  async runTests(): Promise<TestReport> {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.config.outputDir!)) {
      fs.mkdirSync(this.config.outputDir!, { recursive: true });
    }

    // Initialize the test framework
    await integrationTestFramework.initialize({
      enableHealthMonitoring: true,
      healthCheckIntervalMs: 1000,
    });

    // Record initial memory usage
    this.initialMemoryUsage = process.memoryUsage().heapUsed;

    // Start timing
    this.startTime = process.hrtime.bigint();
    logger.info('Starting integration test run', { config: this.config });

    try {
      // Run each test suite
      for (const suite of this.config.suites!) {
        await this.runSuite(suite);
      }
    } finally {
      // Ensure framework is shut down
      await integrationTestFramework.shutdown();
    }

    // End timing
    this.endTime = process.hrtime.bigint();
    const duration = Number(this.endTime - this.startTime) / 1_000_000; // ms

    // Generate report
    const report = this.generateReport(duration);

    // Output report
    this.outputReport(report);

    return report;
  }

  /**
   * Run a specific test suite
   */
  private async runSuite(suiteName: string): Promise<void> {
    const suitePath = path.join(__dirname, 'suites', `${suiteName}.test.ts`);

    // Check if suite exists
    if (!fs.existsSync(suitePath)) {
      logger.warn(`Test suite not found: ${suiteName}`, { path: suitePath });
      return;
    }

    logger.info(`Running test suite: ${suiteName}`);

    try {
      // Import the test suite
      const suite = require(suitePath);

      // Get all test functions
      const testFunctions = Object.keys(suite)
        .filter(key => typeof suite[key] === 'function' && key.startsWith('test'));

      // Run each test
      for (const testName of testFunctions) {
        await this.runTest(testName, suiteName, suite[testName]);

        // Check if we should stop on failure
        if (this.config.failFast && this.results.some(r => r.status === 'failed')) {
          logger.info('Stopping test run due to failFast option');
          break;
        }
      }
    } catch (error) {
      logger.error(`Error running test suite: ${suiteName}`, { error });
    }
  }

  /**
   * Run a specific test
   */
  private async runTest(testName: string, suiteName: string, testFn: Function): Promise<void> {
    logger.info(`Running test: ${testName} in suite ${suiteName}`);

    const startTime = performance.now();
    const initialMemory = process.memoryUsage().heapUsed;

    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: Error | undefined;

    try {
      // Set timeout
      const timeoutId = setTimeout(() => {
        throw new Error(`Test timed out after ${this.config.timeout}ms`);
      }, this.config.timeout);

      // Run the test
      await testFn();

      // Clear timeout
      clearTimeout(timeoutId);
    } catch (e) {
      status = 'failed';
      error = e instanceof Error ? e : new Error(String(e));
      logger.error(`Test failed: ${testName}`, { error });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const memoryUsage = (process.memoryUsage().heapUsed - initialMemory) / (1024 * 1024); // MB

    // Record test result
    this.results.push({
      name: testName,
      suite: suiteName,
      status,
      duration,
      error,
      memoryUsage,
    });

    logger.info(`Test completed: ${testName}`, {
      status,
      duration: `${duration.toFixed(2)}ms`,
      memoryUsage: `${memoryUsage.toFixed(2)}MB`,
    });
  }

  /**
   * Generate test report
   */
  private generateReport(totalDuration: number): TestReport {
    // Group results by suite
    const suiteResults: Record<string, SuiteResult> = {};

    for (const result of this.results) {
      if (!suiteResults[result.suite]) {
        suiteResults[result.suite] = {
          name: result.suite,
          tests: [],
          duration: 0,
          passedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          memoryUsage: 0,
        };
      }

      suiteResults[result.suite].tests.push(result);
      suiteResults[result.suite].duration += result.duration;

      if (result.status === 'passed') {
        suiteResults[result.suite].passedCount++;
      } else if (result.status === 'failed') {
        suiteResults[result.suite].failedCount++;
      } else {
        suiteResults[result.suite].skippedCount++;
      }

      if (result.memoryUsage) {
        suiteResults[result.suite].memoryUsage! += result.memoryUsage;
      }
    }

    // Calculate totals
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.filter(r => r.status === 'failed').length;
    const skippedTests = this.results.filter(r => r.status === 'skipped').length;

    // Calculate memory usage
    const finalMemoryUsage = process.memoryUsage().heapUsed;
    const totalMemoryUsage = (finalMemoryUsage - this.initialMemoryUsage) / (1024 * 1024); // MB

    // Find bottlenecks
    const sortedByDuration = [...this.results].sort((a, b) => b.duration - a.duration);
    const sortedByMemory = [...this.results].filter(r => r.memoryUsage).sort((a, b) => (b.memoryUsage || 0) - (a.memoryUsage || 0));
    const sortedByCpu = [...this.results].filter(r => r.cpuUsage).sort((a, b) => (b.cpuUsage || 0) - (a.cpuUsage || 0));

    return {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      suites: Object.values(suiteResults),
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      memoryUsage: totalMemoryUsage,
      bottlenecks: {
        slowestTests: sortedByDuration.slice(0, 5),
        highestMemoryTests: sortedByMemory.slice(0, 5),
        highestCpuTests: sortedByCpu.slice(0, 5),
      },
    };
  }

  /**
   * Output test report in the specified format
   */
  private outputReport(report: TestReport): void {
    const formats = this.config.reportFormat === 'all'
      ? ['json', 'html', 'console']
      : [this.config.reportFormat!];

    for (const format of formats) {
      switch (format) {
        case 'json':
          this.outputJsonReport(report);
          break;
        case 'html':
          this.outputHtmlReport(report);
          break;
        case 'console':
          this.outputConsoleReport(report);
          break;
      }
    }
  }

  /**
   * Output JSON report
   */
  private outputJsonReport(report: TestReport): void {
    const outputPath = path.join(this.config.outputDir!, 'integration-test-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    logger.info(`JSON report written to ${outputPath}`);
  }

  /**
   * Output HTML report
   */
  private outputHtmlReport(report: TestReport): void {
    const outputPath = path.join(this.config.outputDir!, 'integration-test-report.html');

    // Generate HTML content
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Integration Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .summary {
      display: flex;
      justify-content: space-between;
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
    }
    .passed { color: #4CAF50; }
    .failed { color: #F44336; }
    .skipped { color: #FF9800; }
    .suite {
      margin-bottom: 30px;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
    }
    .suite-header {
      background-color: #0066cc;
      color: white;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
    }
    .suite-body {
      padding: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .bottlenecks {
      margin-top: 30px;
    }
    .error-details {
      background-color: #ffebee;
      padding: 10px;
      border-radius: 5px;
      margin-top: 5px;
      white-space: pre-wrap;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h1>Integration Test Report</h1>
  <p>Generated on: ${new Date(report.timestamp).toLocaleString()}</p>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-value">${report.totalTests}</div>
      <div>Total Tests</div>
    </div>
    <div class="summary-item">
      <div class="summary-value passed">${report.passedTests}</div>
      <div>Passed</div>
    </div>
    <div class="summary-item">
      <div class="summary-value failed">${report.failedTests}</div>
      <div>Failed</div>
    </div>
    <div class="summary-item">
      <div class="summary-value skipped">${report.skippedTests}</div>
      <div>Skipped</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${(report.duration / 1000).toFixed(2)}s</div>
      <div>Duration</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${report.memoryUsage.toFixed(2)}MB</div>
      <div>Memory Usage</div>
    </div>
  </div>

  <h2>Test Suites</h2>
  ${report.suites.map(suite => `
    <div class="suite">
      <div class="suite-header">
        <h3>${suite.name}</h3>
        <div>${suite.passedCount}/${suite.tests.length} passed • ${(suite.duration / 1000).toFixed(2)}s</div>
      </div>
      <div class="suite-body">
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Memory</th>
            </tr>
          </thead>
          <tbody>
            ${suite.tests.map(test => `
              <tr>
                <td>${test.name}</td>
                <td class="${test.status}">${test.status}</td>
                <td>${test.duration.toFixed(2)}ms</td>
                <td>${test.memoryUsage ? test.memoryUsage.toFixed(2) + 'MB' : 'N/A'}</td>
              </tr>
              ${test.error ? `
              <tr>
                <td colspan="4">
                  <div class="error-details">${test.error.stack || test.error.message}</div>
                </td>
              </tr>
              ` : ''}
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('')}

  <div class="bottlenecks">
    <h2>Performance Bottlenecks</h2>

    <h3>Slowest Tests</h3>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Suite</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${report.bottlenecks.slowestTests.map(test => `
          <tr>
            <td>${test.name}</td>
            <td>${test.suite}</td>
            <td>${test.duration.toFixed(2)}ms</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h3>Highest Memory Usage</h3>
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Suite</th>
          <th>Memory Usage</th>
        </tr>
      </thead>
      <tbody>
        ${report.bottlenecks.highestMemoryTests.map(test => `
          <tr>
            <td>${test.name}</td>
            <td>${test.suite}</td>
            <td>${test.memoryUsage ? test.memoryUsage.toFixed(2) + 'MB' : 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;

    fs.writeFileSync(outputPath, html);
    logger.info(`HTML report written to ${outputPath}`);
  }

  /**
   * Output console report
   */
  private outputConsoleReport(report: TestReport): void {
    console.log('\n=== Integration Test Report ===');
    console.log(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    console.log(`Skipped: ${report.skippedTests}`);
    console.log(`Memory Usage: ${report.memoryUsage.toFixed(2)}MB`);

    console.log('\n=== Test Suites ===');
    for (const suite of report.suites) {
      console.log(`\n${suite.name} (${suite.passedCount}/${suite.tests.length} passed, ${(suite.duration / 1000).toFixed(2)}s)`);

      for (const test of suite.tests) {
        const status = test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '○';
        console.log(`  ${status} ${test.name} (${test.duration.toFixed(2)}ms)`);

        if (test.error) {
          console.log(`    Error: ${test.error.message}`);
        }
      }
    }

    console.log('\n=== Performance Bottlenecks ===');
    console.log('\nSlowest Tests:');
    for (const test of report.bottlenecks.slowestTests) {
      console.log(`  ${test.name} (${test.suite}) - ${test.duration.toFixed(2)}ms`);
    }

    console.log('\nHighest Memory Usage:');
    for (const test of report.bottlenecks.highestMemoryTests) {
      console.log(`  ${test.name} (${test.suite}) - ${test.memoryUsage?.toFixed(2)}MB`);
    }

    console.log('\n===============================\n');
  }
}

/**
 * Run specific test suites
 */
export async function runSpecificSuites(suites: string[]): Promise<TestReport> {
  const runner = new IntegrationTestRunner({
    suites,
    reportFormat: 'all',
  });

  return runner.runTests();
}

/**
 * Run all integration tests
 */
export async function runAllTests(): Promise<TestReport> {
  const runner = new IntegrationTestRunner({
    reportFormat: 'all',
  });

  return runner.runTests();
}

// If this file is run directly, run all tests
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const suites = args.length > 0 ? args : undefined;

  const runner = new IntegrationTestRunner({
    suites,
    reportFormat: 'all',
  });

  runner.runTests()
    .then(report => {
      // Exit with appropriate code
      process.exit(report.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Error running tests:', error);
      process.exit(1);
    });
}
