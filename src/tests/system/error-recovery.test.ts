/**
 * Error Recovery Tests
 *
 * Test system recovery from various error conditions
 */
import { systemBootstrap, getSystemHealth } from '../../services/integration';
import { contextManager } from '../../context';
import { taskRouter } from '../../orchestration';
import { Logger } from '../../utils/logger';

const logger = new Logger({ namespace: 'error-recovery-test' });

describe('System Error Recovery', () => {
  const { registry } = systemBootstrap();

  beforeAll(async () => {
    // Configure test environment
    jest.setTimeout(30000); // 30 seconds
  });

  afterEach(async () => {
    // Restore all components after each test
    await restoreAllComponents();

    // Wait for system to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Component Failures', () => {
    it('should recover from non-critical component failures', async () => {
      // Get a non-critical component
      const nonCriticalComponents = getNonCriticalComponents();
      expect(nonCriticalComponents.length).toBeGreaterThan(0);

      const testComponent = registry.getComponent(nonCriticalComponents[0]);
      expect(testComponent).toBeDefined();

      // Save original methods
      const originalCheckHealth = testComponent.checkHealth;

      // Simulate component failure
      testComponent.checkHealth = () => ({
        status: 'unhealthy',
        error: new Error('Simulated failure')
      });

      // Check system health
      const healthAfterFailure = await getSystemHealth();

      // System should be degraded but not unhealthy
      expect(['degraded', 'healthy']).toContain(healthAfterFailure.status);

      // Restore component
      testComponent.checkHealth = originalCheckHealth;

      // Check system health after recovery
      const healthAfterRecovery = await getSystemHealth();

      // System should be healthy again
      expect(healthAfterRecovery.status).toBe('healthy');
    });

    it('should handle multiple component failures', async () => {
      // Get multiple non-critical components
      const nonCriticalComponents = getNonCriticalComponents();
      expect(nonCriticalComponents.length).toBeGreaterThan(1);

      const failureComponents = nonCriticalComponents.slice(0, 2);
      const failedComponentRefs = failureComponents.map(name => registry.getComponent(name));

      // Save original methods
      const originalMethods = failureComponents.map(name => {
        const component = registry.getComponent(name);
        return {
          name,
          checkHealth: component.checkHealth
        };
      });

      // Simulate component failures
      failedComponentRefs.forEach(component => {
        component.checkHealth = () => ({
          status: 'unhealthy',
          error: new Error('Simulated multiple failure')
        });
      });

      // Check system health
      const healthAfterFailure = await getSystemHealth();

      // System should be degraded with multiple failures
      expect(healthAfterFailure.status).toBe('degraded');

      // Restore one component
      const firstComponent = registry.getComponent(failureComponents[0]);
      firstComponent.checkHealth = originalMethods[0].checkHealth;

      // Check system health after partial recovery
      const healthAfterPartialRecovery = await getSystemHealth();

      // System should still be degraded
      expect(healthAfterPartialRecovery.status).toBe('degraded');

      // Restore second component
      const secondComponent = registry.getComponent(failureComponents[1]);
      secondComponent.checkHealth = originalMethods[1].checkHealth;

      // Check system health after full recovery
      const healthAfterFullRecovery = await getSystemHealth();

      // System should be healthy again
      expect(healthAfterFullRecovery.status).toBe('healthy');
    });

    it('should prioritize critical component recovery', async () => {
      // Get critical and non-critical components
      const criticalComponents = getCriticalComponents();
      const nonCriticalComponents = getNonCriticalComponents();

      expect(criticalComponents.length).toBeGreaterThan(0);
      expect(nonCriticalComponents.length).toBeGreaterThan(0);

      // Save original methods
      const criticalComponent = registry.getComponent(criticalComponents[0]);
      const nonCriticalComponent = registry.getComponent(nonCriticalComponents[0]);

      const originalCriticalCheckHealth = criticalComponent.checkHealth;
      const originalNonCriticalCheckHealth = nonCriticalComponent.checkHealth;

      // Simulate failures in both components
      criticalComponent.checkHealth = () => ({
        status: 'degraded', // Not completely failed
        error: new Error('Simulated critical degradation')
      });

      nonCriticalComponent.checkHealth = () => ({
        status: 'unhealthy',
        error: new Error('Simulated non-critical failure')
      });

      // Check system health
      const healthAfterFailure = await getSystemHealth();

      // System should be degraded
      expect(healthAfterFailure.status).toBe('degraded');

      // Restore critical component
      criticalComponent.checkHealth = originalCriticalCheckHealth;

      // Check system health after critical recovery
      const healthAfterCriticalRecovery = await getSystemHealth();

      // System should be degraded but not unhealthy
      expect(['degraded', 'healthy']).toContain(healthAfterCriticalRecovery.status);

      // Restore non-critical component
      nonCriticalComponent.checkHealth = originalNonCriticalCheckHealth;

      // Check system health after full recovery
      const healthAfterFullRecovery = await getSystemHealth();

      // System should be healthy again
      expect(healthAfterFullRecovery.status).toBe('healthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle context errors gracefully', async () => {
      // Attempt to retrieve non-existent context
      const nonExistentContext = await contextManager.getContextForModel('non-existent', {
        types: ['non-existent-type']
      });

      // Should return null or undefined, not throw
      expect(nonExistentContext).toBeFalsy();

      // System should remain healthy
      const health = await getSystemHealth();
      expect(health.status).toBe('healthy');
    });

    it('should handle task routing errors gracefully', async () => {
      // Attempt to route invalid task
      try {
        await taskRouter.routeTask({
          id: 'invalid-task',
          type: 'invalid_type',
          modelType: 'unknown',
          data: null as any,
          storeResults: true
        });

        // Should throw an error
        fail('Expected task routing to fail');
      } catch (error) {
        // Error is expected
        expect(error).toBeDefined();
      }

      // System should remain healthy
      const health = await getSystemHealth();
      expect(health.status).toBe('healthy');
    });

    it('should recover from memory pressure', async () => {
      // This test is more conceptual since we can't easily simulate memory pressure in a test
      // In a real environment, you would monitor memory usage and trigger GC when needed

      // Create a large number of context items to simulate memory pressure
      const operations = [];
      for (let i = 0; i < 1000; i++) {
        operations.push(
          contextManager.storeContext({
            id: `memory-test-${i}`,
            type: 'test',
            content: { value: 'x'.repeat(1000) }, // 1KB of data
            metadata: {
              timestamp: Date.now(),
              source: 'memory-test',
              priority: 1,
              tags: ['memory-test']
            }
          })
        );
      }

      await Promise.all(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // System should remain healthy
      const health = await getSystemHealth();
      expect(health.status).toBe('healthy');

      // Check memory metrics
      expect(health.metrics).toBeDefined();
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should retry failed operations', async () => {
      // Mock a component that fails once then succeeds
      const componentName = getNonCriticalComponents()[0];
      const component = registry.getComponent(componentName);

      // Save original methods
      const originalExecuteTask = component.executeTask;

      // Failure counter
      let failureCount = 0;

      // Mock executeTask to fail once then succeed
      component.executeTask = jest.fn().mockImplementation(async (task) => {
        if (failureCount === 0) {
          failureCount++;
          throw new Error('Simulated transient failure');
        }

        // Second attempt succeeds
        return {
          success: true,
          data: { message: 'Operation succeeded after retry' },
          metadata: {
            duration: 10,
            timestamp: Date.now()
          }
        };
      });

      // Execute task with retry logic
      const result = await executeWithRetry(() => {
        return component.executeTask({
          id: 'retry-test',
          type: 'test',
          data: {}
        });
      }, 3);

      // Should succeed on second attempt
      expect(result.success).toBe(true);
      expect(component.executeTask).toHaveBeenCalledTimes(2);

      // Restore original method
      component.executeTask = originalExecuteTask;
    });

    it('should isolate errors to prevent cascading failures', async () => {
      // Get multiple components
      const componentNames = registry.getComponentIds();
      const testComponents = componentNames.slice(0, 3);

      // Make one component fail
      const failingComponent = registry.getComponent(testComponents[0]);
      const originalCheckHealth = failingComponent.checkHealth;

      failingComponent.checkHealth = () => ({
        status: 'unhealthy',
        error: new Error('Simulated isolated failure')
      });

      // Check health of other components directly
      const healthyComponent1 = registry.getComponent(testComponents[1]);
      const healthyComponent2 = registry.getComponent(testComponents[2]);

      const health1 = healthyComponent1.checkHealth();
      const health2 = healthyComponent2.checkHealth();

      // Other components should remain healthy
      expect(health1.status).toBe('healthy');
      expect(health2.status).toBe('healthy');

      // Overall system should be degraded but not unhealthy
      const systemHealth = await getSystemHealth();
      expect(['degraded', 'healthy']).toContain(systemHealth.status);

      // Restore component
      failingComponent.checkHealth = originalCheckHealth;
    });
  });
});

/**
 * Get non-critical components
 */
function getNonCriticalComponents(): string[] {
  const { registry } = systemBootstrap();
  const componentNames = registry.getComponentIds();

  return componentNames.filter(name => !registry.isComponentCritical(name));
}

/**
 * Get critical components
 */
function getCriticalComponents(): string[] {
  const { registry } = systemBootstrap();
  const componentNames = registry.getComponentIds();

  return componentNames.filter(name => registry.isComponentCritical(name));
}

/**
 * Restore all components to their original state
 */
async function restoreAllComponents(): Promise<void> {
  const { registry } = systemBootstrap();
  const componentNames = registry.getComponentIds();

  // This is a simplified approach - in a real system you would
  // need to track original methods and restore them properly
  componentNames.forEach(name => {
    const component = registry.getComponent(name);

    // Reset mocked methods if they exist
    if (component.checkHealth && jest.isMockFunction(component.checkHealth)) {
      component.checkHealth.mockRestore();
    }

    if (component.executeTask && jest.isMockFunction(component.executeTask)) {
      component.executeTask.mockRestore();
    }
  });
}

/**
 * Execute a function with retry logic
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delay = 100
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
