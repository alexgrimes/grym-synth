import { Logger } from "./logger";

export interface MemoryUsage {
  used: number;
  total: number;
  free: number;
  percentage: number;
}

export interface OperationMetrics {
  duration: number;
  memoryUsage: number;
  peakMemory: number;
  startTime: number;
  endTime: number;
}

export interface OperationStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  peakMemory: number;
  avgMemoryUsage: number;
}

export class MemoryProfiler {
  private logger: Logger;
  private operations: Map<string, OperationMetrics[]> = new Map();
  private startMemory: number = 0;
  private peakMemory: number = 0;
  private baselineMemory: number = 0;

  constructor() {
    this.logger = new Logger({ namespace: "memory-profiler" });
    this.baselineMemory = this.getCurrentMemoryUsage();
    this.logger.info("Memory profiler initialized", {
      baselineMemory: this.formatBytes(this.baselineMemory),
    });
  }

  /**
   * Start tracking an operation
   * @param operationName Name of the operation to track
   * @returns Start time in milliseconds
   */
  startOperation(operationName: string): number {
    const startTime = Date.now();
    this.startMemory = this.getCurrentMemoryUsage();

    this.logger.debug(`Starting operation: ${operationName}`, {
      startMemory: this.formatBytes(this.startMemory),
    });

    return startTime;
  }

  /**
   * End tracking an operation and record metrics
   * @param operationName Name of the operation
   * @param startTime Start time from startOperation
   * @returns Metrics for the operation
   */
  endOperation(operationName: string, startTime: number): OperationMetrics {
    const endTime = Date.now();
    const endMemory = this.getCurrentMemoryUsage();
    const duration = endTime - startTime;
    const memoryDelta = endMemory - this.startMemory;

    // Update peak memory if this operation used more
    if (endMemory > this.peakMemory) {
      this.peakMemory = endMemory;
    }

    const metrics: OperationMetrics = {
      duration,
      memoryUsage: memoryDelta,
      peakMemory: this.peakMemory,
      startTime,
      endTime,
    };

    // Store operation metrics
    if (!this.operations.has(operationName)) {
      this.operations.set(operationName, []);
    }
    this.operations.get(operationName)!.push(metrics);

    this.logger.debug(`Completed operation: ${operationName}`, {
      duration: `${duration}ms`,
      memoryDelta: this.formatBytes(memoryDelta),
      endMemory: this.formatBytes(endMemory),
    });

    return metrics;
  }

  /**
   * Get current memory usage from Node.js process
   */
  getCurrentMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): MemoryUsage {
    const memoryUsage = process.memoryUsage();
    const used = memoryUsage.heapUsed;
    const total = memoryUsage.heapTotal;
    const free = total - used;
    const percentage = (used / total) * 100;

    return {
      used,
      total,
      free,
      percentage,
    };
  }

  /**
   * Get statistics for all tracked operations
   */
  getOperationStats(): Record<string, OperationStats> {
    const stats: Record<string, OperationStats> = {};

    this.operations.forEach((metrics, operationName) => {
      if (metrics.length === 0) return;

      const count = metrics.length;
      const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
      const avgDuration = totalDuration / count;
      const peakMemory = Math.max(...metrics.map((m) => m.peakMemory));
      const totalMemoryUsage = metrics.reduce(
        (sum, m) => sum + m.memoryUsage,
        0
      );
      const avgMemoryUsage = totalMemoryUsage / count;

      stats[operationName] = {
        count,
        totalDuration,
        avgDuration,
        peakMemory,
        avgMemoryUsage,
      };
    });

    return stats;
  }

  /**
   * Generate a comprehensive report of all memory operations
   */
  generateReport(): {
    summary: {
      totalOperations: number;
      uniqueOperationTypes: number;
      peakMemory: string;
      baselineMemory: string;
      currentMemory: string;
    };
    operations: Record<string, OperationStats>;
    rawMetrics: Record<string, OperationMetrics[]>;
  } {
    const operationStats = this.getOperationStats();
    const currentMemory = this.getCurrentMemoryUsage();

    // Count total operations
    let totalOperations = 0;
    this.operations.forEach((metrics) => {
      totalOperations += metrics.length;
    });

    // Format raw metrics for the report
    const rawMetrics: Record<string, OperationMetrics[]> = {};
    this.operations.forEach((metrics, name) => {
      rawMetrics[name] = metrics;
    });

    return {
      summary: {
        totalOperations,
        uniqueOperationTypes: this.operations.size,
        peakMemory: this.formatBytes(this.peakMemory),
        baselineMemory: this.formatBytes(this.baselineMemory),
        currentMemory: this.formatBytes(currentMemory),
      },
      operations: operationStats,
      rawMetrics,
    };
  }

  /**
   * Reset all collected metrics
   */
  reset(): void {
    this.operations.clear();
    this.peakMemory = 0;
    this.baselineMemory = this.getCurrentMemoryUsage();
    this.logger.info("Memory profiler reset", {
      baselineMemory: this.formatBytes(this.baselineMemory),
    });
  }

  /**
   * Format bytes to a human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
