import {
  PerformanceReport,
  ThresholdViolation,
  TimeSeriesPoint,
  PerformanceVisualization,
  TrendReport,
  TrendSummary,
  TrendAnalysis,
} from "./types";
import * as fs from "fs/promises";
import * as path from "path";

export class PerformanceReportGenerator {
  private reportDir: string;
  private historicalData: Map<string, TrendReport>;

  constructor(reportDir: string) {
    this.reportDir = reportDir;
    this.historicalData = new Map();
  }

  public async initialize(): Promise<void> {
    await fs.mkdir(this.reportDir, { recursive: true });
    await this.loadHistoricalData();
  }

  private async loadHistoricalData(): Promise<void> {
    const files = await fs.readdir(this.reportDir);
    const reportFiles = files.filter((f) => f.startsWith("perf-report-"));

    for (const file of reportFiles) {
      const content = await fs.readFile(
        path.join(this.reportDir, file),
        "utf-8"
      );
      const report = JSON.parse(content) as PerformanceReport;
      const date = new Date(parseInt(file.split("-")[2]))
        .toISOString()
        .split("T")[0];

      if (!this.historicalData.has(date)) {
        this.historicalData.set(date, this.createEmptyTrendReport(date));
      }

      const trendReport = this.historicalData.get(date)!;
      trendReport.reports.push(report);
    }

    // Generate summaries for all dates
    for (const [date, report] of this.historicalData.entries()) {
      this.updateTrendReport(report);
    }
  }

  private createEmptyTrendReport(date: string): TrendReport {
    return {
      date,
      reports: [],
      summary: {
        totalTests: 0,
        violations: 0,
        recommendations: [],
        trends: {
          cpu: { mean: 0, peak: 0, trend: "stable", stability: 1 },
          memory: { mean: 0, peak: 0, trend: "stable", stability: 1 },
          load: { mean: 0, peak: 0, trend: "stable", stability: 1 },
        },
      },
      visualizations: {
        cpu: [],
        memory: [],
        load: [],
        violations: [],
      },
    };
  }

  private updateTrendReport(report: TrendReport): void {
    report.summary.totalTests = report.reports.length;
    report.summary.violations = report.reports.reduce(
      (acc, r) => acc + r.violations.length,
      0
    );

    // Collect all recommendations and count occurrences
    const recommendationCounts = new Map<string, number>();
    report.reports.forEach((r) => {
      r.recommendations.forEach((rec) => {
        recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 1);
      });
    });

    // Sort recommendations by frequency
    report.summary.recommendations = Array.from(recommendationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([rec]) => rec);

    // Generate time series data
    report.visualizations = this.generateVisualizations(report.reports);

    // Update trend summaries
    report.summary.trends = {
      cpu: this.calculateTrendSummary(report.visualizations.cpu),
      memory: this.calculateTrendSummary(report.visualizations.memory),
      load: this.calculateTrendSummary(report.visualizations.load),
    };
  }

  private generateVisualizations(
    reports: PerformanceReport[]
  ): PerformanceVisualization {
    const visualization: PerformanceVisualization = {
      cpu: [],
      memory: [],
      load: [],
      violations: [],
    };

    reports.forEach((report) => {
      const baseTime = parseInt(report.sessionId);

      report.trends.cpu.timePoints.forEach((point) => {
        visualization.cpu.push(point);
      });

      report.trends.memory.timePoints.forEach((point) => {
        visualization.memory.push(point);
      });

      report.trends.load.timePoints.forEach((point) => {
        visualization.load.push(point);
      });

      visualization.violations.push(...report.violations);
    });

    // Sort time series data by timestamp
    visualization.cpu.sort((a, b) => a.timestamp - b.timestamp);
    visualization.memory.sort((a, b) => a.timestamp - b.timestamp);
    visualization.load.sort((a, b) => a.timestamp - b.timestamp);

    return visualization;
  }

  private calculateTrendSummary(data: TimeSeriesPoint[]): TrendSummary {
    if (data.length === 0) {
      return { mean: 0, peak: 0, trend: "stable", stability: 1 };
    }

    const values = data.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const peak = Math.max(...values);

    // Calculate trend using linear regression
    const xValues = Array.from({ length: values.length }, (_, i) => i);
    const slope = this.calculateSlope(xValues, values);

    // Calculate stability (inverse of coefficient of variation)
    const stdDev = Math.sqrt(
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        values.length
    );
    const stability = mean === 0 ? 1 : 1 - stdDev / mean;

    return {
      mean,
      peak,
      trend: this.getTrendDescription(slope, stdDev),
      stability: Math.max(0, Math.min(1, stability)),
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

  private getTrendDescription(slope: number, stdDev: number): string {
    const significance = stdDev * 0.1;
    if (Math.abs(slope) < significance) return "stable";
    if (slope > 0)
      return slope > significance * 2 ? "rapidly increasing" : "increasing";
    return slope < -significance * 2 ? "rapidly decreasing" : "decreasing";
  }

  public async generateReport(date: string): Promise<string> {
    const report = this.historicalData.get(date);
    if (!report) {
      throw new Error(`No data available for date: ${date}`);
    }

    const output = [
      `Performance Trend Report - ${date}`,
      "=====================================",
      "",
      `Total Tests: ${report.summary.totalTests}`,
      `Total Violations: ${report.summary.violations}`,
      "",
      "Performance Trends:",
      `CPU: ${this.formatTrendSummary(report.summary.trends.cpu)}`,
      `Memory: ${this.formatTrendSummary(report.summary.trends.memory)}`,
      `System Load: ${this.formatTrendSummary(report.summary.trends.load)}`,
      "",
      "Top Recommendations:",
      ...report.summary.recommendations.map((r) => `- ${r}`),
      "",
      "Violation Summary:",
      ...this.summarizeViolations(report.visualizations.violations),
      "",
      "Performance Timeline:",
      ...this.generateTimeline(report.visualizations),
    ];

    return output.join("\n");
  }

  private formatTrendSummary(trend: TrendSummary): string {
    return (
      `${trend.trend} (mean: ${trend.mean.toFixed(2)}, ` +
      `peak: ${trend.peak.toFixed(2)}, stability: ${(
        trend.stability * 100
      ).toFixed(1)}%)`
    );
  }

  private summarizeViolations(violations: ThresholdViolation[]): string[] {
    const summary = violations.reduce((acc, v) => {
      const key = v.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(v);
      return acc;
    }, {} as Record<string, ThresholdViolation[]>);

    return Object.entries(summary).map(
      ([type, violations]) =>
        `${type.toUpperCase()}: ${violations.length} violations, ` +
        `max value: ${Math.max(...violations.map((v) => v.value)).toFixed(2)}`
    );
  }

  private generateTimeline(vis: PerformanceVisualization): string[] {
    const timeline: string[] = [];
    const dataPoints = 20; // Number of points to show in timeline
    const step = Math.max(1, Math.floor(vis.cpu.length / dataPoints));

    for (let i = 0; i < vis.cpu.length; i += step) {
      const time = new Date(vis.cpu[i].timestamp)
        .toISOString()
        .split("T")[1]
        .slice(0, -1);
      timeline.push(
        `[${time}] CPU: ${vis.cpu[i].value.toFixed(1)}% ` +
          `Mem: ${this.formatBytes(vis.memory[i].value)} ` +
          `Load: ${vis.load[i].value.toFixed(1)}%`
      );
    }

    return timeline;
  }

  private formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

export const reportGenerator = new PerformanceReportGenerator(
  path.join(__dirname, "performance-reports")
);
export default reportGenerator;
