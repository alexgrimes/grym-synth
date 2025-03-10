import './test-setup/setup-env';
import { createTestEnvironment, customMatchers } from './test-utils';

// Initialize test environment and export for tests to use
export const testEnv = createTestEnvironment();

// Add custom matchers to Jest
expect.extend(customMatchers);

// Global test configuration
jest.setTimeout(30000); // 30 seconds

// Before all tests
beforeAll(async () => {
  await testEnv.forceGC();
  testEnv.memoryProfiler.start();
});

// After all tests
afterAll(async () => {
  testEnv.memoryProfiler.stop();
  const snapshot = await testEnv.memoryProfiler.getActualMemoryUsage();
  testEnv.memoryVisualizer.track(snapshot);
  
  // Generate visualization report
  const reportPath = 'reports/memory/memory-visualization.html';
  await testEnv.memoryVisualizer.generateReport(reportPath, testEnv.MEMORY_LIMIT);
  console.log(`Memory visualization report generated at: ${reportPath}`);
  
  await testEnv.forceGC();
});

// Before each test
beforeEach(async () => {
  await testEnv.forceGC();
});

// After each test
afterEach(async () => {
  const snapshot = await testEnv.memoryProfiler.getActualMemoryUsage();
  testEnv.memoryVisualizer.track(snapshot);
  await testEnv.forceGC();
});

// Make test environment available globally
declare global {
  var testEnv: typeof testEnv;
}

global.testEnv = testEnv;