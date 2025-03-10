import { HealthMonitor } from '../health-monitor';
import { MetricsCollector } from '../metrics-collector';

describe('Health Monitor Stability', () => {
  let metrics: MetricsCollector;
  let healthMonitor: HealthMonitor;

  // Helper functions
  async function simulateLoad(count: number, latency: number) {
    const promises = Array(count).fill(null).map(() =>
      metrics.recordLatency('operation', latency)
    );
    await Promise.all(promises);
  }

  async function waitForStateTransition(duration = 2000) {
    await new Promise(resolve => setTimeout(resolve, duration));
    healthMonitor.checkHealth(); // Force a health check
    await new Promise(resolve => setTimeout(resolve, 500)); // Allow for state update
  }

  beforeEach(() => {
    metrics = new MetricsCollector();
    healthMonitor = new HealthMonitor(metrics, {
      performanceThresholds: {
        latencyWarning: 30,     // More sensitive warning threshold
        latencyCritical: 45,    // Lower critical threshold
        latencyRecovery: 25,    // Stricter recovery requirement
        throughputWarning: 55,   // Higher throughput requirement
        throughputCritical: 30,
        throughputRecovery: 60   // Better performance for recovery
      },
      stabilization: {
        minStateDuration: 7000,    // Longer minimum duration
        confirmationSamples: 5,    // More samples needed
        cooldownPeriod: 1500,      // Longer cooldown
        maxTransitionsPerMinute: 8  // Fewer transitions allowed
      }
    });

    // Wait for initial stabilization
    waitForStateTransition(100);
  });

  it('should maintain stable health status under normal load', async () => {
    // System should start healthy
    expect(healthMonitor.checkHealth().status).toBe('healthy');

    // Simulate moderate load
    await simulateLoad(100, 20); // Well within limits
    await waitForStateTransition();
    
    // Should stay healthy
    expect(healthMonitor.checkHealth().status).toBe('healthy');
  }, 15000);

  it('should transition to degraded with clear threshold violation', async () => {
    // Simulate high load
    await simulateLoad(100, 35); // Above warning threshold
    await waitForStateTransition();

    // Should transition to degraded
    expect(healthMonitor.checkHealth().status).toBe('degraded');
    
    // Should not oscillate back immediately
    await simulateLoad(10, 15); // Few good samples
    await waitForStateTransition();
    expect(healthMonitor.checkHealth().status).toBe('degraded'); // Should still be degraded
  }, 15000);

  it('should recover after sustained improvement', async () => {
    // Start with high load
    await simulateLoad(100, 35);
    await waitForStateTransition();
    expect(healthMonitor.checkHealth().status).toBe('degraded');

    // Simulate sustained recovery
    await simulateLoad(100, 15);
    await waitForStateTransition(8000); // Wait longer than minStateDuration
    
    // Should recover
    expect(healthMonitor.checkHealth().status).toBe('healthy');
  }, 20000);

  it('should require sufficient confirmation samples for state change', async () => {
    // Record alternating good and bad samples
    for (let i = 0; i < 10; i++) {
      await simulateLoad(10, i % 2 === 0 ? 35 : 15);
      await waitForStateTransition(500);
    }

    // Should not have changed state due to inconsistent samples
    expect(healthMonitor.getStatusHistory().length).toBeLessThan(2);
  }, 20000);

  it('should handle rapid state check attempts', async () => {
    // Attempt rapid health checks
    const results: Array<'healthy' | 'degraded' | 'unhealthy'> = [];
    for (let i = 0; i < 20; i++) {
      await simulateLoad(5, 35);
      results.push(healthMonitor.checkHealth().status);
      await waitForStateTransition(100);
    }

    // Should not have more transitions than maxTransitionsPerMinute
    const transitions = results.filter((status, i) =>
      i > 0 && status !== results[i - 1]
    ).length;

    expect(transitions).toBeLessThanOrEqual(8); // matches new maxTransitionsPerMinute
  }, 25000);

  it('should maintain state under mixed load patterns', async () => {
    // Simulate mixed load pattern
    const loads = [
      { latency: 15, count: 20 }, // Good
      { latency: 35, count: 10 }, // Bad
      { latency: 15, count: 5 },  // Good
      { latency: 35, count: 5 },  // Bad
      { latency: 15, count: 20 }  // Good
    ];

    for (const load of loads) {
      await simulateLoad(load.count, load.latency);
      await waitForStateTransition();
      healthMonitor.checkHealth();
    }

    // Should have very few transitions despite mixed load
    const transitions = healthMonitor.getStatusHistory();
    expect(transitions.length).toBeLessThan(4);
  }, 30000);

  it('should enforce state progression through degraded state', async () => {
    // Start with healthy state
    expect(healthMonitor.checkHealth().status).toBe('healthy');

    // Simulate severe performance issues
    await simulateLoad(100, 50); // Well above critical threshold
    await waitForStateTransition();
    
    // Should go to degraded first, not unhealthy
    expect(healthMonitor.checkHealth().status).toBe('degraded');

    // Continue severe load
    await simulateLoad(100, 50);
    await waitForStateTransition();
    
    // Now can transition to unhealthy
    expect(healthMonitor.checkHealth().status).toBe('unhealthy');

    // Simulate recovery
    await simulateLoad(100, 15); // Good performance
    await waitForStateTransition(8000);
    
    // Should go to degraded first, not healthy
    expect(healthMonitor.checkHealth().status).toBe('degraded');

    // Continue good performance
    await simulateLoad(100, 15);
    await waitForStateTransition(8000);
    
    // Finally can go back to healthy
    expect(healthMonitor.checkHealth().status).toBe('healthy');
  }, 40000);

  // Cleanup
  afterEach(() => {
    jest.useRealTimers();
  });
});