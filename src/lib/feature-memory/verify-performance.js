#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function verifyPerformance() {
  try {
    log('\nStarting Feature Memory System Performance Verification', COLORS.cyan);
    log('===============================================\n');

    // Ensure we're in the right directory
    const rootDir = path.resolve(__dirname);
    process.chdir(rootDir);

    // Check for required tools
    log('Checking environment...', COLORS.yellow);
    try {
      execSync('npm --version', { stdio: 'ignore' });
      execSync('node --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Required tools (npm, node) not found');
    }

    // Install dependencies if needed
    log('Installing dependencies...', COLORS.yellow);
    execSync('npm install', { stdio: 'inherit' });

    // Build the project
    log('\nBuilding project...', COLORS.yellow);
    execSync('npm run build', { stdio: 'inherit' });

    // Run performance tests
    log('\nRunning performance tests...', COLORS.yellow);
    execSync('npx jest performance.test.ts --runInBand --no-cache --detectOpenHandles', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '1'
      }
    });

    // Check if detailed results file exists
    const resultsFile = path.join(__dirname, 'performance-results.json');
    try {
      const results = require(resultsFile);
      log('\nDetailed Results:', COLORS.cyan);
      results.forEach(result => {
        log(`\n${result.name}:`, COLORS.cyan);
        log(`  Average Latency: ${result.metrics.avgLatency.toFixed(2)}ms`);
        log(`  P95 Latency: ${result.metrics.p95Latency.toFixed(2)}ms`);
        log(`  Operations/sec: ${(1000 / result.metrics.avgLatency).toFixed(2)}`);
        log(`  Error Rate: ${(result.metrics.failureRate * 100).toFixed(2)}%`);
      });
    } catch (error) {
      log('\nNote: Detailed results file not found. See test output above.', COLORS.yellow);
    }

    log('\nPerformance verification completed successfully! ✨', COLORS.green);
    process.exit(0);

  } catch (error) {
    log('\nPerformance verification failed:', COLORS.red);
    log(error.message, COLORS.red);
    process.exit(1);
  }
}

// Run verification if executed directly
if (require.main === module) {
  verifyPerformance().catch(error => {
    log('\nUnexpected error during verification:', COLORS.red);
    log(error.stack || error.message, COLORS.red);
    process.exit(1);
  });
}