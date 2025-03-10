/**
 * Helper utilities for memory testing
 */
export class MemoryTestHelper {
  private readonly minimumMemory: number;
  private readonly targetMemory: number;
  private held: number[][] = [];

  constructor(minimumMemory = 20_000_000, targetMemory = 180_000_000) {
    this.minimumMemory = minimumMemory;
    this.targetMemory = targetMemory;
  }

  /**
   * Creates memory pressure up to target memory usage
   */
  async createMemoryPressure(): Promise<void> {
    const blockSize = 1024 * 1024; // 1MB blocks
    
    while (process.memoryUsage().heapUsed < this.targetMemory && this.held.length < 200) {
      this.held.push(new Array(blockSize).fill(Math.random()));
      
      // Force arrays to be retained
      if (this.held.length % 10 === 0) {
        this.held.forEach(arr => arr[0] = Date.now());
      }

      // Give event loop a chance to run
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  /**
   * Releases memory pressure
   */
  async releaseMemory(): Promise<void> {
    while (this.held.length) {
      this.held.pop();
    }
    
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Gets current available memory
   */
  getAvailableMemory(): number {
    const used = process.memoryUsage().heapUsed;
    return Math.max(0, this.targetMemory - used);
  }

  /**
   * Checks if we have minimum required memory
   */
  hasMinimumMemory(): boolean {
    return this.getAvailableMemory() >= this.minimumMemory;
  }
}