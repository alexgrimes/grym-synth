import { HealthRecoveryValidator } from '../health/recovery-validator';
import { HealthState, StateHistory, ValidationContext, RecoveryConfig, ThresholdConfig } from '../health/types';
import { BasicHealthMetrics } from '../types';

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  memory: {
    heapUsage: {
      warning: 0.7,
      critical: 0.9,
      recovery: 0.6
    },
    cacheUtilization: {
      warning: 0.8,
      critical: 0.95,
      recovery: 0.7
    }
  },
  performance: {
    latency: {
      warning: 200,
      critical: 500,
      recovery: 150
    },
    throughput: {
      warning: 800,
      critical: 500,
      recovery: 900
    }
  },
  error: {
    errorRate: {
      warning: 0.05,
      critical: 0.1,
      recovery: 0.03
    }
  }
};

describe('HealthRecoveryValidator State Progression', () => {
  let validator: HealthRecoveryValidator;
  let config: RecoveryConfig;
  let history: StateHistory;

  beforeEach(() => {
    config = {
      minHealthySamples: 3,
      validationWindow: 300000, // 5 minutes
      cooldownPeriod: 60000,    // 1 minute
      requiredSuccessRate: 0.8
    };

    validator = new HealthRecoveryValidator(config);
    history = {
      transitions: [],
      samples: [],
      getRecentSamples: jest.fn()
    };
  });

  const createHealthyMetrics = (): BasicHealthMetrics => ({
    responseTime: 100,
    throughput: 1000,
    errorRate: 0.001,
    totalOperations: 10000
  });

  const createDegradedMetrics = (): BasicHealthMetrics => ({
    responseTime: 200,
    throughput: 800,
    errorRate: 0.05,
    totalOperations: 10000
  });

  const createUnhealthyMetrics = (): BasicHealthMetrics => ({
    responseTime: 500,
    throughput: 200,
    errorRate: 0.15,
    totalOperations: 10000
  });

  const createHealthState = (
    status: 'healthy' | 'degraded' | 'unhealthy',
    metrics: BasicHealthMetrics
  ): HealthState => ({
    status,
    indicators: {
      memory: {
        heapUsage: 1000,
        heapLimit: 4000,
        cacheUtilization: 0.5,
        status: 'healthy'
      },
      performance: {
        averageLatency: metrics.responseTime,
        p95Latency: metrics.responseTime * 1.5,
        throughput: metrics.throughput,
        latencyVariance: 10,
        spikeFactor: 1.1,
        recentThroughput: metrics.throughput,
        status: 'healthy'
      },
      errors: {
        errorRate: metrics.errorRate,
        recentErrors: Math.floor(metrics.errorRate * metrics.totalOperations),
        status: 'healthy'
      },
      metrics
    },
    timestamp: Date.now()
  });

  describe('State Transition Validation', () => {
    it('should allow transition from healthy to degraded', () => {
      const currentState = createHealthState('degraded', createDegradedMetrics());
      const samples = [
        createHealthState('healthy', createHealthyMetrics()),
        createHealthState('degraded', createDegradedMetrics())
      ];

      (history.getRecentSamples as jest.Mock).mockReturnValue(samples);

      const context: ValidationContext = {
        currentState,
        history,
        thresholds: DEFAULT_THRESHOLDS,
        recovery: config
      };

      expect(validator.validateRecovery(context)).toBe(true);
    });

    it('should prevent direct transition from healthy to unhealthy', () => {
      const currentState = createHealthState('unhealthy', createUnhealthyMetrics());
      const samples = [
        createHealthState('healthy', createHealthyMetrics()),
        createHealthState('unhealthy', createUnhealthyMetrics())
      ];

      (history.getRecentSamples as jest.Mock).mockReturnValue(samples);

      const context: ValidationContext = {
        currentState,
        history,
        thresholds: DEFAULT_THRESHOLDS,
        recovery: config
      };

      expect(validator.validateRecovery(context)).toBe(false);
    });

    it('should allow transition from degraded to unhealthy', () => {
      const currentState = createHealthState('unhealthy', createUnhealthyMetrics());
      const samples = [
        createHealthState('healthy', createHealthyMetrics()),
        createHealthState('degraded', createDegradedMetrics()),
        createHealthState('unhealthy', createUnhealthyMetrics())
      ];

      (history.getRecentSamples as jest.Mock).mockReturnValue(samples);

      const context: ValidationContext = {
        currentState,
        history,
        thresholds: DEFAULT_THRESHOLDS,
        recovery: config
      };

      expect(validator.validateRecovery(context)).toBe(true);
    });
  });

  describe('Metric Validation', () => {
    it('should validate performance improvement', () => {
      const currentState = createHealthState('degraded', {
        ...createDegradedMetrics(),
        responseTime: 150,  // Improved from 200
        throughput: 900     // Improved from 800
      });

      const samples = [
        createHealthState('degraded', createDegradedMetrics()),
        currentState
      ];

      (history.getRecentSamples as jest.Mock).mockReturnValue(samples);

      const context: ValidationContext = {
        currentState,
        history,
        thresholds: DEFAULT_THRESHOLDS,
        recovery: config
      };

      expect(validator.validateRecovery(context)).toBe(true);
    });

    it('should validate error rate stability', () => {
      const currentState = createHealthState('degraded', {
        ...createDegradedMetrics(),
        errorRate: 0.009    // Below 1% threshold
      });

      const samples = [
        createHealthState('degraded', createDegradedMetrics()),
        currentState
      ];

      (history.getRecentSamples as jest.Mock).mockReturnValue(samples);

      const context: ValidationContext = {
        currentState,
        history,
        thresholds: DEFAULT_THRESHOLDS,
        recovery: config
      };

      expect(validator.validateRecovery(context)).toBe(true);
    });
  });
});