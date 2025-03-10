/**
 * Utility class for collecting and analyzing performance metrics
 */
export class MetricsCollector {
  private startTime: number | null = null;
  private measurements: Map<string, number[]> = new Map();
  private memoryUsage: number[] = [];
  private cpuUsage: number[] = [];

  startRecording(): void {
    this.startTime = Date.now();
    this.measurements.clear();
    this.memoryUsage = [];
    this.cpuUsage = [];
    this.recordMemoryUsage();
  }

  stopRecording(): void {
    if (!this.startTime) {
      throw new Error('Recording was not started');
    }
    const duration = Date.now() - this.startTime;
    this.record('totalDuration', duration);
    this.startTime = null;
  }

  record(metric: string, value: number): void {
    if (!this.measurements.has(metric)) {
      this.measurements.set(metric, []);
    }
    this.measurements.get(metric)!.push(value);
  }

  private recordMemoryUsage(): void {
    if (typeof process !== 'undefined') {
      const usage = process.memoryUsage();
      this.memoryUsage.push(usage.heapUsed);
    }
  }

  getMetrics(): MetricsReport {
    const report: MetricsReport = {
      duration: this.getDurationMetrics(),
      memory: this.getMemoryMetrics(),
      custom: this.getCustomMetrics()
    };

    return report;
  }

  private getDurationMetrics(): DurationMetrics {
    const durationMeasurements = this.measurements.get('totalDuration') || [];
    return {
      total: durationMeasurements[durationMeasurements.length - 1] || 0,
      average: this.calculateAverage(durationMeasurements)
    };
  }

  private getMemoryMetrics(): MemoryMetrics {
    return {
      peak: Math.max(...this.memoryUsage),
      average: this.calculateAverage(this.memoryUsage),
      final: this.memoryUsage[this.memoryUsage.length - 1] || 0
    };
  }

  private getCustomMetrics(): CustomMetrics {
    const customMetrics: CustomMetrics = {};

    for (const [metric, values] of this.measurements.entries()) {
      if (metric !== 'totalDuration') {
        customMetrics[metric] = {
          min: Math.min(...values),
          max: Math.max(...values),
          average: this.calculateAverage(values),
          count: values.length
        };
      }
    }

    return customMetrics;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}

interface DurationMetrics {
  total: number;
  average: number;
}

interface MemoryMetrics {
  peak: number;
  average: number;
  final: number;
}

interface CustomMetricData {
  min: number;
  max: number;
  average: number;
  count: number;
}

interface CustomMetrics {
  [key: string]: CustomMetricData;
}

interface MetricsReport {
  duration: DurationMetrics;
  memory: MemoryMetrics;
  custom: CustomMetrics;
}
