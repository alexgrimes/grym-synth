import { AdvancedHealthMonitor } from '../advanced-health-monitor';
import { MetricsCollector } from '../metrics-collector';
import { FeatureMemoryMetrics, HealthConfig } from '../types';
import { Pattern } from '../types/prediction';

describe('AdvancedHealthMonitor', () => {
  let monitor: AdvancedHealthMonitor;
  let metricsCollector: MetricsCollector;

  // Mock metrics data for testing
  const mockMetrics: FeatureMemoryMetrics[] = [
    {
      kind: 'feature',
      timestamp: new Date('2025-02-20T10:00:00'),
      durationMs: 100,
      patternRecognitionLatency: 50,
      storageOperationLatency: 30,
      optimizationEffectiveness: 0.95,
      recentLatencies: [20, 25, 30, 22, 28],
      recentLatencyTimestamps: [
        Date.now() - 4000,
        Date.now() - 3000,
        Date.now() - 2000,
        Date.now() - 1000,
        Date.now()
      ],
      resourceUsage: {
        memoryUsage: 500,
        cpuUsage: 60,
        storageUsage: 800,
        storageLimit: 1000
      },
      healthStatus: {
        status: 'healthy',
        lastCheck: new Date(),
        indicators: {
          memory: {
            heapUsage: 500,
            heapLimit: 1000,
            cacheUtilization: 0.5,
            status: 'healthy'
          },
          performance: {
            averageLatency: 25,
            p95Latency: 30,
            throughput: 100,
            latencyVariance: 3,
            spikeFactor: 1.2,
            recentThroughput: 95,
            status: 'healthy'
          },
          errors: {
            errorRate: 0.01,
            recentErrors: 2,
            status: 'healthy'
          }
        },
        recommendations: [],
        metrics: {
          errorRate: 0.01,
          responseTime: 25,
          throughput: 100,
          totalOperations: 1000
        }
      }
    }
  ];

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    monitor = new AdvancedHealthMonitor(metricsCollector);

    // Mock the getMetricsHistory method
    jest.spyOn(monitor as any, 'getMetricsHistory').mockReturnValue(mockMetrics);
  });

  describe('Pattern Detection', () => {
    it('should detect cyclic patterns in metrics', async () => {
      const healthStatus = monitor.checkHealth();
      const enhancedMetrics = healthStatus.metrics as any;

      expect(enhancedMetrics.prediction).toBeDefined();
      expect(enhancedMetrics.prediction.performance).toBeDefined();
      expect(enhancedMetrics.prediction.resource).toBeDefined();
    });

    it('should detect upward trends in resource usage', async () => {
      // Mock increasing resource usage
      const trendMetrics = [...mockMetrics];
      for (let i = 0; i < 5; i++) {
        trendMetrics.push({
          ...mockMetrics[0],
          timestamp: new Date(Date.now() - (5 - i) * 60000),
          resourceUsage: {
            ...mockMetrics[0].resourceUsage,
            memoryUsage: mockMetrics[0].resourceUsage.memoryUsage * (1 + i * 0.1)
          }
        });
      }

      jest.spyOn(monitor as any, 'getMetricsHistory').mockReturnValue(trendMetrics);
      
      const healthStatus = monitor.checkHealth();
      const predictions = (healthStatus.metrics as any).prediction;

      expect(predictions.resource.memoryUsage).toBeGreaterThan(mockMetrics[0].resourceUsage.memoryUsage);
      expect(healthStatus.recommendations).toContain('Resource usage showing upward trend - consider scaling resources');
    });

    it('should detect performance spikes', async () => {
      // Mock performance spikes
      const spikeMetrics = [...mockMetrics];
      spikeMetrics.push({
        ...mockMetrics[0],
        resourceUsage: {
          ...mockMetrics[0].resourceUsage,
          cpuUsage: 90
        },
        healthStatus: {
          ...mockMetrics[0].healthStatus,
          indicators: {
            ...mockMetrics[0].healthStatus.indicators,
            performance: {
              ...mockMetrics[0].healthStatus.indicators.performance,
              averageLatency: 100,
              p95Latency: 150
            }
          }
        }
      });

      jest.spyOn(monitor as any, 'getMetricsHistory').mockReturnValue(spikeMetrics);
      
      const healthStatus = monitor.checkHealth();
      const predictions = (healthStatus.metrics as any).prediction;

      expect(predictions.performance.probabilityOfDegradation).toBeGreaterThan(0.5);
      expect(healthStatus.recommendations).toContain('Frequent resource spikes detected - investigate cause');
    });
  });

  describe('Resource Prediction', () => {
    it('should forecast resource needs', async () => {
      const healthStatus = monitor.checkHealth();
      const predictions = (healthStatus.metrics as any).prediction.resource;

      expect(predictions.memoryUsage).toBeDefined();
      expect(predictions.cpuUtilization).toBeDefined();
      expect(predictions.timeToExhaustion).toBeDefined();
    });

    it('should provide accurate time to threshold estimates', async () => {
      const healthStatus = monitor.checkHealth();
      const predictions = (healthStatus.metrics as any).prediction;

      expect(predictions.performance.timeToThreshold).toBeGreaterThanOrEqual(0);
      expect(predictions.resource.timeToExhaustion).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate predictive recommendations', () => {
      const healthStatus = monitor.checkHealth();
      
      expect(healthStatus.recommendations).toBeInstanceOf(Array);
      expect(healthStatus.recommendations.length).toBeGreaterThan(0);
    });

    it('should include performance-based recommendations', async () => {
      // Mock performance degradation
      const degradedMetrics = [...mockMetrics];
      degradedMetrics[0].healthStatus.indicators.performance.status = 'degraded';

      jest.spyOn(monitor as any, 'getMetricsHistory').mockReturnValue(degradedMetrics);
      
      const healthStatus = monitor.checkHealth();
      const hasPerformanceRecs = healthStatus.recommendations.some(
        rec => rec.toLowerCase().includes('performance') || rec.toLowerCase().includes('latency')
      );

      expect(hasPerformanceRecs).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should enhance base health status with predictions', () => {
      const healthStatus = monitor.checkHealth();

      expect(healthStatus.metrics).toHaveProperty('prediction');
      expect(healthStatus.recommendations.length).toBeGreaterThan(0);
    });

    it('should maintain base health monitoring capabilities', () => {
      const healthStatus = monitor.checkHealth();

      expect(healthStatus.status).toBeDefined();
      expect(healthStatus.indicators).toBeDefined();
      expect(healthStatus.metrics).toBeDefined();
    });
  });
});