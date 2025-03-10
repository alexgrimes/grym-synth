#!/usr/bin/env node
/**
 * This script runs focused tests on the service layer and context management system
 * without running the entire test suite, which has many unrelated failures.
 */

const { spawnSync } = require('child_process');
const { resolve } = require('path');
const fs = require('fs');

// Define the test files we want to run
const testFiles = [
  'src/tests/services/service-layer.test.ts',
  'src/tests/context/context-management.test.ts',
  'src/tests/integration/system-integration.test.ts'
];

// Verify all test files exist
const missingFiles = testFiles.filter(file => !fs.existsSync(resolve(process.cwd(), file)));
if (missingFiles.length > 0) {
  console.error('Error: The following test files are missing:');
  missingFiles.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

console.log('Running focused tests for service layer and context management...\n');

// Run Jest with only our specific test files
const result = spawnSync('npx', [
  'jest',
  '--verbose',
  ...testFiles
], {
  stdio: 'inherit',
  shell: true
});

if (result.status !== 0) {
  console.error('\nSome tests failed. Examining issues...');
  
  // Provide troubleshooting guidance
  console.log('\nTroubleshooting steps:');
  console.log('1. Check for type errors in test files');
  console.log('2. Verify that all required interfaces are properly implemented');
  console.log('3. Ensure mock configurations match the current implementation');
  console.log('4. Look for interface mismatches between tests and implementation');
  
  process.exit(1);
} else {
  console.log('\nAll focused tests passed successfully!');
}