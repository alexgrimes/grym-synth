/**
 * Test helpers and mock data for Feature Memory System tests
 */

export interface MockPattern {
  id: string;
  features: Map<string, any>;
  confidence: number;
  timestamp: Date;
  metadata: {
    source: string;
    category: string;
    frequency: number;
    lastUpdated: Date;
  };
}

/**
 * Create a mock pattern with default values
 */
export function createMockPattern(overrides: Partial<MockPattern> = {}): MockPattern {
  const now = new Date();
  return {
    id: `pattern_${Date.now()}`,
    features: new Map([['key', 'value']]),
    confidence: 0.95,
    timestamp: now,
    metadata: {
      source: 'test',
      category: 'test',
      frequency: 1,
      lastUpdated: now,
    },
    ...overrides,
  };
}

/**
 * Create multiple mock patterns
 */
export function createMockPatterns(count: number): MockPattern[] {
  return Array.from({ length: count }, (_, index) => 
    createMockPattern({
      id: `pattern_${index}`,
      features: new Map([['key', `value_${index}`]]),
    })
  );
}

/**
 * Mock performance measurement utilities
 */
export class PerformanceMonitor {
  private startTime: number;
  private measurements: Map<string, number[]> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  start(): void {
    this.startTime = performance.now();
  }

  measure(operation: string): number {
    const duration = performance.now() - this.startTime;
    const measurements = this.measurements.get(operation) || [];
    measurements.push(duration);
    this.measurements.set(operation, measurements);
    return duration;
  }

  getAverageTime(operation: string): number {
    const measurements = this.measurements.get(operation) || [];
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  getMaxTime(operation: string): number {
    const measurements = this.measurements.get(operation) || [];
    return Math.max(...measurements, 0);
  }

  reset(): void {
    this.measurements.clear();
    this.startTime = performance.now();
  }
}

/**
 * Mock memory usage utilities
 */
export class MemoryMonitor {
  private initialMemory: number;
  private measurements: number[] = [];

  constructor() {
    this.initialMemory = process.memoryUsage().heapUsed;
  }

  measure(): number {
    const currentMemory = process.memoryUsage().heapUsed;
    const usage = (currentMemory - this.initialMemory) / (1024 * 1024); // Convert to MB
    this.measurements.push(usage);
    return usage;
  }

  getPeakMemory(): number {
    return Math.max(...this.measurements, 0);
  }

  getAverageMemory(): number {
    if (this.measurements.length === 0) return 0;
    return this.measurements.reduce((sum, mem) => sum + mem, 0) / this.measurements.length;
  }

  reset(): void {
    this.measurements = [];
    this.initialMemory = process.memoryUsage().heapUsed;
  }
}

/**
 * Mock error tracking utilities
 */
export class ErrorTracker {
  private errors: Error[] = [];
  private operationCount: number = 0;

  trackOperation(success: boolean = true, error?: Error): void {
    this.operationCount++;
    if (!success && error) {
      this.errors.push(error);
    }
  }

  getErrorRate(): number {
    if (this.operationCount === 0) return 0;
    return (this.errors.length / this.operationCount) * 100;
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  getOperationCount(): number {
    return this.operationCount;
  }

  reset(): void {
    this.errors = [];
    this.operationCount = 0;
  }
}

/**
 * Test utilities for async operations
 */
export const waitFor = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const runWithTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};