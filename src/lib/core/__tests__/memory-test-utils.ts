/**
 * Memory testing utilities
 */

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  timestamp: number;
}

export class MemoryTestUtils {
  private snapshots: MemorySnapshot[] = [];

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const stats = process.memoryUsage();
    const snapshot = {
      heapUsed: stats.heapUsed,
      heapTotal: stats.heapTotal,
      rss: stats.rss,
      timestamp: Date.now()
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Compare current memory usage to a previous snapshot
   */
  compareToSnapshot(snapshot: MemorySnapshot) {
    const current = process.memoryUsage();
    return {
      heapUsedDiff: current.heapUsed - snapshot.heapUsed,
      heapTotalDiff: current.heapTotal - snapshot.heapTotal,
      rssDiff: current.rss - snapshot.rss,
      timeDiff: Date.now() - snapshot.timestamp
    };
  }

  /**
   * Allocate memory in controlled chunks
   */
  async allocateMemory(mbToAllocate: number, arrays: number[][]): Promise<void> {
    for (let mb = 0; mb < mbToAllocate; mb++) {
      const array = new Array(128 * 1024).fill(0); // ~1MB
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.random(); // Force allocation
      }
      arrays.push(array);
      
      // Periodic GC and delay to stabilize
      if (mb % 5 === 0) {
        if (global.gc) global.gc();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Clean up allocated memory
   */
  async cleanup(arrays: number[][]): Promise<void> {
    while (arrays.length) arrays.pop();
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
      global.gc(); // Second pass
    }
  }

  /**
   * Format bytes to MB
   */
  formatMB(bytes: number): string {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  /**
   * Print memory status
   */
  printStatus(label: string = 'Memory Status') {
    const stats = process.memoryUsage();
    console.log(`\n${label}:`);
    console.log(`  Heap Used:  ${this.formatMB(stats.heapUsed)}`);
    console.log(`  Heap Total: ${this.formatMB(stats.heapTotal)}`);
    console.log(`  RSS:        ${this.formatMB(stats.rss)}`);
  }

  /**
   * Get test summary
   */
  getSummary() {
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const maxHeap = Math.max(...this.snapshots.map(s => s.heapUsed));
    
    return {
      initialHeap: first.heapUsed,
      finalHeap: last.heapUsed,
      maxHeap,
      leakCheck: last.heapUsed - first.heapUsed,
      duration: last.timestamp - first.timestamp
    };
  }
}