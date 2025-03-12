const jest = require('jest');
const path = require('path');
const fs = require('fs').promises;

console.log('[INFO] Starting grym-synth Visualization Tools Tests');
console.log('[INFO] Checking for visualization tools file...');

const visualizationToolsPath = path.join(__dirname, '../src/monitoring/visualizationTools.ts');

async function checkVisualizationTools() {
  try {
    await fs.access(visualizationToolsPath);
    console.log('[SUCCESS] VisualizationTools file found');

    // Configure Jest options for visualization tests
    const options = {
      projects: [__dirname + '/../'],
      testMatch: ['**/src/tests/monitoring/**/*.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/test/setup/testEnvironment.js'],
      verbose: true,
      detectOpenHandles: true,
      forceExit: true,
      notify: false,
      watchAll: false
    };

    // Run visualization tests
    console.log('[INFO] Running visualization tests...');
    const success = await jest.run(['--config', JSON.stringify(options)]);

    if (!success) {
      console.error('[ERROR] Visualization tests failed');
      process.exit(1);
    }

    console.log('[SUCCESS] Visualization tests completed successfully');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`[ERROR] Visualization tools file not found: ${visualizationToolsPath}`);
      console.error('[ERROR] Failed to run tests, visualization tools file missing');
    } else {
      console.error('[ERROR] Failed to run visualization tests:', error);
    }
    process.exit(1);
  }
}

checkVisualizationTools().catch(error => {
  console.error('[ERROR] Test execution failed:', error);
  process.exit(1);
});
