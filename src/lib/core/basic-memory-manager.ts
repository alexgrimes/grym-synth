/**
 * Memory Manager with thresholds based on measured behavior
 */
export class BasicMemoryManager {
  private currentModel: string | null = null;
  private readonly memoryInfo: {
    baseline: number;      // Initial heap usage
    total: number;        // Total heap available
    warningThreshold: number;
    criticalThreshold: number;
    minimumFree: number;
  };

  constructor() {
    // Get initial memory state
    const stats = process.memoryUsage();
    this.memoryInfo = {
      baseline: stats.heapUsed,
      total: stats.heapTotal,
      // Based on observed behavior:
      warningThreshold: stats.heapUsed + 50_000_000,   // Baseline + 50MB
      criticalThreshold: stats.heapUsed + 70_000_000,  // Baseline + 70MB
      minimumFree: 30_000_000                          // Need 30MB free
    };
  }

  async loadModel(modelName: string): Promise<boolean> {
    const currentUsage = process.memoryUsage().heapUsed;
    const available = this.memoryInfo.total - currentUsage;

    // Check if we have enough memory
    if (available < this.memoryInfo.minimumFree) {
      await this.attemptMemoryCleanup();
      
      // Recheck after cleanup
      const afterCleanup = process.memoryUsage().heapUsed;
      if (this.memoryInfo.total - afterCleanup < this.memoryInfo.minimumFree) {
        return false;
      }
    }

    // Check if we're approaching critical memory
    if (currentUsage > this.memoryInfo.criticalThreshold) {
      return false;
    }

    // If we're in warning territory, try cleanup first
    if (currentUsage > this.memoryInfo.warningThreshold) {
      await this.attemptMemoryCleanup();
    }

    // Load the new model
    if (this.currentModel) {
      await this.unloadModel();
    }
    
    this.currentModel = modelName;
    return true;
  }

  private async attemptMemoryCleanup(): Promise<void> {
    const before = process.memoryUsage().heapUsed;
    
    this.currentModel = null;
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));
      global.gc(); // Second pass
    }

    const after = process.memoryUsage().heapUsed;
    const freed = Math.round((before - after) / 1024 / 1024);
    if (freed > 0) {
      console.debug(`Freed ${freed}MB through cleanup`);
    }
  }

  async unloadModel(): Promise<void> {
    await this.attemptMemoryCleanup();
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  getMemoryInfo() {
    const stats = process.memoryUsage();
    const used = stats.heapUsed;
    return {
      baseline: this.memoryInfo.baseline,
      total: this.memoryInfo.total,
      used: used,
      available: this.memoryInfo.total - used,
      warning: this.memoryInfo.warningThreshold,
      critical: this.memoryInfo.criticalThreshold,
      minimumFree: this.memoryInfo.minimumFree,
      isWarning: used > this.memoryInfo.warningThreshold,
      isCritical: used > this.memoryInfo.criticalThreshold
    };
  }
}