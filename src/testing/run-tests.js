#!/usr/bin/env node
/**
 * GrymSynth Browser Test Runner
 *
 * CLI tool to run browser compatibility and feature tests
 * for the GrymSynth application.
 */

const { BrowserTestFramework } = require('./framework');
const {
  runCompatibilityTests,
  testAudioContext,
  testWebGLSupport,
  testWebWorkers,
  testLocalStorage,
  testIndexedDB,
  testSQLiteWASM
} = require('./browser-compatibility');

// Create test framework instance with default configuration
const framework = new BrowserTestFramework({
  browsers: ['chrome', 'firefox', 'edge', 'safari'],
  viewports: ['desktop', 'tablet', 'mobile'],
  reporters: ['console', 'json']
});

// Create individual feature test suites
const createFeatureTestSuite = (name, testFn) => ({
  name,
  run: async () => {
    try {
      const result = await testFn();
      return {
        passed: result.supported ? 1 : 0,
        failed: result.supported ? 0 : 1,
        skipped: 0,
        total: 1,
        details: {
          [name]: {
            passed: result.supported,
            message: result.supported ?
              JSON.stringify(result, null, 2) :
              `Failed: ${result.error}`
          }
        }
      };
    } catch (error) {
      return {
        passed: 0,
        failed: 1,
        skipped: 0,
        total: 1,
        details: {
          [name]: {
            passed: false,
            message: `Error: ${error.message}`
          }
        }
      };
    }
  }
});

// Add test suites to framework
framework.addTestSuite(createFeatureTestSuite('AudioContext', testAudioContext));
framework.addTestSuite(createFeatureTestSuite('WebGL', testWebGLSupport));
framework.addTestSuite(createFeatureTestSuite('WebWorkers', testWebWorkers));
framework.addTestSuite(createFeatureTestSuite('LocalStorage', testLocalStorage));
framework.addTestSuite(createFeatureTestSuite('IndexedDB', testIndexedDB));
framework.addTestSuite(createFeatureTestSuite('SQLite WASM', testSQLiteWASM));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  browsers: [],
  viewports: [],
  reporters: ['console']
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--browser':
    case '-b':
      options.browsers.push(args[++i]);
      break;
    case '--viewport':
    case '-v':
      options.viewports.push(args[++i]);
      break;
    case '--reporter':
    case '-r':
      options.reporters.push(args[++i]);
      break;
    case '--help':
    case '-h':
      console.log(`
GrymSynth Browser Test Runner

Usage: node run-tests.js [options]

Options:
  -b, --browser <name>    Specify browser to test (can be used multiple times)
                         Supported: chrome, firefox, edge, safari
  -v, --viewport <size>   Specify viewport to test (can be used multiple times)
                         Supported: desktop, tablet, mobile
  -r, --reporter <type>   Specify report type (can be used multiple times)
                         Supported: console, html, json
  -h, --help             Show this help message

Examples:
  # Run all tests with default settings
  node run-tests.js

  # Test specific browsers
  node run-tests.js -b chrome -b firefox

  # Test specific viewports
  node run-tests.js -v desktop -v mobile

  # Use specific reporters
  node run-tests.js -r console -r json
`);
      process.exit(0);
  }
}

// Override framework settings if specified in arguments
if (options.browsers.length > 0) {
  framework.browsers = options.browsers;
}
if (options.viewports.length > 0) {
  framework.viewports = options.viewports;
}
if (options.reporters.length > 0) {
  framework.reporters = options.reporters;
}

// Run tests
console.log('Starting GrymSynth browser compatibility tests...\n');

framework.runAllTests()
  .then(() => {
    console.log('\nTest run completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
