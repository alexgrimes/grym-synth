export interface MetricData {
  [key: string]: any;
  timestamp?: number;
}

export interface MetricConfig {
  name: string;
  threshold?: number;
  evaluator?: (data: MetricData) => boolean;
}

export class HealthMonitor {
  private metrics: Map<string, MetricData[]> = new Map();
  private metricConfigs: Map<string, MetricConfig> = new Map();
  private errorHandlers: ((error: Error) => void)[] = [];
  private readonly maxMetricsPerType = 1000;

  constructor() {
    // Initialize with default metrics
    this.registerMetric({
      name: "system.health",
      threshold: 0.8,
      evaluator: (data) => data.status === "healthy",
    });
  }

  registerMetric(config: MetricConfig): void {
    this.metricConfigs.set(config.name, config);
  }

  recordMetric(name: string, data: MetricData): void {
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricList = this.metrics.get(name)!;
    metricList.push(data);

    // Trim old metrics if we exceed the limit
    if (metricList.length > this.maxMetricsPerType) {
      metricList.splice(0, metricList.length - this.maxMetricsPerType);
    }

    // Evaluate metric if it has a config
    const config = this.metricConfigs.get(name);
    if (config?.evaluator) {
      try {
        const isHealthy = config.evaluator(data);
        if (!isHealthy) {
          this.notifyError(new Error(`Metric ${name} failed health check`));
        }
      } catch (error) {
        this.notifyError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  getMetrics(
    name: string,
    timeRange?: { start: number; end: number }
  ): MetricData[] {
    const metrics = this.metrics.get(name) || [];

    if (!timeRange) {
      return metrics;
    }

    return metrics.filter((metric) => {
      const timestamp = metric.timestamp || 0;
      return timestamp >= timeRange.start && timestamp <= timeRange.end;
    });
  }

  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (e) {
        console.error("Error in health monitor error handler:", e);
      }
    });
  }

  getHealthStatus(): {
    healthy: boolean;
    metrics: Record<string, MetricData[]>;
  } {
    const allHealthy = Array.from(this.metricConfigs.entries()).every(
      ([name, config]) => {
        if (!config.evaluator) {
          return true;
        }

        const recentMetrics = this.getMetrics(name, {
          start: Date.now() - 5 * 60 * 1000, // Last 5 minutes
          end: Date.now(),
        });

        if (recentMetrics.length === 0) {
          return true;
        }

        return recentMetrics.some((metric) => config.evaluator!(metric));
      }
    );

    return {
      healthy: allHealthy,
      metrics: Object.fromEntries(this.metrics),
    };
  }
}
