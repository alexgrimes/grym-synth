import {
  ThresholdManager,
  ThresholdConfig,
  HealthMetrics,
  ValidationResult,
  MetricHistory,
  MetricValidationResult,
  MemoryMetrics,
  PerformanceMetrics,
  ErrorMetrics,
} from './types';

/**
 * Implementation of ThresholdManager that manages threshold configurations,
 * validates metrics against thresholds, and provides dynamic threshold adjustment.
 */
export class HealthThresholdManager implements ThresholdManager {
  private _config: ThresholdConfig;
  private readonly metricEvaluator: MetricEvaluator;

  constructor(config: ThresholdConfig) {
    this._config = config;
    this.metricEvaluator = new MetricEvaluator(config);
  }

  /**
   * Get the current threshold configuration
   */
  get config(): ThresholdConfig {
    return this._config;
  }

  /**
   * Validate metrics against thresholds
   * @param metrics Health metrics to validate
   * @returns Validation result with detailed information about violations and recommendations
   */
  public validate(metrics: HealthMetrics): ValidationResult {
    // Extract component metrics
    const memoryMetrics: MemoryMetrics = {
      heapUsage: metrics.resourceUsage.memoryUsage,
      heapLimit: process.memoryUsage().heapTotal,
      cacheUtilization: metrics.resourceUsage.storageUsage / metrics.resourceUsage.storageLimit,
      timestamp: Date.now(),
    };

    const performanceMetrics: PerformanceMetrics = {
      latencies: metrics.recentLatencies || [],
      throughput: metrics.healthStatus.metrics.throughput,
      timestamp: Date.now(),
    };

    const errorMetrics: ErrorMetrics = {
      errorCount:
        metrics.healthStatus.metrics.errorRate * metrics.healthStatus.metrics.totalOperations,
      totalOperations: metrics.healthStatus.metrics.totalOperations,
      timestamp: Date.now(),
    };

    // Evaluate each component
    const memoryResult = this.metricEvaluator.evaluateMemoryHealth(memoryMetrics);
    const performanceResult = this.metricEvaluator.evaluatePerformanceHealth(performanceMetrics);
    const errorResult = this.metricEvaluator.evaluateErrorHealth(errorMetrics);

    // Combine all violations and recommendations
    const violations = [
      ...memoryResult.violations,
      ...performanceResult.violations,
      ...errorResult.violations,
    ];

    const recommendations = [
      ...memoryResult.recommendations,
      ...performanceResult.recommendations,
      ...errorResult.recommendations,
    ];

    // Determine overall validity
    const isValid = memoryResult.isValid && performanceResult.isValid && errorResult.isValid;

    return {
      isValid,
      violations,
      recommendations,
      metrics: {
        memory: memoryResult,
        performance: performanceResult,
        error: errorResult,
      },
    };
  }

  /**
   * Check if recovery thresholds are met for the given metrics
   * @param metrics Health metrics to check
   * @returns True if recovery thresholds are met, false otherwise
   */
  public isRecoveryThresholdMet(metrics: HealthMetrics): boolean {
    // Extract component metrics
    const memoryMetrics: MemoryMetrics = {
      heapUsage: metrics.resourceUsage.memoryUsage,
      heapLimit: process.memoryUsage().heapTotal,
      cacheUtilization: metrics.resourceUsage.storageUsage / metrics.resourceUsage.storageLimit,
      timestamp: Date.now(),
    };

    const performanceMetrics: PerformanceMetrics = {
      latencies: metrics.recentLatencies || [],
      throughput: metrics.healthStatus.metrics.throughput,
      timestamp: Date.now(),
    };

    const errorMetrics: ErrorMetrics = {
      errorCount:
        metrics.healthStatus.metrics.errorRate * metrics.healthStatus.metrics.totalOperations,
      totalOperations: metrics.healthStatus.metrics.totalOperations,
      timestamp: Date.now(),
    };

    // Check memory recovery thresholds
    const heapUsageRatio = memoryMetrics.heapUsage / memoryMetrics.heapLimit;
    const memoryRecovered =
      heapUsageRatio <= this._config.memory.heapUsage.recovery &&
      memoryMetrics.cacheUtilization <= this._config.memory.cacheUtilization.recovery;

    // Check performance recovery thresholds
    const avgLatency =
      performanceMetrics.latencies.length > 0
        ? performanceMetrics.latencies.reduce((a, b) => a + b, 0) /
          performanceMetrics.latencies.length
        : 0;

    const performanceRecovered =
      avgLatency <= this._config.performance.latency.recovery &&
      performanceMetrics.throughput >= this._config.performance.throughput.recovery;

    // Check error recovery thresholds
    const errorRate =
      errorMetrics.totalOperations > 0 ? errorMetrics.errorCount / errorMetrics.totalOperations : 0;

    const errorsRecovered = errorRate <= this._config.error.errorRate.recovery;

    // All components must meet recovery thresholds
    return memoryRecovered && performanceRecovered && errorsRecovered;
  }

  /**
   * Adjust thresholds based on historical metrics
   * @param history Historical metrics used to adjust thresholds
   */
  public adjustThresholds(history: MetricHistory): void {
    if (
      history.memory.length === 0 ||
      history.performance.length === 0 ||
      history.error.length === 0
    ) {
      return; // Not enough data to adjust thresholds
    }

    // Adjust memory thresholds based on historical data
    this.adjustMemoryThresholds(history.memory);

    // Adjust performance thresholds based on historical data
    this.adjustPerformanceThresholds(history.performance);

    // Adjust error thresholds based on historical data
    this.adjustErrorThresholds(history.error);

    console.log('[ThresholdManager] Thresholds adjusted based on historical metrics');
  }

  /**
   * Adjust memory thresholds based on historical memory metrics
   * @param memoryHistory Historical memory metrics
   */
  private adjustMemoryThresholds(memoryHistory: MemoryMetrics[]): void {
    // Calculate average heap usage and cache utilization
    const avgHeapUsage =
      memoryHistory.reduce((sum, m) => sum + m.heapUsage / m.heapLimit, 0) / memoryHistory.length;
    const avgCacheUtilization =
      memoryHistory.reduce((sum, m) => sum + m.cacheUtilization, 0) / memoryHistory.length;

    // Calculate standard deviation for heap usage
    const heapUsageVariance =
      memoryHistory.reduce((sum, m) => {
        const heapRatio = m.heapUsage / m.heapLimit;
        return sum + Math.pow(heapRatio - avgHeapUsage, 2);
      }, 0) / memoryHistory.length;
    const heapUsageStdDev = Math.sqrt(heapUsageVariance);

    // Calculate standard deviation for cache utilization
    const cacheUtilizationVariance =
      memoryHistory.reduce((sum, m) => {
        return sum + Math.pow(m.cacheUtilization - avgCacheUtilization, 2);
      }, 0) / memoryHistory.length;
    const cacheUtilizationStdDev = Math.sqrt(cacheUtilizationVariance);

    // Adjust thresholds based on average and standard deviation
    // Warning threshold: avg + 1.5 * stdDev
    // Critical threshold: avg + 3 * stdDev
    // Recovery threshold: avg + 1 * stdDev
    this._config.memory.heapUsage.warning = Math.min(0.7, avgHeapUsage + 1.5 * heapUsageStdDev);
    this._config.memory.heapUsage.critical = Math.min(0.85, avgHeapUsage + 3 * heapUsageStdDev);
    this._config.memory.heapUsage.recovery = Math.min(0.6, avgHeapUsage + heapUsageStdDev);

    this._config.memory.cacheUtilization.warning = Math.min(
      0.75,
      avgCacheUtilization + 1.5 * cacheUtilizationStdDev
    );
    this._config.memory.cacheUtilization.critical = Math.min(
      0.9,
      avgCacheUtilization + 3 * cacheUtilizationStdDev
    );
    this._config.memory.cacheUtilization.recovery = Math.min(
      0.65,
      avgCacheUtilization + cacheUtilizationStdDev
    );
  }

  /**
   * Adjust performance thresholds based on historical performance metrics
   * @param performanceHistory Historical performance metrics
   */
  private adjustPerformanceThresholds(performanceHistory: PerformanceMetrics[]): void {
    // Calculate average latency
    const allLatencies = performanceHistory.flatMap((p) => p.latencies);
    if (allLatencies.length === 0) return;

    const avgLatency = allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length;

    // Calculate latency standard deviation
    const latencyVariance =
      allLatencies.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / allLatencies.length;
    const latencyStdDev = Math.sqrt(latencyVariance);

    // Calculate average throughput
    const avgThroughput =
      performanceHistory.reduce((sum, p) => sum + p.throughput, 0) / performanceHistory.length;

    // Calculate throughput standard deviation
    const throughputVariance =
      performanceHistory.reduce((sum, p) => {
        return sum + Math.pow(p.throughput - avgThroughput, 2);
      }, 0) / performanceHistory.length;
    const throughputStdDev = Math.sqrt(throughputVariance);

    // Adjust latency thresholds (higher is worse)
    this._config.performance.latency.warning = avgLatency + 1.5 * latencyStdDev;
    this._config.performance.latency.critical = avgLatency + 3 * latencyStdDev;
    this._config.performance.latency.recovery = avgLatency + latencyStdDev;

    // Adjust throughput thresholds (lower is worse)
    this._config.performance.throughput.warning = Math.max(
      1,
      avgThroughput - 1.5 * throughputStdDev
    );
    this._config.performance.throughput.critical = Math.max(
      1,
      avgThroughput - 3 * throughputStdDev
    );
    this._config.performance.throughput.recovery = Math.max(1, avgThroughput - throughputStdDev);
  }

  /**
   * Adjust error thresholds based on historical error metrics
   * @param errorHistory Historical error metrics
   */
  private adjustErrorThresholds(errorHistory: ErrorMetrics[]): void {
    // Calculate average error rate
    const errorRates = errorHistory.map((e) =>
      e.totalOperations > 0 ? e.errorCount / e.totalOperations : 0
    );

    const avgErrorRate = errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length;

    // Calculate error rate standard deviation
    const errorRateVariance =
      errorRates.reduce((sum, rate) => {
        return sum + Math.pow(rate - avgErrorRate, 2);
      }, 0) / errorRates.length;
    const errorRateStdDev = Math.sqrt(errorRateVariance);

    // Adjust error rate thresholds
    this._config.error.errorRate.warning = Math.min(0.05, avgErrorRate + 1.5 * errorRateStdDev);
    this._config.error.errorRate.critical = Math.min(0.1, avgErrorRate + 3 * errorRateStdDev);
    this._config.error.errorRate.recovery = Math.min(0.03, avgErrorRate + errorRateStdDev);
  }
}

/**
 * Helper class for evaluating metrics against thresholds
 */
class MetricEvaluator {
  private readonly thresholds: ThresholdConfig;

  constructor(thresholds: ThresholdConfig) {
    this.thresholds = thresholds;
  }

  /**
   * Evaluate memory health metrics
   * @param metrics Memory metrics to evaluate
   * @returns Validation result for memory metrics
   */
  public evaluateMemoryHealth(metrics: MemoryMetrics): MetricValidationResult {
    const heapUsageRatio = metrics.heapUsage / metrics.heapLimit;
    const heapResult = this.evaluateThreshold(
      heapUsageRatio,
      this.thresholds.memory.heapUsage,
      'Heap usage'
    );

    const cacheResult = this.evaluateThreshold(
      metrics.cacheUtilization,
      this.thresholds.memory.cacheUtilization,
      'Cache utilization'
    );

    // Combine results with weighted scoring
    const score = heapResult.score * 0.6 + cacheResult.score * 0.4;
    const violations = [...heapResult.violations, ...cacheResult.violations];
    const recommendations = [...heapResult.recommendations, ...cacheResult.recommendations];

    return {
      isValid: score >= 0.8,
      violations,
      recommendations,
      score,
    };
  }

  /**
   * Evaluate performance health metrics
   * @param metrics Performance metrics to evaluate
   * @returns Validation result for performance metrics
   */
  public evaluatePerformanceHealth(metrics: PerformanceMetrics): MetricValidationResult {
    // Calculate latency statistics
    const avgLatency =
      metrics.latencies.length > 0
        ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
        : 0;

    const latencyResult = this.evaluateThreshold(
      avgLatency,
      this.thresholds.performance.latency,
      'Average latency'
    );

    const throughputResult = this.evaluateThreshold(
      metrics.throughput,
      this.thresholds.performance.throughput,
      'Throughput'
    );

    // Detect latency spikes
    const latencyVariance = this.calculateVariance(metrics.latencies, avgLatency);
    const spikeScore = this.evaluateLatencySpikes(metrics.latencies, avgLatency, latencyVariance);

    // Combine results with weighted scoring
    const score = latencyResult.score * 0.4 + throughputResult.score * 0.3 + spikeScore * 0.3;

    const violations = [...latencyResult.violations, ...throughputResult.violations];
    const recommendations = [...latencyResult.recommendations, ...throughputResult.recommendations];

    // Add spike-specific recommendations
    if (spikeScore < 0.8) {
      violations.push('High latency variance detected');
      recommendations.push(
        'Investigate potential resource contention',
        'Monitor system load patterns',
        'Review concurrent operations'
      );
    }

    return {
      isValid: score >= 0.8,
      violations,
      recommendations,
      score,
    };
  }

  /**
   * Evaluate error health metrics
   * @param metrics Error metrics to evaluate
   * @returns Validation result for error metrics
   */
  public evaluateErrorHealth(metrics: ErrorMetrics): MetricValidationResult {
    const errorRate =
      metrics.totalOperations > 0 ? metrics.errorCount / metrics.totalOperations : 0;

    const result = this.evaluateThreshold(errorRate, this.thresholds.error.errorRate, 'Error rate');

    // Add error-specific recommendations
    if (result.score < 0.8) {
      result.recommendations.push(
        'Review error patterns and frequencies',
        'Check error handling mechanisms',
        'Consider implementing circuit breakers'
      );
    }

    return result;
  }

  /**
   * Evaluate a metric value against thresholds
   * @param value Metric value to evaluate
   * @param thresholds Thresholds to evaluate against
   * @param metricName Name of the metric for reporting
   * @returns Validation result for the metric
   */
  private evaluateThreshold(
    value: number,
    thresholds: { warning: number; critical: number; recovery: number },
    metricName: string
  ): MetricValidationResult {
    let score = 1.0;
    const violations: string[] = [];
    const recommendations: string[] = [];

    if (value >= thresholds.critical) {
      score = 0.2;
      violations.push(`${metricName} exceeds critical threshold: ${value.toFixed(2)}`);
      recommendations.push(`Immediate action required: ${metricName} is critically high`);
    } else if (value >= thresholds.warning) {
      score = 0.6;
      violations.push(`${metricName} exceeds warning threshold: ${value.toFixed(2)}`);
      recommendations.push(`Monitor ${metricName}: approaching critical levels`);
    } else if (value > thresholds.recovery * 1.1) {
      score = 0.8;
      recommendations.push(`Continue monitoring ${metricName} for stability`);
    }

    return {
      isValid: score >= 0.8,
      violations,
      recommendations,
      score,
    };
  }

  /**
   * Calculate variance of a set of values
   * @param values Values to calculate variance for
   * @param mean Mean of the values
   * @returns Variance of the values
   */
  private calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Evaluate latency spikes
   * @param latencies Latency values to evaluate
   * @param mean Mean latency
   * @param variance Latency variance
   * @returns Score representing the severity of latency spikes (1.0 = no spikes, 0.0 = severe spikes)
   */
  private evaluateLatencySpikes(latencies: number[], mean: number, variance: number): number {
    if (latencies.length < 3) return 1.0;

    const stdDev = Math.sqrt(variance);
    const spikes = latencies.filter((l) => Math.abs(l - mean) > 2 * stdDev);
    const spikeRatio = spikes.length / latencies.length;

    // Score decreases as spike ratio increases
    return Math.max(0, 1 - spikeRatio * 5);
  }
}
