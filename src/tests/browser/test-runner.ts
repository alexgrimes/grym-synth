import { testScenarios } from './test-scenarios';
import { TestReport, TestEnvironment, ValidationMetrics, TestResult, ValidationResult } from './types';

class BrowserTestRunner {
  private environment: TestEnvironment;
  
  constructor() {
    this.environment = this.detectEnvironment();
  }

  private detectEnvironment(): TestEnvironment {
    return {
      network: {
        latency: 0,
        bandwidth: Infinity,
        packetLoss: 0
      },
      device: {
        userAgent: navigator.userAgent,
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency
      },
      audio: {
        sampleRate: 44100,
        channels: 2,
        duration: 5,
        format: 'wav'
      }
    };
  }

  async runTests(): Promise<TestReport> {
    const startTime = performance.now();
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    console.log('Starting browser validation tests...');

    // Run all test scenarios
    for (const [name, scenario] of Object.entries(testScenarios)) {
      try {
        console.log(`Running scenario: ${name}`);
        const scenarioResult: ValidationResult = await scenario().run();
        const testResult: TestResult = this.createTestResult(name, scenarioResult, startTime);
        results.push(testResult);

        if (testResult.passed) passed++;
        else failed++;

      } catch (error) {
        console.error(`Error in scenario ${name}:`, error);
        failed++;
        results.push({
          name,
          passed: false,
          duration: performance.now() - startTime,
          metrics: this.createEmptyMetrics(),
          error: error instanceof Error ? error : new Error('Unknown error')
        });
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Aggregate metrics
    const metrics = this.aggregateMetrics(results);

    return {
      suiteName: 'Browser Audio Learning Tests',
      environment: this.environment,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        skipped,
        duration
      },
      metrics,
      timestamp: new Date()
    };
  }

  private createTestResult(name: string, result: ValidationResult, startTime: number): TestResult {
    return {
      name,
      passed: result.passed,
      duration: performance.now() - startTime,
      metrics: this.transformMetrics(result.metrics || {})
    };
  }

  private transformMetrics(scenarioMetrics: Record<string, unknown>): ValidationMetrics {
    // Create base metrics structure
    const metrics = this.createEmptyMetrics();

    // Map scenario metrics to our standard format
    if (typeof scenarioMetrics.memory === 'object' && scenarioMetrics.memory) {
      const memory = scenarioMetrics.memory as Record<string, number>;
      metrics.memory.heapUsed = memory.heapUsed || 0;
      metrics.memory.heapTotal = memory.heapTotal || 0;
      metrics.memory.external = memory.external || 0;
    }

    if (typeof scenarioMetrics.timing === 'object' && scenarioMetrics.timing) {
      const timing = scenarioMetrics.timing as Record<string, number>;
      metrics.timing.processing = timing.processing || 0;
      metrics.timing.learning = timing.learning || 0;
      metrics.timing.total = timing.total || 0;
    }

    if (typeof scenarioMetrics.audio === 'object' && scenarioMetrics.audio) {
      const audio = scenarioMetrics.audio as Record<string, number>;
      metrics.audio.buffersProcessed = audio.buffersProcessed || 0;
      metrics.audio.totalDuration = audio.totalDuration || 0;
      metrics.audio.averageLatency = audio.averageLatency || 0;
    }

    if (typeof scenarioMetrics.performance === 'object' && scenarioMetrics.performance) {
      const perf = scenarioMetrics.performance as Record<string, number>;
      metrics.performance.fps = perf.fps || 0;
      metrics.performance.dropped = perf.dropped || 0;
    }

    return metrics;
  }

  private createEmptyMetrics(): ValidationMetrics {
    return {
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      },
      timing: {
        processing: 0,
        learning: 0,
        total: 0
      },
      audio: {
        buffersProcessed: 0,
        totalDuration: 0,
        averageLatency: 0
      },
      performance: {
        fps: 0,
        dropped: 0
      }
    };
  }

  private aggregateMetrics(results: TestResult[]): ValidationMetrics {
    const metrics = this.createEmptyMetrics();
    let validResults = 0;

    results.forEach(result => {
      validResults++;
      
      // Aggregate memory metrics
      metrics.memory.heapUsed += result.metrics.memory.heapUsed;
      metrics.memory.heapTotal += result.metrics.memory.heapTotal;
      metrics.memory.external += result.metrics.memory.external;

      // Aggregate timing metrics
      metrics.timing.processing += result.metrics.timing.processing;
      metrics.timing.learning += result.metrics.timing.learning;
      metrics.timing.total += result.metrics.timing.total;

      // Aggregate audio metrics
      metrics.audio.buffersProcessed += result.metrics.audio.buffersProcessed;
      metrics.audio.totalDuration += result.metrics.audio.totalDuration;
      metrics.audio.averageLatency = 
        (metrics.audio.averageLatency * (validResults - 1) + 
         result.metrics.audio.averageLatency) / validResults;

      // Aggregate performance metrics
      metrics.performance.fps = 
        (metrics.performance.fps * (validResults - 1) + 
         result.metrics.performance.fps) / validResults;
      metrics.performance.dropped += result.metrics.performance.dropped;
    });

    // Average out the cumulative metrics
    if (validResults > 0) {
      metrics.memory.heapUsed /= validResults;
      metrics.memory.heapTotal /= validResults;
      metrics.memory.external /= validResults;
      metrics.timing.processing /= validResults;
      metrics.timing.learning /= validResults;
      metrics.timing.total /= validResults;
    }

    return metrics;
  }
}

// Export singleton instance
export const testRunner = new BrowserTestRunner();

// Add to window for external access
declare global {
  interface Window {
    testRunner: BrowserTestRunner;
  }
}
window.testRunner = testRunner;