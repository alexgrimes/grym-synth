/**
 * Run All Tests for grym-synth Backend Integration
 *
 * This script runs all the tests for the grym-synth backend integration system.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  reportDir: path.join(process.cwd(), 'reports', 'tests'),
  verbose: true,
};

// Ensure report directory exists
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir, { recursive: true });
}

// Logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
};

// Run a command and return the output
function runCommand(command, options = {}) {
  logger.info(`Running command: ${command}`);
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout,
      error: error.stderr || error.message,
    };
  }
}

// Run API tests
function runApiTests() {
  logger.info('Running API tests...');

  const result = runCommand('node scripts/run-api-tests.js');
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  };
}

// Run visualization tests
function runVisualizationTests() {
  logger.info('Running visualization tests...');

  const result = runCommand('node scripts/run-visualization-tests.js');
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  };
}

// Run resource manager tests
function runResourceTests() {
  logger.info('Running resource manager tests...');

  const result = runCommand('node scripts/run-resource-tests.js');
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  };
}

// Run performance tests
function runPerformanceTests() {
  logger.info('Running performance tests...');

  const result = runCommand('node src/tests/performance/benchmarkTests.js');
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  };
}

// Generate a test report
function generateReport(results) {
  logger.info('Generating test report...');

  const reportPath = path.join(config.reportDir, `all-tests-report-${new Date().toISOString().replace(/:/g, '-')}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.success(`Test report generated: ${reportPath}`);

  return report;
}

// Main function
async function main() {
  logger.info('Starting all grym-synth tests');

  // Run all tests
  const results = {
    api: runApiTests(),
    visualization: runVisualizationTests(),
    resource: runResourceTests(),
    performance: runPerformanceTests(),
  };

  // Generate report
  const report = generateReport(results);

  // Print summary
  logger.info('\nTest Summary:');
  logger.info(`Total: ${report.summary.total}`);
  logger.info(`Passed: ${report.summary.passed}`);
  logger.info(`Failed: ${report.summary.failed}`);

  // Print details for each test type
  logger.info('\nTest Details:');
  for (const [testType, result] of Object.entries(results)) {
    logger.info(`${testType}: ${result.success ? 'PASSED' : 'FAILED'}`);
    if (!result.success && result.error) {
      logger.error(`${testType} error: ${result.error}`);
    }
  }

  if (report.summary.failed > 0) {
    logger.error('Some tests failed');
    process.exit(1);
  } else {
    logger.success('All tests passed');
    process.exit(0);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error:');
  logger.error(error);
  process.exit(1);
});

