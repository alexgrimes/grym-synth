// Simple memory manager for testing
class SimpleMemoryManager {
  private readonly limit = 200 * 1024 * 1024;  // 200MB
  private readonly warning = 180 * 1024 * 1024; // 180MB
  private readonly minFree = 20 * 1024 * 1024;  // 20MB
  private held: number[][] = [];

  getInfo() {
    const stats = process.memoryUsage();
    return {
      used: stats.heapUsed,
      total: stats.heapTotal,
      limit: this.limit,
      warning: this.warning,
      available: this.limit - stats.heapUsed,
      rss: stats.rss
    };
  }

  async allocateMemory(mbToAllocate: number): Promise<boolean> {
    try {
      // Force actual memory allocation by using the arrays
      for (let mb = 0; mb < mbToAllocate; mb++) {
        const info = this.getInfo();
        if (info.available < this.minFree) {
          console.log('  Warning: Approaching memory limit');
          return false;
        }

        const array = new Array(128 * 1024).fill(0); // 1MB chunks (8 bytes per number)
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.random(); // Force allocation
        }
        this.held.push(array);
        
        // Check memory periodically
        if (mb % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
          if (global.gc) global.gc();
        }
      }
      return true;
    } catch (err) {
      console.error('Allocation error:', err);
      return false;
    }
  }

  async releaseMemory() {
    const before = this.getInfo();
    console.log(`  Before cleanup: ${formatMB(before.used)} used`);
    
    this.held = [];
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
      global.gc();
    }

    const after = this.getInfo();
    console.log(`  After cleanup:  ${formatMB(after.used)} used`);
    console.log(`  Freed:         ${formatMB(before.used - after.used)}`);
  }
}

// Print memory in MB
function formatMB(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

async function runMemoryTest() {
  console.log('\nMemory Test');
  console.log('===========');

  try {
    // Print initial stats
    const initialStats = process.memoryUsage();
    console.log('\nInitial Memory:');
    console.log(`  Heap Used:  ${formatMB(initialStats.heapUsed)}`);
    console.log(`  Heap Total: ${formatMB(initialStats.heapTotal)}`);
    console.log(`  RSS:        ${formatMB(initialStats.rss)}`);

    // Create manager and measure baseline
    const manager = new SimpleMemoryManager();
    if (global.gc) global.gc();
    const baselineInfo = manager.getInfo();

    console.log('\nMemory Limits:');
    console.log(`  Limit:   ${formatMB(baselineInfo.limit)}`);
    console.log(`  Warning: ${formatMB(baselineInfo.warning)}`);
    console.log(`  Free:    ${formatMB(baselineInfo.available)}`);

    // Test incremental allocation
    console.log('\nTesting Memory Allocation:');
    const allocationSteps = [10, 30, 50, 80]; // MB to allocate
    
    for (const mb of allocationSteps) {
      console.log(`\nAllocating ${mb}MB...`);
      const success = await manager.allocateMemory(mb);
      
      const afterAlloc = manager.getInfo();
      console.log(`  Success:   ${success}`);
      console.log(`  Used:      ${formatMB(afterAlloc.used)}`);
      console.log(`  Available: ${formatMB(afterAlloc.available)}`);
      console.log(`  RSS:       ${formatMB(afterAlloc.rss)}`);
      
      if (!success) {
        console.log('  Stopping allocation test due to memory pressure');
        break;
      }
      
      // Small delay between allocations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Release memory
    console.log('\nCleaning up...');
    await manager.releaseMemory();

    console.log('\nFinal Status:');
    const finalInfo = manager.getInfo();
    console.log(`  Used:      ${formatMB(finalInfo.used)}`);
    console.log(`  Available: ${formatMB(finalInfo.available)}`);
    console.log(`  RSS:       ${formatMB(finalInfo.rss)}`);

    console.log('\nTest completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Run test
runMemoryTest().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});