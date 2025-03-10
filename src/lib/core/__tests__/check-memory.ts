import { printMemoryStatus } from '../memory-status';
import { BasicMemoryManager } from '../basic-memory-manager';

// Debug helper
function debugLog(message: string, ...args: any[]) {
  console.log(`[DEBUG] ${message}`, ...args);
}

async function checkMemoryStatus() {
  try {
    debugLog('Starting memory check...');
    console.log('\nBasic Memory Check');
    console.log('=================');
    
    // Print initial status
    debugLog('Getting initial memory status');
    console.log('\nInitial Status:');
    const initialStats = process.memoryUsage();
    console.log('Process Memory:');
    console.log(`  Heap Used:  ${Math.round(initialStats.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(initialStats.heapTotal / 1024 / 1024)}MB`);
    console.log(`  RSS:        ${Math.round(initialStats.rss / 1024 / 1024)}MB`);

    // Create manager and check thresholds
    debugLog('Creating BasicMemoryManager');
    const manager = new BasicMemoryManager();
    const info = manager.getMemoryInfo();
    
    console.log('\nMemory Manager Thresholds:');
    console.log(`  Limit:        ${(info.limit / 1024 / 1024).toFixed(1)}MB`);
    console.log(`  Warning:      ${(info.warning / 1024 / 1024).toFixed(1)}MB`);
    console.log(`  Minimum Free: ${(info.minimumFree / 1024 / 1024).toFixed(1)}MB`);

    // Try loading a model
    debugLog('Attempting to load test model');
    console.log('\nTesting Model Load:');
    const success = await manager.loadModel('test-model');
    console.log(`  Load Result: ${success ? 'Success' : 'Failed'}`);

    if (success) {
      const afterInfo = manager.getMemoryInfo();
      console.log(`  Available After Load: ${(afterInfo.available / 1024 / 1024).toFixed(1)}MB`);
    }
    
    // Print final status
    console.log('\nFinal Status:');
    const finalStats = process.memoryUsage();
    console.log('Process Memory:');
    console.log(`  Heap Used:  ${Math.round(finalStats.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(finalStats.heapTotal / 1024 / 1024)}MB`);
    console.log(`  RSS:        ${Math.round(finalStats.rss / 1024 / 1024)}MB`);

    debugLog('Memory check completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error during memory check:', err);
    process.exit(1);
  }
}

// Run check if called directly
if (require.main === module) {
  debugLog('Starting script');
  checkMemoryStatus().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}