const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function runTest(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to start test: ${err.message}`));
    });
  });
}

async function runAllTests() {
  console.log('[INFO] Starting all grym-synth tests');

  try {
    console.log('[INFO] Running API tests...');
    console.log('[INFO] Running command: node scripts/run-api-tests.js');
    await runTest('node', ['scripts/run-api-tests.js']);

    console.log('[INFO] Running visualization tests...');
    console.log('[INFO] Running command: node scripts/run-visualization-tests.js');
    await runTest('node', ['scripts/run-visualization-tests.js']);

    console.log('[INFO] Running resource manager tests...');
    console.log('[INFO] Running command: node scripts/run-resource-tests.js');
    await runTest('node', ['scripts/run-resource-tests.js']);

    console.log('[INFO] Running performance tests...');
    console.log('[INFO] Running command: node src/tests/performance/benchmarkTests.js');
    await runTest('node', ['src/tests/performance/benchmarkTests.js']);

    console.log('[SUCCESS] All tests completed successfully');
  } catch (error) {
    console.error('[ERROR] Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('[ERROR] Failed to run tests:', error);
  process.exit(1);
});
