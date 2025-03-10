import { ModelHealthMonitor } from '../model-health-monitor';
import { MetricsCollector } from '../metrics-collector';
import { FeatureMemoryMetrics } from '../types';

describe('ModelHealthMonitor', () => {
  let monitor: ModelHealthMonitor;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    monitor = new ModelHealthMonitor(metricsCollector, undefined, {
      maxActiveModels: 3,
      maxQueueDepth: 5,
      minAvailableMemory: 256 * 1024 * 1024, // 256MB
      handoffTimeoutMs: 2000
    });
  });

  const createMockMetrics = (overrides: Partial<FeatureMemoryMetrics> = {}): FeatureMemoryMetrics => ({
    kind: 'feature' as const,
    timestamp: new Date(),
    durationMs: 100,
    patternRecognitionLatency: 50,
    storageOperationLatency: 30,
    optimizationEffectiveness: 0.95,
    recentLatencies: [20, 25],
    recentLatencyTimestamps: [
      Date.now() - 1000,
      Date.now()
    ],
    resourceUsage: {
      memoryUsage: 100 * 1024 * 1024,
      cpuUsage: 30,
      storageUsage: 1,
      storageLimit: 5
    },
    healthStatus: {
      status: 'healthy',
      lastCheck: new Date(),
      indicators: {
        memory: {
          heapUsage: 100 * 1024 * 1024,
          heapLimit: 512 * 1024 * 1024,
          cacheUtilization: 0.2,
          status: 'healthy'
        },
        performance: {
          averageLatency: 25,
          p95Latency: 30,
          throughput: 100,
          latencyVariance: 2,
          spikeFactor: 1.1,
          recentThroughput: 95,
          status: 'healthy'
        },
        errors: {
          errorRate: 0.01,
          recentErrors: 1,
          status: 'healthy'
        }
      },
      recommendations: [],
      metrics: {
        errorRate: 0.01,
        responseTime: 25,
        throughput: 100,
        totalOperations: 100
      }
    },
    ...overrides
  });

  describe('checkModelHealth', () => {
    it('should report available status when resources are sufficient', async () => {
      const mockMetrics = createMockMetrics();
      jest.spyOn(metricsCollector, 'getMetrics').mockReturnValue(mockMetrics);
      jest.spyOn(metricsCollector, 'getTotalOperations').mockReturnValue(100);
      jest.spyOn(metricsCollector, 'getRecentErrorCount').mockReturnValue(1);

      const health = await monitor.checkModelHealth();

      expect(health.orchestration.status).toBe('available');
      expect(health.canAcceptTasks).toBe(true);
      expect(health.resources.activeModels).toBeLessThan(3);
      expect(health.resources.memoryAvailable).toBeGreaterThan(256 * 1024 * 1024);
      expect(health.orchestration.queueDepth).toBeLessThan(5);
    });

    it('should report degraded status when approaching limits', async () => {
      const mockMetrics = createMockMetrics({
        recentLatencies: [30, 35, 40, 45],
        recentLatencyTimestamps: [
          Date.now() - 1500,
          Date.now() - 1000,
          Date.now() - 500,
          Date.now()
        ],
        resourceUsage: {
          memoryUsage: 350 * 1024 * 1024,
          cpuUsage: 70,
          storageUsage: 2,
          storageLimit: 3
        },
        healthStatus: {
          status: 'degraded',
          lastCheck: new Date(),
          indicators: {
            memory: {
              heapUsage: 350 * 1024 * 1024,
              heapLimit: 512 * 1024 * 1024,
              cacheUtilization: 0.7,
              status: 'degraded'
            },
            performance: {
              averageLatency: 40,
              p95Latency: 45,
              throughput: 80,
              latencyVariance: 5,
              spikeFactor: 1.3,
              recentThroughput: 75,
              status: 'degraded'
            },
            errors: {
              errorRate: 0.02,
              recentErrors: 4,
              status: 'healthy'
            }
          },
          recommendations: [],
          metrics: {
            errorRate: 0.02,
            responseTime: 40,
            throughput: 80,
            totalOperations: 200
          }
        }
      });

      jest.spyOn(metricsCollector, 'getMetrics').mockReturnValue(mockMetrics);
      jest.spyOn(metricsCollector, 'getTotalOperations').mockReturnValue(200);
      jest.spyOn(metricsCollector, 'getRecentErrorCount').mockReturnValue(4);

      const health = await monitor.checkModelHealth();

      expect(health.orchestration.status).toBe('degraded');
      expect(health.canAcceptTasks).toBe(false);
      expect(health.resources.activeModels).toBeGreaterThanOrEqual(2);
      expect(health.orchestration.queueDepth).toBeGreaterThanOrEqual(4);
    });

    it('should report unavailable status when resources exhausted', async () => {
      const mockMetrics = createMockMetrics({
        recentLatencies: [50, 55, 60, 65, 70],
        recentLatencyTimestamps: [
          Date.now() - 1800,
          Date.now() - 1500,
          Date.now() - 1000,
          Date.now() - 500,
          Date.now()
        ],
        resourceUsage: {
          memoryUsage: 450 * 1024 * 1024,
          cpuUsage: 90,
          storageUsage: 3,
          storageLimit: 3
        },
        healthStatus: {
          status: 'unhealthy',
          lastCheck: new Date(),
          indicators: {
            memory: {
              heapUsage: 450 * 1024 * 1024,
              heapLimit: 512 * 1024 * 1024,
              cacheUtilization: 0.9,
              status: 'unhealthy'
            },
            performance: {
              averageLatency: 60,
              p95Latency: 70,
              throughput: 50,
              latencyVariance: 8,
              spikeFactor: 1.8,
              recentThroughput: 45,
              status: 'unhealthy'
            },
            errors: {
              errorRate: 0.05,
              recentErrors: 15,
              status: 'degraded'
            }
          },
          recommendations: [],
          metrics: {
            errorRate: 0.05,
            responseTime: 60,
            throughput: 50,
            totalOperations: 300
          }
        }
      });

      jest.spyOn(metricsCollector, 'getMetrics').mockReturnValue(mockMetrics);
      jest.spyOn(metricsCollector, 'getTotalOperations').mockReturnValue(300);
      jest.spyOn(metricsCollector, 'getRecentErrorCount').mockReturnValue(15);

      const health = await monitor.checkModelHealth();

      expect(health.orchestration.status).toBe('unavailable');
      expect(health.canAcceptTasks).toBe(false);
      expect(health.resources.activeModels).toBeGreaterThanOrEqual(3);
      expect(health.orchestration.queueDepth).toBeGreaterThanOrEqual(5);
      expect(health.resources.memoryAvailable).toBeLessThan(256 * 1024 * 1024);
    });
  });
});