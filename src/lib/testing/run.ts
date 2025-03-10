#!/usr/bin/env node

/**
 * Test runner for error handling tests
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const TESTS_DIR = resolve(__dirname, '__tests__');
const TEST_TIMEOUT = 30000;

interface RunOptions {
  verbose?: boolean;
  pattern?: string;
  watch?: boolean;
}

/**
 * Run error handling tests
 */
function runTests(options: RunOptions = {}): void {
  const { verbose, pattern, watch } = options;

  // Build Jest command
  const args = [
    'jest',
    '--config',
    resolve(__dirname, '../../../jest.config.js'),
    '--testTimeout',
    TEST_TIMEOUT.toString()
  ];

  // Add options
  if (verbose) {
    args.push('--verbose');
  }
  if (watch) {
    args.push('--watch');
  }
  if (pattern) {
    args.push('--testNamePattern', pattern);
  }

  // Add test files
  args.push(resolve(TESTS_DIR, 'error-handling.test.ts'));

  // Run tests
  console.log('\nRunning error handling tests...\n');
  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: true
  });

  // Handle result
  if (result.status === 0) {
    console.log('\nAll tests passed!\n');
    process.exit(0);
  } else {
    console.error('\nTests failed!\n');
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
const options: RunOptions = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  watch: args.includes('--watch') || args.includes('-w')
};

// Get test pattern
const patternIndex = args.indexOf('--pattern');
if (patternIndex !== -1 && args[patternIndex + 1]) {
  options.pattern = args[patternIndex + 1];
}

// Run tests
runTests(options);