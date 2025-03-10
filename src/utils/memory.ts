export interface MemoryConfig {
  maxMemory: string;
}

export interface OperationStats {
  count: number;
  lastUsed: Date;
  avgDuration?: number;
  peakMemory?: number;
  totalMemory?: number;
  memoryExceeded?: boolean;
}

export class MemoryManager {
  private maxBytes: number;
  private operations: Map<
    string,
    {
      count: number;
      lastUsed: number;
      durations: number[];
      peakMemory: number;
      totalMemory: number;
      memoryExceeded: boolean;
    }
  >;

  constructor(config: MemoryConfig) {
    this.maxBytes = this.parseMemoryString(config.maxMemory);
    this.operations = new Map();
  }

  parseMemoryString(memoryStr: string): number {
    // Require exact format: number followed by unit (KB, MB, GB, or B)
    const match = memoryStr.match(/^(\d+)(KB|MB|GB|B)$/);
    if (!match) {
      throw new Error(`Invalid memory string format: ${memoryStr}`);
    }

    const value = parseInt(match[1], 10);
    if (value <= 0) {
      throw new Error("Memory value must be positive");
    }

    // Validate value is within safe integer range
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new Error("Memory value exceeds maximum safe integer");
    }

    const unit = match[2];

    switch (unit) {
      case "KB":
        return this.validateValue(value * 1024);
      case "MB":
        return this.validateValue(value * 1024 * 1024);
      case "GB":
        return this.validateValue(value * 1024 * 1024 * 1024);
      case "B":
        return this.validateValue(value);
      default:
        throw new Error(`Invalid memory unit: ${unit}`);
    }
  }

  private validateValue(bytes: number): number {
    if (!Number.isFinite(bytes) || bytes > Number.MAX_SAFE_INTEGER) {
      throw new Error("Memory value would exceed maximum safe integer");
    }
    return bytes;
  }

  startOperation(operation: string): number {
    if (!operation) {
      throw new Error("Operation name cannot be empty");
    }

    const now = Date.now();
    const current = this.operations.get(operation) || {
      count: 0,
      lastUsed: now,
      durations: [],
      peakMemory: 0,
      totalMemory: 0,
      memoryExceeded: false,
    };

    current.count++;
    current.lastUsed = now;
    this.operations.set(operation, current);

    this.checkMemoryUsage(operation);

    return now;
  }

  endOperation(operation: string, startTime?: number): void {
    if (!operation || !startTime || startTime < 0) {
      return;
    }

    const now = Date.now();
    if (startTime > now) {
      return;
    }

    const current = this.operations.get(operation);
    if (!current) {
      return;
    }

    const duration = now - startTime;
    current.durations.push(duration);

    try {
      const memUsage = process.memoryUsage().heapUsed;
      current.totalMemory += memUsage;
      current.peakMemory = Math.max(current.peakMemory, memUsage);
      current.memoryExceeded = memUsage > this.maxBytes;
    } catch (error) {
      // Ignore memory measurement errors
    }

    // Keep only last 100 durations for average calculation
    if (current.durations.length > 100) {
      current.durations.shift();
    }
  }

  private checkMemoryUsage(operation: string): void {
    try {
      const used = process.memoryUsage().heapUsed;
      const current = this.operations.get(operation);

      if (current) {
        current.peakMemory = Math.max(current.peakMemory, used);
        current.totalMemory += used;
      }

      if (used > this.maxBytes * 0.9) {
        console.warn("Critical: Memory usage above 90% of limit");
        this.triggerGarbageCollection();
      } else if (used > this.maxBytes * 0.8) {
        console.warn("Warning: Memory usage above 80% of limit");
      }
    } catch (error) {
      // Ignore memory measurement errors
    }
  }

  private triggerGarbageCollection(): void {
    if (global.gc) {
      try {
        global.gc();
      } catch (error) {
        console.error("Failed to trigger garbage collection");
      }
    }
  }

  getOperationStats(): Record<string, OperationStats> {
    const stats: Record<string, OperationStats> = {};

    this.operations.forEach((value, key) => {
      const avgDuration =
        value.durations.length > 0
          ? value.durations.reduce((a, b) => a + b, 0) / value.durations.length
          : undefined;

      stats[key] = {
        count: value.count,
        lastUsed: new Date(value.lastUsed),
        avgDuration,
        peakMemory: value.peakMemory,
        totalMemory: value.totalMemory,
        memoryExceeded: value.memoryExceeded,
      };
    });

    return stats;
  }

  getMemoryUsage(): { used: number; max: number; percentage: number } {
    let used = 0;
    try {
      used = process.memoryUsage().heapUsed;
    } catch (error) {
      // Ignore memory measurement errors
    }

    return {
      used,
      max: this.maxBytes,
      percentage: (used / this.maxBytes) * 100,
    };
  }

  resetStats(): void {
    this.operations.clear();
  }
}
