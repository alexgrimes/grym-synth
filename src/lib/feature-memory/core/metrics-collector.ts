import { FeatureMemoryMetrics } from "../interfaces";

export class MetricsCollector {
  private operations: Map<
    string,
    {
      count: number;
      totalLatency: number;
      errors: number;
      lastExecuted: Date;
    }
  >;
  private lastOperation: string | null;

  constructor() {
    this.operations = new Map();
    this.lastOperation = null;
  }

  /**
   * Start timing an operation
   */
  startOperation(name: string): void {
    this.lastOperation = name;
    if (!this.operations.has(name)) {
      this.operations.set(name, {
        count: 0,
        totalLatency: 0,
        errors: 0,
        lastExecuted: new Date(),
      });
    }
  }

  /**
   * End timing an operation
   */
  endOperation(name: string): void {
    const op = this.operations.get(name);
    if (op) {
      op.count++;
      op.lastExecuted = new Date();
    }
  }

  /**
   * Record latency for an operation
   */
  recordLatency(name: string, latency: number): void {
    const op = this.operations.get(name);
    if (op) {
      op.totalLatency += latency;
    }
  }

  /**
   * Record an error for an operation
   */
  recordError(name: string): void {
    const op = this.operations.get(name);
    if (op) {
      op.errors++;
    }
  }

  /**
   * Get the name of the last operation executed
   */
  getLastOperation(): string | null {
    return this.lastOperation;
  }

  /**
   * Get metrics in FeatureMemoryMetrics format
   */
  getMetrics(): FeatureMemoryMetrics {
    const totalErrors = Array.from(this.operations.values()).reduce(
      (sum, op) => sum + op.errors,
      0
    );

    const operationMetrics = this.operations.get(this.lastOperation || "") || {
      count: 0,
      totalLatency: 0,
      errors: 0,
      lastExecuted: new Date(),
    };

    return {
      operationLatency:
        operationMetrics.count > 0
          ? operationMetrics.totalLatency / operationMetrics.count
          : 0,
      patternRecognitionLatency: this.getOperationLatency("recognize"),
      searchLatency: this.getOperationLatency("search"),
      storageLatency: this.getOperationLatency("store"),
      extractionLatency: this.getOperationLatency("extract"),
      memoryUsage: process.memoryUsage().heapUsed,
      patternCount: this.getOperationCount("store"),
      cacheHitRate: this.calculateCacheHitRate(),
      errorCount: totalErrors,
      lastOperation: this.lastOperation || "",
      timestamp: new Date(),
      indexStats: {
        size: this.getOperationCount("index"),
        hitRate: this.calculateHitRate(),
        missRate: this.calculateMissRate(),
      },
      resourceUsage: {
        cpu: process.cpuUsage().user / 1000000, // Convert to seconds
        memory: process.memoryUsage().heapUsed,
        disk: 0, // Not tracking disk usage
      },
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.operations.clear();
    this.lastOperation = null;
  }

  private getOperationLatency(name: string): number {
    const op = this.operations.get(name);
    return op && op.count > 0 ? op.totalLatency / op.count : 0;
  }

  private getOperationCount(name: string): number {
    return this.operations.get(name)?.count || 0;
  }

  private calculateCacheHitRate(): number {
    const hits = this.getOperationCount("cacheHit");
    const misses = this.getOperationCount("cacheMiss");
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  private calculateHitRate(): number {
    const total = Array.from(this.operations.values()).reduce(
      (sum, op) => sum + op.count,
      0
    );
    return total > 0 ? 1 - this.getOperationCount("miss") / total : 0;
  }

  private calculateMissRate(): number {
    const total = Array.from(this.operations.values()).reduce(
      (sum, op) => sum + op.count,
      0
    );
    return total > 0 ? this.getOperationCount("miss") / total : 0;
  }
}
