/**
 * Test Runner for grym-synth Backend Integration Tests
 *
 * This script runs all the tests for the grym-synth backend integration and reports any issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testTypes: ['api', 'integration', 'performance'],
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

// Check if dependencies are installed
function checkDependencies() {
  logger.info('Checking dependencies...');

  // Check for required npm packages
  const requiredPackages = ['jest', 'ts-jest', 'typescript'];
  const missingPackages = [];

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
    } catch (error) {
      missingPackages.push(pkg);
    }
  }

  if (missingPackages.length > 0) {
    logger.warn(`Missing required packages: ${missingPackages.join(', ')}`);
    logger.info('Installing missing packages...');

    const installResult = runCommand(`npm install --save-dev ${missingPackages.join(' ')}`);
    if (!installResult.success) {
      logger.error('Failed to install dependencies:');
      logger.error(installResult.error);
      return false;
    }
  }

  // Check for additional dependencies needed for the API tests
  const apiTestDeps = ['axios', 'axios-mock-adapter'];
  const missingApiDeps = [];

  for (const pkg of apiTestDeps) {
    try {
      require.resolve(pkg);
    } catch (error) {
      missingApiDeps.push(pkg);
    }
  }

  if (missingApiDeps.length > 0) {
    logger.warn(`Missing API test dependencies: ${missingApiDeps.join(', ')}`);
    logger.info('Installing API test dependencies...');

    const installResult = runCommand(`npm install --save-dev ${missingApiDeps.join(' ')}`);
    if (!installResult.success) {
      logger.error('Failed to install API test dependencies:');
      logger.error(installResult.error);
      return false;
    }
  }

  logger.success('All dependencies installed');
  return true;
}

// Compile TypeScript files
function compileTypeScript() {
  logger.info('Compiling TypeScript files...');

  const compileResult = runCommand('npx tsc', { silent: true });
  if (!compileResult.success) {
    logger.error('TypeScript compilation failed:');
    logger.error(compileResult.error);

    // Try to extract and display the most relevant errors
    const errors = compileResult.error.match(/error TS\d+:.*?(?=\n\n|\n$)/gs) || [];
    if (errors.length > 0) {
      logger.error('Key TypeScript errors:');
      errors.slice(0, 5).forEach(error => logger.error(`  ${error.trim()}`));
      if (errors.length > 5) {
        logger.error(`  ... and ${errors.length - 5} more errors`);
      }
    }

    return false;
  }

  logger.success('TypeScript compilation successful');
  return true;
}

// Run API tests
function runApiTests() {
  logger.info('Running API tests...');

  const testResult = runCommand('npx jest --config=jest.config.js --testMatch="**/tests/api/**/*.ts"');
  if (!testResult.success) {
    logger.error('API tests failed:');
    logger.error(testResult.error);
    return false;
  }

  logger.success('API tests passed');
  return true;
}

// Run integration tests
function runIntegrationTests() {
  logger.info('Running integration tests...');

  const testResult = runCommand('npx jest --config=jest.config.js --testMatch="**/tests/integration/**/*.ts"');
  if (!testResult.success) {
    logger.error('Integration tests failed:');
    logger.error(testResult.error);
    return false;
  }

  logger.success('Integration tests passed');
  return true;
}

// Run performance tests
function runPerformanceTests() {
  logger.info('Running performance tests...');

  const testResult = runCommand('node src/tests/performance/benchmarkTests.js');
  if (!testResult.success) {
    logger.error('Performance tests failed:');
    logger.error(testResult.error);
    return false;
  }

  logger.success('Performance tests completed');
  return true;
}

// Fix common issues
function fixCommonIssues() {
  logger.info('Checking for common issues...');

  // Check for missing directories
  const requiredDirs = [
    'src/tests/api',
    'src/tests/integration',
    'src/tests/performance',
    'src/tests/mocks',
    'src/monitoring',
    'src/resources',
    'reports',
    'reports/performance',
    'reports/tests',
    'reports/visualizations',
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      logger.warn(`Creating missing directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Check for TypeScript configuration
  if (!fs.existsSync('tsconfig.json')) {
    logger.warn('tsconfig.json not found, creating default configuration');

    const tsConfig = {
      compilerOptions: {
        target: 'es2018',
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
        outDir: 'dist',
        declaration: true,
        sourceMap: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };

    fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));
  }

  // Check for Jest configuration
  if (!fs.existsSync('jest.config.js')) {
    logger.warn('jest.config.js not found, creating default configuration');

    const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**/*.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};`;

    fs.writeFileSync('jest.config.js', jestConfig);
  }

  // Check for package.json test scripts
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    let updated = false;

    if (!packageJson.scripts) {
      packageJson.scripts = {};
      updated = true;
    }

    const requiredScripts = {
      'test:api': 'jest --config=jest.config.js --testMatch="**/tests/api/**/*.ts"',
      'test:integration': 'jest --config=jest.config.js --testMatch="**/tests/integration/**/*.ts"',
      'test:performance': 'node src/tests/performance/benchmarkTests.js',
      'test:all': 'npm run test:api && npm run test:integration && npm run test:performance',
    };

    for (const [name, script] of Object.entries(requiredScripts)) {
      if (!packageJson.scripts[name]) {
        packageJson.scripts[name] = script;
        updated = true;
      }
    }

    if (updated) {
      logger.warn('Updating package.json with test scripts');
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    }
  } catch (error) {
    logger.error('Failed to update package.json:');
    logger.error(error.message);
  }

  logger.success('Common issues fixed');
  return true;
}

// Generate a test report
function generateReport(results) {
  logger.info('Generating test report...');

  const reportPath = path.join(config.reportDir, `test-report-${new Date().toISOString().replace(/:/g, '-')}.json`);

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
  logger.info('Starting grym-synth Backend Integration Tests');

  // Check dependencies
  if (!checkDependencies()) {
    logger.error('Dependency check failed, aborting tests');
    process.exit(1);
  }

  // Fix common issues
  fixCommonIssues();

  // Compile TypeScript
  if (!compileTypeScript()) {
    logger.error('TypeScript compilation failed, attempting to fix issues...');
    fixCommonIssues();

    // Try compiling again
    if (!compileTypeScript()) {
      logger.error('TypeScript compilation failed again, aborting tests');
      process.exit(1);
    }
  }

  // Run tests
  const results = {};

  if (config.testTypes.includes('api')) {
    results.api = { success: runApiTests() };
  }

  if (config.testTypes.includes('integration')) {
    results.integration = { success: runIntegrationTests() };
  }

  if (config.testTypes.includes('performance')) {
    results.performance = { success: runPerformanceTests() };
  }

  // Generate report
  const report = generateReport(results);

  // Print summary
  logger.info('\nTest Summary:');
  logger.info(`Total: ${report.summary.total}`);
  logger.info(`Passed: ${report.summary.passed}`);
  logger.info(`Failed: ${report.summary.failed}`);

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

