import os from 'os';
import { Qwen2Quantization } from './types';
import type { MemoryStatus, MemoryStats, QuantizationRequirements } from './types';

/**
 * Memory manager specifically configured for Qwen2-Audio model requirements
 */
export class Qwen2MemoryManager {
  private static readonly GB = 1024 * 1024 * 1024;
  private static readonly MB = 1024 * 1024;

  // Known memory requirements for different quantization levels
  private readonly requirements: Record<Qwen2Quantization, QuantizationRequirements> = {
    [Qwen2Quantization.Q4_K_M]: {
      ramNeeded: 4.2 * Qwen2MemoryManager.GB,
      type: 'edge_optimized',
      minFreeMemory: 512 * Qwen2MemoryManager.MB
    },
    [Qwen2Quantization.Q4_0]: {
      ramNeeded: 3.8 * Qwen2MemoryManager.GB,
      type: 'edge_optimized',
      minFreeMemory: 512 * Qwen2MemoryManager.MB
    },
    [Qwen2Quantization.Q5_K_M]: {
      ramNeeded: 4.8 * Qwen2MemoryManager.GB,
      type: 'quality_optimized',
      minFreeMemory: 768 * Qwen2MemoryManager.MB
    }
  };

  private currentQuantization: Qwen2Quantization | null = null;
  private modelLoaded = false;

  constructor(private readonly defaultQuantization = Qwen2Quantization.Q4_K_M) {}

  /**
   * Check if there's enough memory to load the model with specified quantization
   */
  async canLoadModel(quantization = this.defaultQuantization): Promise<boolean> {
    const req = this.requirements[quantization];
    const available = os.freemem();
    const total = os.totalmem();

    // Check both absolute free memory and percentage
    const hasEnoughFree = available >= (req.ramNeeded + req.minFreeMemory);
    const freePercentage = (available / total) * 100;

    // Require at least 25% free memory after loading
    return hasEnoughFree && freePercentage >= 25;
  }

  /**
   * Get recommended quantization based on available system memory
   */
  async getRecommendedQuantization(): Promise<Qwen2Quantization> {
    const available = os.freemem();
    const total = os.totalmem();

    // If we have plenty of memory, use higher quality
    if (total >= 32 * Qwen2MemoryManager.GB && available >= 8 * Qwen2MemoryManager.GB) {
      return Qwen2Quantization.Q5_K_M;
    }

    // If memory is tight, use most optimized version
    if (total <= 8 * Qwen2MemoryManager.GB || available <= 5 * Qwen2MemoryManager.GB) {
      return Qwen2Quantization.Q4_0;
    }

    // Default to standard optimized version
    return Qwen2Quantization.Q4_K_M;
  }

  /**
   * Calculate memory safety threshold for the current model
   */
  getMemoryThreshold(): number {
    if (!this.currentQuantization) {
      throw new Error('No model quantization selected');
    }

    const req = this.requirements[this.currentQuantization];
    return req.ramNeeded + req.minFreeMemory;
  }

  /**
   * Monitor memory status and get warnings if approaching limits
   */
  checkMemoryStatus(): MemoryStatus {
    const available = os.freemem();
    const total = os.totalmem();
    const used = total - available;

    if (!this.currentQuantization) {
      return { status: 'ok', availableMemory: available };
    }

    const req = this.requirements[this.currentQuantization];
    const minFree = req.minFreeMemory;

    if (available < minFree) {
      return {
        status: 'critical',
        availableMemory: available,
        warning: `Critical: Available memory (${this.formatBytes(available)}) below minimum requirement of ${this.formatBytes(minFree)}`
      };
    }

    if (available < minFree * 2) {
      return {
        status: 'warning',
        availableMemory: available,
        warning: `Warning: Available memory (${this.formatBytes(available)}) approaching minimum threshold`
      };
    }

    return { status: 'ok', availableMemory: available };
  }

  /**
   * Register that a model has been loaded
   */
  async registerModelLoad(quantization = this.defaultQuantization): Promise<void> {
    const canLoad = await this.canLoadModel(quantization);
    if (!canLoad) {
      throw new Error(`Insufficient memory to load model with ${quantization} quantization`);
    }

    this.currentQuantization = quantization;
    this.modelLoaded = true;
  }

  /**
   * Register that a model has been unloaded
   */
  unregisterModel(): void {
    this.currentQuantization = null;
    this.modelLoaded = false;
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): MemoryStats {
    const available = os.freemem();
    const total = os.totalmem();
    const used = total - available;

    const stats: MemoryStats = {
      available,
      total,
      used,
      percentUsed: (used / total) * 100,
      percentFree: (available / total) * 100,
      modelLoaded: this.modelLoaded,
      currentQuantization: this.currentQuantization,
    };

    if (this.currentQuantization) {
      stats.modelRequirements = this.requirements[this.currentQuantization];
    }

    return stats;
  }

  /**
   * Format bytes into human readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)}${units[unitIndex]}`;
  }
}

export { Qwen2Quantization };