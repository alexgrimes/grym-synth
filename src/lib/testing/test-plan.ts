import { performance } from 'perf_hooks';
import { PerformanceTestSuite } from './performance-suite';
import { MetricsCollector } from './metrics-collector';
import {
  TestPhaseName,
  PhaseConfig,
  TestResults,
  PerformanceMetrics,
  DEFAULT_THRESHOLDS
} from './types';

/**
 * Manages test execution phases and orchestrates the testing process
 */
export class TestPlan {
  private testSuite: PerformanceTestSuite;
  private metricsCollector: MetricsCollector;
  private phases: Map<TestPhaseName, PhaseConfig>;

  constructor() {
    this.testSuite = new PerformanceTestSuite();
    this.metricsCollector = new MetricsCollector();
    this.phases = new Map();
    this.initializePhases();
  }

  /**
   * Run all test phases
   */
  async runAll(): Promise<TestResults[]> {
    const results: TestResults[] = [];

    try {
      // Run baseline phase
      const baselineResults = await this.runBaselinePhase();
      results.push(baselineResults);

      // Only continue if baseline passes
      if (baselineResults.success) {
        // Run cross-model phase
        const crossModelResults = await this.runCrossModelPhase();
        results.push(crossModelResults);

        // Run load phase if previous phases pass
        if (crossModelResults.success) {
          const loadResults = await this.runLoadPhase();
          results.push(loadResults);
        }
      }

      return results;

    } catch (error) {
      console.error('Error running test plan:', error);
      // Use baseline as the fallback phase for errors
      results.push(this.createErrorResult('baseline', error as Error));
      return results;

    } finally {
      this.metricsCollector.stopCollection();
    }
  }

  /**
   * Clean up resources and stop metrics collection
   */
  async cleanup(): Promise<void> {
    try {
      // Stop metrics collection
      this.metricsCollector.stopCollection();

      // Clean up any test-specific resources
      await this.cleanupTestResources();

    } catch (error) {
      console.error('Error during test plan cleanup:', error);
    }
  }

  /**
   * Initialize test phase configurations
   */
  private initializePhases(): void {
    const baselineConfig: PhaseConfig = {
      name: 'baseline',
      duration: 1000, // 1 second for testing
      metrics: ['memoryUsage', 'responseTime', 'contextPreservation'],
      thresholds: DEFAULT_THRESHOLDS
    };

    const crossModelConfig: PhaseConfig = {
      name: 'cross-model',
      duration: 1000, // 1 second for testing
      metrics: ['switchingLatency', 'contextAccuracy', 'memoryGrowth'],
      thresholds: DEFAULT_THRESHOLDS
    };

    const loadConfig: PhaseConfig = {
      name: 'load',
      duration: 1000, // 1 second for testing
      metrics: ['concurrentRequests', 'systemStability', 'errorRate'],
      thresholds: DEFAULT_THRESHOLDS
    };

    this.phases.clear();
    this.phases.set('baseline', baselineConfig);
    this.phases.set('cross-model', crossModelConfig);
    this.phases.set('load', loadConfig);
  }

  /**
   * Run baseline performance phase
   */
  private async runBaselinePhase(): Promise<TestResults> {
    const phase = this.phases.get('baseline')!;
    const startTime = performance.now();

    try {
      const metrics = await this.testSuite.runBaseline();
      const success = this.validateBaselineMetrics(metrics, phase.thresholds);

      return {
        timestamp: new Date().toISOString(),
        phaseName: 'baseline',
        metrics,
        success,
        duration: performance.now() - startTime
      };

    } catch (error) {
      return this.createErrorResult('baseline', error as Error);
    }
  }

  /**
   * Run cross-model interaction phase
   */
  private async runCrossModelPhase(): Promise<TestResults> {
    const phase = this.phases.get('cross-model')!;
    const startTime = performance.now();

    try {
      const results = await this.testSuite.testCrossModelInteractions();
      const success = this.validateCrossModelMetrics(results, phase.thresholds);

      return {
        timestamp: new Date().toISOString(),
        phaseName: 'cross-model',
        metrics: this.convertCrossModelMetrics(results),
        success,
        duration: performance.now() - startTime
      };

    } catch (error) {
      return this.createErrorResult('cross-model', error as Error);
    }
  }

  /**
   * Run load testing phase
   */
  private async runLoadPhase(): Promise<TestResults> {
    const phase = this.phases.get('load')!;
    const startTime = performance.now();

    try {
      // Start metrics collection for load test
      this.metricsCollector.startCollection();

      // Run load test scenarios
      const metrics = await this.simulateLoad(phase.duration);
      const success = this.validateLoadMetrics(metrics, phase.thresholds);

      return {
        timestamp: new Date().toISOString(),
        phaseName: 'load',
        metrics,
        success,
        duration: performance.now() - startTime
      };

    } catch (error) {
      return this.createErrorResult('load', error as Error);
    } finally {
      this.metricsCollector.stopCollection();
    }
  }

  /**
   * Clean up test-specific resources
   */
  private async cleanupTestResources(): Promise<void> {
    // Clean up any temporary files or resources created during testing
    // This is a placeholder for actual cleanup logic
  }

  /**
   * Convert cross-model results to standard metrics format
   */
  private convertCrossModelMetrics(results: any): PerformanceMetrics {
    return {
      memoryUsage: {
        baseline: 0,
        peak: 0,
        afterRelease: 0
      },
      contextStats: {
        loadTime: 0,
        transitionTime: results.switchingLatency?.averageSwitchTime || 0,
        compressionRatio: results.contextPreservation?.preservationRate || 0
      },
      modelMetrics: {
        inferenceTime: results.inferenceTime || 0,
        responseLatency: results.responseLatency || 0,
        contextSwitchTime: results.contextSwitchTime || 0
      }
    };
  }

  /**
   * Simulate load testing
   */
  private async simulateLoad(duration: number): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    const endTime = startTime + duration;

    while (performance.now() < endTime) {
      await this.simulateLoadIteration();
    }

    return await this.metricsCollector.collectMetrics(5000); // 5 second sample
  }

  /**
   * Simulate a single load test iteration
   */
  private async simulateLoadIteration(): Promise<void> {
    const iterationTime = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, iterationTime));
  }

  /**
   * Validate baseline metrics against thresholds
   */
  private validateBaselineMetrics(
    metrics: PerformanceMetrics,
    thresholds: Record<string, number>
  ): boolean {
    return (
      metrics.memoryUsage.peak <= thresholds.maxMemoryUsage &&
      metrics.modelMetrics.responseLatency <= thresholds.avgResponseTime &&
      metrics.contextStats.compressionRatio >= thresholds.contextPreservation
    );
  }

  /**
   * Validate cross-model metrics against thresholds
   */
  private validateCrossModelMetrics(
    results: any,
    thresholds: Record<string, number>
  ): boolean {
    return (
      results.switchingLatency?.maxSwitchTime <= thresholds.modelSwitchTime &&
      results.contextPreservation?.preservationRate >= thresholds.contextAccuracy &&
      (results.memoryProfile?.peak - results.memoryProfile?.samples[0]) <= thresholds.memoryGrowth
    );
  }

  /**
   * Validate load test metrics against thresholds
   */
  private validateLoadMetrics(
    metrics: PerformanceMetrics,
    thresholds: Record<string, number>
  ): boolean {
    // For load testing, we use memory metrics as a proxy for system stability
    const memoryStability = metrics.memoryUsage.peak / metrics.memoryUsage.baseline;
    return memoryStability <= 1.5; // Allow up to 50% memory growth under load
  }

  /**
   * Create error result for failed phase
   */
  private createErrorResult(phaseName: TestPhaseName, error: Error): TestResults {
    return {
      timestamp: new Date().toISOString(),
      phaseName,
      metrics: {
        memoryUsage: { baseline: 0, peak: 0, afterRelease: 0 },
        contextStats: { loadTime: 0, transitionTime: 0, compressionRatio: 0 },
        modelMetrics: { inferenceTime: 0, responseLatency: 0, contextSwitchTime: 0 }
      },
      success: false,
      error: error.message,
      duration: 0
    };
  }
}