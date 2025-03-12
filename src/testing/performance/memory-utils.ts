import { performance, PerformanceObserver } from 'perf_hooks';

export interface MemoryProfile {
  peakUsage: number;
  averageUsage: number;
  timestamp: number;
  gcEvents: number;
}

export class MemoryProfiler {
  private measurements: MemoryProfile[] = [];
  private observer: PerformanceObserver;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'gc') {
          this.recordGCEvent(entry);
        }
      }
    });
  }

  async measureOperation(operation: () => Promise<void>): Promise<MemoryProfile> {
    this.startProfiling();
    await operation();
    return this.stopProfiling();
  }

  private startProfiling() {
    this.measurements = [];
    this.observer.observe({ entryTypes: ['gc'] });
    this.startMemoryMonitoring();
  }

  private stopProfiling(): MemoryProfile {
    this.observer.disconnect();
    return this.generateProfile();
  }

  private startMemoryMonitoring() {
    const interval = setInterval(() => {
      const usage = process.memoryUsage();
      this.measurements.push({
        peakUsage: usage.heapTotal,
        averageUsage: usage.heapUsed,
        timestamp: Date.now(),
        gcEvents: 0
      });
    }, 100);

    // Stop monitoring after 30 seconds max
    setTimeout(() => clearInterval(interval), 30000);
  }

  private generateProfile(): MemoryProfile {
    const peak = Math.max(...this.measurements.map(m => m.peakUsage));
    const avg = this.measurements.reduce((sum, m) => sum + m.averageUsage, 0)
      / this.measurements.length;

    return {
      peakUsage: peak,
      averageUsage: avg,
      timestamp: Date.now() - this.startTime,
      gcEvents: this.measurements.reduce((sum, m) => sum + m.gcEvents, 0)
    };
  }

  private recordGCEvent(entry: PerformanceEntry) {
    const lastMeasurement = this.measurements[this.measurements.length - 1];
    if (lastMeasurement) {
      lastMeasurement.gcEvents++;
    }
  }
}

// Memory leak detection utility
export async function detectMemoryLeaks(
  operation: () => Promise<void>,
  iterations: number = 10
): Promise<boolean> {
  const profiler = new MemoryProfiler();
  const baselineUsage = process.memoryUsage().heapUsed;
  const usageSnapshots: number[] = [];

  for (let i = 0; i < iterations; i++) {
    await operation();
    global.gc?.(); // Force garbage collection if available
    usageSnapshots.push(process.memoryUsage().heapUsed);
  }

  // Calculate trend in memory usage
  const trend = usageSnapshots.map((usage, index) => {
    if (index === 0) return 0;
    return usage - usageSnapshots[index - 1];
  });

  // If memory consistently increases, might indicate a leak
  const averageTrend = trend.reduce((a, b) => a + b, 0) / trend.length;
  return averageTrend > 1024 * 1024; // More than 1MB average increase
}

// Export utility functions
export const memoryUtils = {
  async measureHeapUsage(duration: number = 5000): Promise<MemoryProfile> {
    const profiler = new MemoryProfiler();
    return profiler.measureOperation(async () => {
      await new Promise(resolve => setTimeout(resolve, duration));
    });
  },

  async checkMemoryLeaks(
    operations: { name: string; operation: () => Promise<void> }[]
  ): Promise<string[]> {
    const leaks: string[] = [];

    for (const { name, operation } of operations) {
      const hasLeak = await detectMemoryLeaks(operation);
      if (hasLeak) {
        leaks.push(name);
      }
    }

    return leaks;
  },

  async monitorGarbageCollection(
    duration: number = 10000
  ): Promise<{ frequency: number }> {
    const profiler = new MemoryProfiler();
    const profile = await profiler.measureOperation(async () => {
      await new Promise(resolve => setTimeout(resolve, duration));
    });

    return {
      frequency: (profile.gcEvents / duration) * 60000 // Events per minute
    };
  }
};

export default memoryUtils;
