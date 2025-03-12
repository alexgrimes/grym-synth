const jest = require('jest');
const path = require('path');
const fs = require('fs').promises;

console.log('[INFO] Starting grym-synth Resource Manager Tests');
console.log('[INFO] Checking for resource manager file...');

const resourceManagerPath = path.join(__dirname, '../src/resources/resourceManager.js');

async function checkResourceManager() {
  try {
    await fs.access(resourceManagerPath);
    console.log('[SUCCESS] ResourceManager file found');

    // Configure Jest options for resource tests
    const options = {
      projects: [__dirname + '/../'],
      testMatch: ['**/src/tests/resources/**/*.js'],
      testEnvironment: 'node', // Using node environment since ResourceManager is backend code
      setupFilesAfterEnv: ['<rootDir>/src/test/setup/nodeEnvironment.js'], // Use node-specific setup
      verbose: true,
      detectOpenHandles: true,
      forceExit: true,
      notify: false,
      watchAll: false
    };

    // Run resource manager tests
    console.log('[INFO] Running resource manager tests...');
    const success = await jest.run(['--config', JSON.stringify(options)]);

    if (!success) {
      console.error('[ERROR] Resource manager tests failed');
      process.exit(1);
    }

    console.log('[SUCCESS] Resource manager tests completed successfully');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`[ERROR] Resource manager file not found: ${resourceManagerPath}`);
      console.error('[ERROR] Failed to run tests, resource manager file missing');
    } else {
      console.error('[ERROR] Failed to run resource manager tests:', error);
    }
    process.exit(1);
  }
}

// Create basic test directory structure if it doesn't exist
async function ensureTestDirectories() {
  const testDirs = [
    path.join(__dirname, '../src/tests/resources'),
    path.join(__dirname, '../reports/tests')
  ];

  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`[ERROR] Failed to create directory ${dir}:`, error);
        process.exit(1);
      }
    }
  }
}

async function main() {
  await ensureTestDirectories();
  await checkResourceManager();
}

main().catch(error => {
  console.error('[ERROR] Test execution failed:', error);
  process.exit(1);
});
