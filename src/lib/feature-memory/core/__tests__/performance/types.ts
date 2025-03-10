export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface TrendAnalysis {
  mean: number;
  stdDev: number;
  trend:
    | "stable"
    | "increasing"
    | "decreasing"
    | "rapidly increasing"
    | "rapidly decreasing";
  anomalies: number;
  samples: number[]; // Raw sample values
  timePoints: TimeSeriesPoint[]; // Time-series data points
}

export interface TrendSummary {
  mean: number;
  peak: number;
  trend: string;
  stability: number;
}

export interface PerformanceVisualization {
  cpu: TimeSeriesPoint[];
  memory: TimeSeriesPoint[];
  load: TimeSeriesPoint[];
  violations: ThresholdViolation[];
}

export interface TrendReport {
  date: string;
  reports: PerformanceReport[];
  summary: {
    totalTests: number;
    violations: number;
    recommendations: string[];
    trends: {
      cpu: TrendSummary;
      memory: TrendSummary;
      load: TrendSummary;
    };
  };
  visualizations: PerformanceVisualization;
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
