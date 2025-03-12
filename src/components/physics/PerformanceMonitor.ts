interface PerformanceMetrics {
  frameTime: number;
  updateTime: number;
  physicsTime: number;
  renderTime: number;
  fieldCount: number;
  parameterCount: number;
  memoryUsage?: {
    usedHeapSize: number;
    totalHeapSize: number;
    heapLimit: number;
  };
  timestamp?: number;
}

interface PerformanceThresholds {
  maxFrameTime: number;
  maxUpdateTime: number;
  maxPhysicsTime: number;
  maxRenderTime: number;
  maxMemoryUsage: number;
}

type MetricKey = keyof Omit<PerformanceMetrics, 'memoryUsage' | 'timestamp'>;

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxSamples: number = 600; // 10 seconds at 60fps
  private thresholds: PerformanceThresholds;
  private warningCallbacks: ((warning: string) => void)[] = [];

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxFrameTime: 16.67, // 60fps
      maxUpdateTime: 8,    // Half frame time
      maxPhysicsTime: 4,   // Quarter frame time
      maxRenderTime: 4,    // Quarter frame time
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      ...thresholds
    };
  }

  startFrame(): number {
    return performance.now();
  }

  recordMetrics(metrics: Partial<PerformanceMetrics>): void {
    const currentMetrics: PerformanceMetrics = {
      frameTime: 0,
      updateTime: 0,
      physicsTime: 0,
      renderTime: 0,
      fieldCount: 0,
      parameterCount: 0,
      ...metrics,
      timestamp: performance.now()
    };

    // Add memory metrics if available
    if (performance.memory) {
      currentMetrics.memoryUsage = {
        usedHeapSize: performance.memory.usedJSHeapSize,
        totalHeapSize: performance.memory.totalJSHeapSize,
        heapLimit: performance.memory.jsHeapSizeLimit
      };
    }

    this.metrics.push(currentMetrics);

    // Keep only recent samples
    if (this.metrics.length > this.maxSamples) {
      this.metrics.shift();
    }

    this.checkThresholds(currentMetrics);
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    if (metrics.frameTime > this.thresholds.maxFrameTime) {
      this.emitWarning(`Frame time exceeded: ${metrics.frameTime.toFixed(2)}ms`);
    }

    if (metrics.updateTime > this.thresholds.maxUpdateTime) {
      this.emitWarning(`Update time exceeded: ${metrics.updateTime.toFixed(2)}ms`);
    }

    if (metrics.physicsTime > this.thresholds.maxPhysicsTime) {
      this.emitWarning(`Physics time exceeded: ${metrics.physicsTime.toFixed(2)}ms`);
    }

    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      this.emitWarning(`Render time exceeded: ${metrics.renderTime.toFixed(2)}ms`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage.usedHeapSize > this.thresholds.maxMemoryUsage) {
      this.emitWarning(
        `Memory usage exceeded: ${(metrics.memoryUsage.usedHeapSize / 1024 / 1024).toFixed(1)}MB`
      );
    }
  }

  getAverageMetrics(sampleCount: number = 60): Partial<PerformanceMetrics> {
    const samples = this.metrics.slice(-sampleCount);
    if (samples.length === 0) return {};

    const metricKeys: MetricKey[] = [
      'frameTime',
      'updateTime',
      'physicsTime',
      'renderTime',
      'fieldCount',
      'parameterCount'
    ];

    const sum = metricKeys.reduce((acc, key) => {
      acc[key] = samples.reduce((sum, metric) => sum + metric[key], 0) / samples.length;
      return acc;
    }, {} as Partial<Record<MetricKey, number>>);

    return sum;
  }

  getPerformanceReport(): string {
    const averages = this.getAverageMetrics();
    let report = 'Performance Report:\n';

    if (averages.frameTime !== undefined) {
      report += `Avg Frame Time: ${averages.frameTime.toFixed(2)}ms\n`;
    }
    if (averages.updateTime !== undefined) {
      report += `Avg Update Time: ${averages.updateTime.toFixed(2)}ms\n`;
    }
    if (averages.physicsTime !== undefined) {
      report += `Avg Physics Time: ${averages.physicsTime.toFixed(2)}ms\n`;
    }
    if (averages.renderTime !== undefined) {
      report += `Avg Render Time: ${averages.renderTime.toFixed(2)}ms\n`;
    }
    if (averages.fieldCount !== undefined) {
      report += `Field Count: ${averages.fieldCount}\n`;
    }
    if (averages.parameterCount !== undefined) {
      report += `Parameter Count: ${averages.parameterCount}\n`;
    }

    const lastMetrics = this.metrics[this.metrics.length - 1];
    if (lastMetrics?.memoryUsage) {
      const { usedHeapSize, totalHeapSize, heapLimit } = lastMetrics.memoryUsage;
      report += `Memory Usage: ${(usedHeapSize / 1024 / 1024).toFixed(1)}MB / `;
      report += `${(totalHeapSize / 1024 / 1024).toFixed(1)}MB `;
      report += `(Limit: ${(heapLimit / 1024 / 1024).toFixed(1)}MB)\n`;
    }

    return report;
  }

  onWarning(callback: (warning: string) => void): void {
    this.warningCallbacks.push(callback);
  }

  private emitWarning(warning: string): void {
    this.warningCallbacks.forEach(callback => callback(warning));
  }

  resetMetrics(): void {
    this.metrics = [];
  }
}

export default PerformanceMonitor;
