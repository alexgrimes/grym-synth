import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface TestMetrics {
  timestamp: string;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  performance: {
    avgTestDuration: number;
    slowestTests: Array<{
      name: string;
      duration: number;
    }>;
    memoryUsage: number;
  };
}

interface TestHistory {
  lastRun?: TestMetrics;
  history: TestMetrics[];
  trends: {
    passRate: number[];
    duration: number[];
    coverage: number[];
  };
}

/**
 * Get default test metrics
 */
function getDefaultMetrics(): TestMetrics {
  return {
    timestamp: new Date().toISOString(),
    duration: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    coverage: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    },
    performance: {
      avgTestDuration: 0,
      slowestTests: [],
      memoryUsage: 0
    }
  };
}

/**
 * Collects and analyzes test metrics
 */
export class TestMetricsCollector {
  private readonly metricsPath: string;
  private history: TestHistory;

  constructor() {
    this.metricsPath = resolve(__dirname, '../metrics/test-history.json');
    this.history = this.loadHistory();
  }

  /**
   * Record metrics from a test run
   */
  async recordMetrics(metrics: TestMetrics): Promise<void> {
    // Update history
    this.history.lastRun = metrics;
    this.history.history.push(metrics);

    // Keep last 100 runs
    if (this.history.history.length > 100) {
      this.history.history.shift();
    }

    // Update trends
    this.updateTrends();

    // Save metrics
    await this.saveHistory();
  }

  /**
   * Get test run summary
   */
  getRunSummary(): TestMetrics {
    return this.history.lastRun || getDefaultMetrics();
  }

  /**
   * Get performance trends
   */
  getTrends(): TestHistory['trends'] {
    return this.history.trends;
  }

  /**
   * Get performance alerts
   */
  getAlerts(): string[] {
    const alerts: string[] = [];
    const lastRun = this.getRunSummary();

    // Check pass rate
    const passRate = (lastRun.passed / (lastRun.passed + lastRun.failed)) * 100;
    if (passRate < 95) {
      alerts.push(`Pass rate below 95%: ${passRate.toFixed(1)}%`);
    }

    // Check coverage
    const minCoverage = 85;
    Object.entries(lastRun.coverage).forEach(([type, value]) => {
      if (value < minCoverage) {
        alerts.push(`${type} coverage below ${minCoverage}%: ${value}%`);
      }
    });

    // Check performance
    const avgDuration = this.getAverageDuration();
    if (lastRun.duration > avgDuration * 1.5) {
      alerts.push(`Test duration 50% above average: ${lastRun.duration}ms`);
    }

    return alerts;
  }

  /**
   * Generate metrics report
   */
  generateReport(): string {
    const lastRun = this.getRunSummary();
    const trends = this.getTrends();
    const alerts = this.getAlerts();

    return `
Test Metrics Report
==================

Last Run: ${lastRun.timestamp}
Duration: ${lastRun.duration}ms

Results
-------
✅ Passed: ${lastRun.passed}
❌ Failed: ${lastRun.failed}
⏭️ Skipped: ${lastRun.skipped}

Coverage
--------
📊 Statements: ${lastRun.coverage.statements}%
📊 Branches: ${lastRun.coverage.branches}%
📊 Functions: ${lastRun.coverage.functions}%
📊 Lines: ${lastRun.coverage.lines}%

Performance
----------
⚡ Average test duration: ${lastRun.performance.avgTestDuration}ms
🐌 Slowest tests:
${lastRun.performance.slowestTests
  .map(test => `  - ${test.name}: ${test.duration}ms`)
  .join('\n')}
💾 Memory usage: ${(lastRun.performance.memoryUsage / 1024 / 1024).toFixed(1)}MB

Trends
------
📈 Pass rate trend: ${this.formatTrend(trends.passRate)}
⏱️ Duration trend: ${this.formatTrend(trends.duration)}
📊 Coverage trend: ${this.formatTrend(trends.coverage)}

${alerts.length > 0 ? `
Alerts
------
${alerts.map(alert => `⚠️ ${alert}`).join('\n')}
` : ''}
    `.trim();
  }

  private loadHistory(): TestHistory {
    if (existsSync(this.metricsPath)) {
      return JSON.parse(readFileSync(this.metricsPath, 'utf8'));
    }

    return {
      history: [],
      trends: {
        passRate: [],
        duration: [],
        coverage: []
      }
    };
  }

  private async saveHistory(): Promise<void> {
    writeFileSync(this.metricsPath, JSON.stringify(this.history, null, 2));
  }

  private updateTrends(): void {
    const { history } = this;

    // Calculate trends from last 10 runs
    const recentRuns = history.history.slice(-10);

    this.history.trends = {
      passRate: recentRuns.map(run => 
        (run.passed / (run.passed + run.failed)) * 100
      ),
      duration: recentRuns.map(run => run.duration),
      coverage: recentRuns.map(run => 
        Object.values(run.coverage).reduce((a, b) => a + b, 0) / 4
      )
    };
  }

  private getAverageDuration(): number {
    if (this.history.history.length === 0) return 0;
    const durations = this.history.history.map(run => run.duration);
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  private formatTrend(values: number[]): string {
    const arrows = values.slice(0, -1).map((val, i) => {
      const next = values[i + 1];
      if (next > val) return '↗️';
      if (next < val) return '↘️';
      return '➡️';
    });
    return arrows.join(' ') || '➡️';  // Default arrow if no trend
  }
}