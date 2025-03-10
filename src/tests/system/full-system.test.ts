/**
 * Full System Integration Tests
 *
 * Tests for complete system with all components active
 */
import {
  systemBootstrap,
  initializeSystem,
  shutdownSystem,
  getSystemHealth,
  ComponentRegistry,
  SystemInitializer,
  SystemHealthMonitor,
  SystemShutdown,
  componentRegistry
} from '../../services/integration';
import { contextManager } from '../../context';
import { taskRouter } from '../../orchestration';
import { serviceRegistry } from '../../services';
import { Logger } from '../../utils/logger';
import { createMockServices } from '../mocks/service-mocks';

const logger = new Logger({ namespace: 'full-system-test' });

/**
 * Test configuration
 */
interface TestConfig {
  /**
   * Whether to run extended tests
   */
  runExtendedTests: boolean;

  /**
   * Timeout for tests in milliseconds
   */
  testTimeoutMs: number;

  /**
   * Components to mock during testing
   */
  mockComponents: string[];
}

/**
 * Default test configuration
 */
const DEFAULT_CONFIG: TestConfig = {
  runExtendedTests: process.env.RUN_EXTENDED_TESTS === 'true',
  testTimeoutMs: 60000, // 60 seconds
  mockComponents: ['audioLDMService', 'gamaService']
};

describe('Full System Integration Tests', () => {
  let registry: ComponentRegistry;
  let initializer: SystemInitializer;
  let healthMonitor: SystemHealthMonitor;
  let shutdown: SystemShutdown;
  let config: TestConfig = DEFAULT_CONFIG;

  beforeAll(async () => {
    // Configure test environment
    jest.setTimeout(config.testTimeoutMs);

    // Bootstrap system components
    const system = systemBootstrap();
    registry = system.registry;
    initializer = system.initializer;
    healthMonitor = system.healthMonitor;
    shutdown = system.shutdown;

    // Register all mock services
    const mockServices = createMockServices();
    Object.entries(mockServices).forEach(([id, service]) => {
      registry.registerComponent(id, service, {
        isCritical: id === 'configService' || id === 'loggingService',
        tags: ['mocked', 'test']
      });
      logger.debug(`Registered mock service: ${id}`);
    });

    // Mock heavy components if needed
    if (config.mockComponents.length > 0) {
      logger.info('Mocking components for testing', { components: config.mockComponents });
      mockHeavyComponents(config.mockComponents);
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    await shutdownSystem('Test suite completed');
  });

  describe('System Initialization', () => {
    it('should initialize all system components successfully', async () => {
      const result = await initializeSystem();

      expect(result.success).toBe(true);
      expect(result.failedComponents.length).toBe(0);
      expect(result.initializedComponents.length).toBeGreaterThan(0);

      // Verify critical components are initialized
      expect(result.initializedComponents).toContain('configService');
      expect(result.initializedComponents).toContain('loggingService');
    });

    it('should report healthy system status after initialization', async () => {
      const health = await getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.metrics.healthyPercentage).toBeGreaterThanOrEqual(90);
      expect(health.unhealthyComponents.length).toBe(0);
    });
  });

  describe('Core Functionality', () => {
    it('should process context operations correctly', async () => {
      // Store test context
      const testContext = {
        id: 'test-context-1',
        type: 'audio_parameters',
        content: {
          sampleRate: 44100,
          channels: 2,
          format: 'wav'
        },
        metadata: {
          timestamp: Date.now(),
          source: 'system-test',
          priority: 1,
          tags: []
        }
      };

      await contextManager.storeContext(testContext);

      // Retrieve context
      const retrievedContext = await contextManager.getContextForModel('test-context-1', {
        types: ['audio_parameters']
      });

      expect(retrievedContext).toBeDefined();
      expect(retrievedContext?.content).toEqual(testContext.content);
      expect(retrievedContext?.metadata.source).toBe('system-test');
    });

    it('should route tasks to appropriate handlers', async () => {
      // Create a test task
      const testTask = {
        id: 'test-task-1',
        type: 'audio_process', // This should match a type in the task-router.ts serviceMap
        modelType: 'wav2vec2',
        data: new Float32Array(1024),
        storeResults: true,
        context: {
          tags: ['system-test']
        }
      };

      // Mock the service registry's getService method
      const originalGetService = serviceRegistry.getService;
      const mockService = {
        executeTask: jest.fn().mockResolvedValue({
          success: true,
          data: { processed: true },
          metadata: {
            duration: 100,
            timestamp: Date.now()
          }
        }),
        getStatus: jest.fn().mockReturnValue('online'),
        initialize: jest.fn().mockResolvedValue(undefined)
      };

      serviceRegistry.getService = jest.fn().mockResolvedValue(mockService);

      // Route task
      const result = await taskRouter.routeTask(testTask);

      // Verify the task was routed correctly
      expect(result.success).toBe(true);
      expect(mockService.executeTask).toHaveBeenCalled();

      // Restore the original method
      serviceRegistry.getService = originalGetService;
    });

    it('should maintain system health during operations', async () => {
      // Perform a series of operations
      const operations = [];

      for (let i = 0; i < 10; i++) {
        operations.push(
          contextManager.storeContext({
            id: `stress-context-${i}`,
            type: 'test',
            content: { value: i },
            metadata: {
              timestamp: Date.now(),
              source: 'stress-test',
              priority: 1,
              tags: []
            }
          })
        );
      }

      await Promise.all(operations);

      // Check system health
      const health = await getSystemHealth();

      expect(health.status).toBe('healthy');
      expect(health.metrics.healthyComponents).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from component errors', async () => {
      // Get a non-critical component
      const testComponent = registry.getComponent('metricsCollector');

      if (!testComponent) {
        logger.warn('Metrics collector not found, skipping test');
        return;
      }

      // Simulate component error
      const originalCheckHealth = testComponent.checkHealth;
      testComponent.checkHealth = () => ({ status: 'unhealthy', error: new Error('Test error') });

      // Check system health
      let health = await getSystemHealth();

      // System should be degraded but not unhealthy
      expect(['degraded', 'healthy']).toContain(health.status);

      // Restore component
      testComponent.checkHealth = originalCheckHealth;

      // System should recover
      health = await getSystemHealth();
      expect(health.status).toBe('healthy');
    });

    it('should log errors appropriately', async () => {
      // Mock logger
      const originalError = logger.error;
      const mockError = jest.fn();
      logger.error = mockError;

      // Trigger error
      try {
        await taskRouter.routeTask({
          id: 'invalid-task',
          type: 'invalid_type',
          modelType: 'unknown',
          data: null as any,
          storeResults: true
        });
      } catch (error) {
        // Expected error
      }

      // Verify error was logged
      expect(mockError).toHaveBeenCalled();

      // Restore logger
      logger.error = originalError;
    });
  });

  // Extended tests only run when explicitly enabled
  (config.runExtendedTests ? describe : describe.skip)('Extended System Tests', () => {
    it('should handle concurrent operations under load', async () => {
      const concurrentOperations = 100;
      const operations = [];

      const startTime = performance.now();

      // Generate concurrent operations
      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(
          contextManager.storeContext({
            id: `concurrent-${i}`,
            type: 'test',
            content: { value: i },
            metadata: {
              timestamp: Date.now(),
              source: 'concurrent-test',
              priority: 1,
              tags: []
            }
          })
        );
      }

      await Promise.all(operations);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerOperation = totalTime / concurrentOperations;

      logger.info('Concurrent operations completed', {
        operations: concurrentOperations,
        totalTimeMs: totalTime.toFixed(2),
        avgTimePerOperationMs: avgTimePerOperation.toFixed(2)
      });

      // Verify system remains healthy
      const health = await getSystemHealth();
      expect(health.status).toBe('healthy');

      // Performance assertion - adjust based on system capabilities
      expect(avgTimePerOperation).toBeLessThan(50); // 50ms per operation
    });

    it('should maintain consistent performance over time', async () => {
      const iterations = 5;
      const operationsPerIteration = 20;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const operations = [];

        for (let j = 0; j < operationsPerIteration; j++) {
          operations.push(
            contextManager.storeContext({
              id: `perf-${i}-${j}`,
              type: 'test',
              content: { iteration: i, operation: j },
              metadata: {
                timestamp: Date.now(),
                source: 'performance-test',
                priority: 1,
                tags: []
              }
            })
          );
        }

        await Promise.all(operations);

        const iterationTime = performance.now() - startTime;
        results.push(iterationTime);

        // Short delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate statistics
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const minTime = Math.min(...results);
      const maxTime = Math.max(...results);
      const variance = results.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / results.length;
      const stdDev = Math.sqrt(variance);

      logger.info('Performance consistency results', {
        iterations,
        operationsPerIteration,
        avgTimeMs: avgTime.toFixed(2),
        minTimeMs: minTime.toFixed(2),
        maxTimeMs: maxTime.toFixed(2),
        stdDevMs: stdDev.toFixed(2)
      });

      // Verify performance consistency
      // Standard deviation should be less than 50% of the average time
      expect(stdDev).toBeLessThan(avgTime * 0.5);
    });
  });
});

/**
 * Mocks heavy components for testing
 *
 * @param componentNames - Names of components to mock
 */
function mockHeavyComponents(componentNames: string[]): void {
  componentNames.forEach(name => {
    // Create mock component
    const mockComponent = {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      checkHealth: jest.fn().mockReturnValue({ status: 'healthy' }),
      process: jest.fn().mockImplementation((data: any) => Promise.resolve({
        success: true,
        result: { processed: true, original: data },
        metrics: {
          processingTimeMs: 5,
          resourceUsage: { memoryUsage: 10, cpuUsage: 5 }
        }
      }))
    };

    // Register mock component
    componentRegistry.registerComponent(name, mockComponent, {
      isCritical: false,
      tags: ['mocked', 'test']
    });

    logger.debug(`Mocked component: ${name}`);
  });
}
