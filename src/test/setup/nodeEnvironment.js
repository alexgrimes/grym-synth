// Test environment setup for Node.js (non-browser) tests

// Mock performance API if not available
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  };
}

// Setup test environment timeouts
jest.setTimeout(10000); // 10 second timeout for tests
