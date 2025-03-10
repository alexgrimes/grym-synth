import { profiler, ProfileSession, CPUProfile } from "./profile-utils";
import { EventEmitter } from "events";

export interface PerformanceThresholds {
  cpu: {
    max: number; // Maximum CPU usage percentage
    sustained: number; // Maximum sustained CPU usage over interval
    interval: number; // Interval for sustained measurement (ms)
  };
  memory: {
    max: number; // Maximum heap usage in bytes
    growth: number; // Maximum allowed memory growth rate (bytes/sec)
    leakThreshold: number; // Continuous growth threshold (bytes)
  };
  load: {
    max: number; // Maximum system load percentage
    warning: number; // Warning threshold percentage
  };
}

export interface ThresholdViolation {
  type: "cpu" | "memory" | "load";
  value: number;
  threshold: number;
  timestamp: number;
  message: string;
}

export interface PerformanceReport {
  sessionId: string;
  duration: number;
  violations: ThresholdViolation[];
  trends: {
    cpu: TrendAnalysis;
    memory: TrendAnalysis;
    load: TrendAnalysis;
  };
  recommendations: string[];
}

interface TrendAnalysis {
  mean: number;
  stdDev: number;
  trend: "stable" | "increasing" | "decreasing";
  anomalies: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  cpu: {
    max: 90,
    sustained: 70,
    interval: 5000,
  },
  memory: {
    max: 1.5 * 1024 * 1024 * 1024, // 1.5GB
    growth: 1024 * 1024 * 10, // 10MB/s
    leakThreshold: 1024 * 1024 * 100, // 100MB
  },
  load: {
    max: 85,
    warning: 70,
  },
};

export class PerformanceMonitor extends EventEmitter {
  private thresholds: PerformanceThresholds;
  private violations: Map<string, ThresholdViolation[]>;
  private activeMonitors: Map<string, string>;

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    super();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.violations = new Map();
    this.activeMonitors = new Map();
  }

  public startMonitoring(sessionId: string): void {
    if (this.activeMonitors.has(sessionId)) {
      throw new Error(`Monitoring session ${sessionId} already exists`);
    }

    profiler.startProfiling(sessionId);
    this.violations.set(sessionId, []);
    this.activeMonitors.set(sessionId, sessionId);

    this.emit("monitoringStarted", { sessionId });
  }

  public stopMonitoring(sessionId: string): PerformanceReport {
    if (!this.activeMonitors.has(sessionId)) {
      throw new Error(`No active monitoring session found for ${sessionId}`);
    }

    const session = profiler.stopProfiling(sessionId);
    this.activeMonitors.delete(sessionId);

    const report = this.generateReport(
      session,
      this.violations.get(sessionId) || []
    );
    this.violations.delete(sessionId);

    this.emit("monitoringStopped", { sessionId, report });
    return report;
  }

  private generateReport(
    session: ProfileSession,
    violations: ThresholdViolation[]
  ): PerformanceReport {
    const cpuSamples = session.samples.map((s) => s.usage.total);
    const memorySamples = session.samples.map((s) => s.memory.heapUsed);
    const loadSamples = session.samples.map((s) => Math.max(...s.load));

    const report: PerformanceReport = {
      sessionId: session.startTime.toString(),
      duration: session.duration || 0,
      violations,
      trends: {
        cpu: this.analyzeTrend(cpuSamples),
        memory: this.analyzeTrend(memorySamples),
        load: this.analyzeTrend(loadSamples),
      },
      recommendations: this.generateRecommendations(violations, {
        cpu: this.analyzeTrend(cpuSamples),
        memory: this.analyzeTrend(memorySamples),
        load: this.analyzeTrend(loadSamples),
      }),
    };

    return report;
  }

  private analyzeTrend(samples: number[]): TrendAnalysis {
    if (samples.length < 2) {
      return {
        mean: samples[0] || 0,
        stdDev: 0,
        trend: "stable",
        anomalies: 0,
      };
    }

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      samples.length;
    const stdDev = Math.sqrt(variance);

    // Calculate trend using linear regression
    const xValues = Array.from({ length: samples.length }, (_, i) => i);
    const slope = this.calculateSlope(xValues, samples);

    // Detect anomalies (values outside 2 standard deviations)
    const anomalies = samples.filter(
      (s) => Math.abs(s - mean) > 2 * stdDev
    ).length;

    return {
      mean,
      stdDev,
      trend: this.getTrendType(slope, stdDev),
      anomalies,
    };
  }

  private calculateSlope(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private getTrendType(
    slope: number,
    stdDev: number
  ): "stable" | "increasing" | "decreasing" {
    const significance = stdDev * 0.1; // 10% of standard deviation as significance threshold
    if (Math.abs(slope) < significance) return "stable";
    return slope > 0 ? "increasing" : "decreasing";
  }

  private generateRecommendations(
    violations: ThresholdViolation[],
    trends: PerformanceReport["trends"]
  ): string[] {
    const recommendations: string[] = [];

    // CPU recommendations
    if (trends.cpu.trend === "increasing") {
      recommendations.push(
        "CPU usage shows an increasing trend. Consider optimizing compute-intensive operations."
      );
    }
    if (violations.some((v) => v.type === "cpu")) {
      recommendations.push(
        "CPU threshold violations detected. Review operation batching and concurrent execution limits."
      );
    }

    // Memory recommendations
    if (trends.memory.trend === "increasing") {
      recommendations.push(
        "Memory usage is trending upward. Check for potential memory leaks or inefficient caching."
      );
    }
    if (violations.some((v) => v.type === "memory")) {
      recommendations.push(
        "Memory threshold violations detected. Review cache sizes and cleanup strategies."
      );
    }

    // Load recommendations
    if (trends.load.trend === "increasing") {
      recommendations.push(
        "System load is increasing. Consider implementing rate limiting or load balancing."
      );
    }
    if (trends.load.anomalies > 0) {
      recommendations.push(
        "System load shows irregular patterns. Review resource allocation and scheduling."
      );
    }

    return recommendations;
  }
}

export const monitor = new PerformanceMonitor();
export default monitor;
