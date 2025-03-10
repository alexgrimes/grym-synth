import {
  RecoveryValidator,
  ValidationRule,
  ValidationContext,
  HealthState,
  RecoveryConfig,
  StateHistory
} from './types';

import {
  BasicHealthMetrics,
  HealthStatusType
} from '../types';

export class HealthRecoveryValidator implements RecoveryValidator {
  private readonly validationRules: ValidationRule[] = [];
  private readonly config: RecoveryConfig;

  constructor(config: RecoveryConfig) {
    this.config = config;
    this.initializeDefaultRules();
  }

  public validateRecovery(context: ValidationContext): boolean {
    const { currentState, history } = context;
    const targetState = currentState.status;

    // Get previous state from recent samples
    const recentSamples = history.getRecentSamples(2);
    const previousState = recentSamples.length > 1 ? 
      recentSamples[recentSamples.length - 2].status :
      'healthy';

    console.log('Validating transition:', {
      previousState,
      targetState,
      metrics: currentState.indicators.metrics,
      recentStates: recentSamples.map(s => s.status)
    });

    // Block invalid direct transitions
    if (previousState === 'healthy' && targetState === 'unhealthy') {
      console.log('Blocking direct healthy->unhealthy transition');
      return false;
    }

    // Handle degraded -> unhealthy transition
    if (previousState === 'degraded' && targetState === 'unhealthy') {
      console.log('Evaluating unhealthy progression from degraded state');
      const result = this.validateUnhealthyProgression(context);
      console.log(`Unhealthy progression validation: ${result}`);
      return result;
    }

    // Handle other state transitions
    switch (targetState) {
      case 'degraded':
        return this.validateDegradation(context);
        
      case 'healthy':
        if (previousState === 'unhealthy') {
          console.log('Must recover through degraded state first');
          return false;
        }
        return this.validateRecoveryToHealthy(context);

      default:
        console.log(`Invalid target state: ${targetState}`);
        return false;
    }
  }

  private validateDegradation(context: ValidationContext): boolean {
    const { currentState } = context;
    if (!currentState.indicators.metrics) return false;

    const metrics = currentState.indicators.metrics;
    const thresholds = context.thresholds.performance;
    
    // Check performance against warning thresholds
    const hasLatencyIssues = metrics.responseTime >= thresholds.latency.warning;
    const hasThroughputIssues = metrics.throughput <= thresholds.throughput.warning;
    const hasErrorRateIssues = metrics.errorRate >= context.thresholds.error.errorRate.warning;

    console.log(`Degradation validation:
      Response time: ${metrics.responseTime}ms >= ${thresholds.latency.warning} = ${hasLatencyIssues}
      Throughput: ${metrics.throughput} <= ${thresholds.throughput.warning} = ${hasThroughputIssues}
      Error rate: ${metrics.errorRate} >= ${context.thresholds.error.errorRate.warning} = ${hasErrorRateIssues}`);

    return hasLatencyIssues || hasThroughputIssues || hasErrorRateIssues;
  }

  private validateRecoveryToHealthy(context: ValidationContext): boolean {
    const { currentState, history } = context;
    if (!currentState.indicators.metrics) return false;

    const metrics = currentState.indicators.metrics;
    const thresholds = context.thresholds;
    
    // Get previous metrics with fallback
    const recentSamples = history.getRecentSamples(1);
    const previousMetrics = recentSamples.length > 0 ? 
      recentSamples[0].indicators.metrics : null;

    // Compare with historical metrics if available
    const performanceImproved = previousMetrics ? (
      metrics.responseTime < previousMetrics.responseTime &&
      metrics.throughput > previousMetrics.throughput
    ) : false;

    const errorRateStable = previousMetrics ? 
      metrics.errorRate <= previousMetrics.errorRate : false;

    // Check against recovery thresholds
    const meetsRecoveryThresholds = 
      metrics.responseTime <= thresholds.performance.latency.recovery &&
      metrics.throughput >= thresholds.performance.throughput.recovery &&
      metrics.errorRate <= thresholds.error.errorRate.recovery;

    console.log(`Recovery validation:
      Performance improved: ${performanceImproved}
      Error rate stable: ${errorRateStable}
      Meets recovery thresholds: ${meetsRecoveryThresholds}
      Response time: ${metrics.responseTime}ms (<= ${thresholds.performance.latency.recovery})
      Throughput: ${metrics.throughput} (>= ${thresholds.performance.throughput.recovery})
      Error rate: ${metrics.errorRate} (<= ${thresholds.error.errorRate.recovery})`);

    return meetsRecoveryThresholds && (performanceImproved || errorRateStable);
  }

  private validateUnhealthyProgression(context: ValidationContext): boolean {
    const { currentState } = context;
    if (!currentState.indicators.metrics) return false;

    const metrics = currentState.indicators.metrics;
    const thresholds = context.thresholds;
    
    // Check critical thresholds
    const criticalLatency = metrics.responseTime >= thresholds.performance.latency.critical;
    const criticalThroughput = metrics.throughput <= thresholds.performance.throughput.critical;
    const criticalErrorRate = metrics.errorRate >= thresholds.error.errorRate.critical;

    console.log(`Unhealthy validation:
      Response time: ${metrics.responseTime}ms >= ${thresholds.performance.latency.critical} = ${criticalLatency}
      Throughput: ${metrics.throughput} <= ${thresholds.performance.throughput.critical} = ${criticalThroughput}
      Error rate: ${metrics.errorRate} >= ${thresholds.error.errorRate.critical} = ${criticalErrorRate}`);

    // Any critical threshold exceeded is enough for unhealthy
    return criticalLatency || criticalThroughput || criticalErrorRate;
  }

  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  public getRequiredSamples(): number {
    return this.config.minHealthySamples;
  }

  public getValidationWindow(): number {
    return this.config.validationWindow;
  }

  private initializeDefaultRules(): void {
    this.addValidationRule({
      validate: (metrics: BasicHealthMetrics) => {
        return metrics.responseTime < 200 &&
               metrics.throughput > 800;
      },
      description: 'Performance metrics within thresholds'
    });

    this.addValidationRule({
      validate: (metrics: BasicHealthMetrics) => {
        return metrics.errorRate < 0.05;
      },
      description: 'Error rate within threshold'
    });
  }
}
