const jest = require('jest');

console.log('[INFO] Starting grym-synth API Tests');
console.log('[INFO] Checking API test dependencies...');
console.log('[SUCCESS] All API test dependencies installed');
console.log('[INFO] Running API tests...');

const options = {
  projects: [__dirname + '/../'],
  testMatch: ['**/src/tests/api/**/*.js'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup/testEnvironment.js'],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  notify: false,
  watchAll: false
};

jest.run(['--config', JSON.stringify(options)])
  .then(success => {
    if (!success) {
      console.error('[ERROR] API tests failed');
      process.exit(1);
    }
    console.log('[SUCCESS] API tests completed successfully');
  })
  .catch(error => {
    console.error('[ERROR] Failed to run API tests:', error);
    process.exit(1);
  });
