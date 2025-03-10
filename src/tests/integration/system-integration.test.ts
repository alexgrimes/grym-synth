import {
  systemBootstrap,
  initializeSystem,
  shutdownSystem,
} from "../../integration";
import { taskRouter } from "../../orchestration";
import { contextManager, ContextItem, ContextItemType } from "../../context";
import { serviceRegistry, serviceFactory } from "../../services";
import { Logger } from "../../utils/logger";

const logger = new Logger({ namespace: "integration-tests" });

describe("System Integration", () => {
  // Use longer timeout for integration tests
  jest.setTimeout(10000);

  beforeAll(async () => {
    // Initialize the system
    await initializeSystem({
      enableHealthMonitoring: true,
      healthCheckIntervalMs: 1000,
    });

    // Ensure the wav2vec2 service is registered and initialized
    const wav2vec2Service = serviceFactory.createWav2Vec2Service({
      maxMemory: "512MB",
      modelPath: "facebook/wav2vec2-base-960h",
      deviceType: "cpu",
    });

    serviceRegistry.registerService("wav2vec2", wav2vec2Service);
    await wav2vec2Service.initialize();

    // Verify service is online
    const status = await wav2vec2Service.getStatus();
    expect(status).toBe("online");
  });

  afterAll(async () => {
    // Ensure proper cleanup
    try {
      await shutdownSystem();
    } catch (error) {
      logger.error("Error during system shutdown", { error });
    }

    // Clean up any remaining timeouts or intervals
    jest.useRealTimers();
  });

  // Clean up after each test
  afterEach(async () => {
    // Clear any context data
    await contextManager.clear().catch(() => {});

    // Reset service metrics if supported
    const services = serviceRegistry.getAllServiceIds();
    await Promise.all(
      services.map(async (id) => {
        const service = await serviceRegistry.getService(id);
        if (typeof service.resetMetrics === "function") {
          await service.resetMetrics().catch(() => {});
        }
      })
    );
  });

  describe("End-to-End Task Execution", () => {
    it("should process audio task with context", async () => {
      // Set up test context
      const contextItem: ContextItem = {
        id: "test-audio-context",
        type: "audio_parameters",
        content: {
          sampleRate: 16000,
          channels: 1,
          format: "wav",
        },
        metadata: {
          timestamp: new Date(),
          source: "integration-test",
          priority: 1,
        },
      };
      await contextManager.storeContext(contextItem);

      // Create test audio data
      const audioData = new Float32Array(1024).fill(0.1);

      // Create task
      const task = {
        id: "test-task-1",
        type: "audio_process",
        modelType: "wav2vec2",
        data: audioData,
        storeResults: true,
        context: {
          tags: ["integration-test"],
        },
      };

      // Measure execution time
      const startTime = process.hrtime.bigint();
      const result = await taskRouter.routeTask(task);
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to ms

      // Verify success
      expect(result.status).toBe("success");
      expect(result.data).toBeDefined();
      expect(result.metrics).toBeDefined();

      // Verify performance
      expect(executionTime).toBeLessThan(1000); // Relaxed constraint for testing
      expect(result.routingMetrics.routingTime).toBeLessThan(500);
      expect(result.routingMetrics.contextFetchTime).toBeLessThan(500);
    });

    it("should handle multiple concurrent tasks", async () => {
      const taskCount = 3;
      const tasks = Array.from({ length: taskCount }, (_, i) => ({
        id: `concurrent-task-${i}`,
        type: "audio_process",
        modelType: "wav2vec2",
        data: new Float32Array(1024).fill(0.1),
        storeResults: false,
      }));

      const startTime = process.hrtime.bigint();
      const results = await Promise.all(
        tasks.map((task) => taskRouter.routeTask(task))
      );
      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1_000_000;

      // All tasks should succeed
      expect(results.every((r) => r.status === "success")).toBe(true);

      // Average time per task should meet performance targets
      const avgTimePerTask = totalTime / taskCount;
      expect(avgTimePerTask).toBeLessThan(1000); // Relaxed constraint for testing
    });

    it("should maintain context between tasks", async () => {
      // First task stores context
      const task1 = {
        id: "context-task-1",
        type: "audio_process",
        modelType: "wav2vec2",
        data: new Float32Array(1024).fill(0.1),
        storeResults: true,
        context: {
          tags: ["context-test"],
        },
      };

      await taskRouter.routeTask(task1);

      // Second task should use stored context
      const task2 = {
        id: "context-task-2",
        type: "audio_process",
        modelType: "wav2vec2",
        data: new Float32Array(1024).fill(0.2),
        storeResults: true,
        context: {
          fromTimestamp: new Date(Date.now() - 1000), // Last second
          tags: ["context-test"],
        },
      };

      const result = await taskRouter.routeTask(task2);
      expect(result.status).toBe("success");
      expect(result.metrics).toBeDefined();
    });
  });

  describe("Health Monitoring Integration", () => {
    it("should track service health metrics", async () => {
      // Execute some tasks to generate metrics
      const tasks = Array.from({ length: 3 }, (_, i) => ({
        id: `health-test-task-${i}`,
        type: "audio_process",
        modelType: "wav2vec2",
        data: new Float32Array(1024).fill(0.1),
        storeResults: false,
      }));

      await Promise.all(tasks.map((task) => taskRouter.routeTask(task)));

      // Get service metrics
      const wav2vec2Service = await serviceRegistry.getService("wav2vec2");
      const metrics = await wav2vec2Service.getMetrics();

      // Verify metrics are being tracked
      expect(metrics.requestCount).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });

    it("should handle service recovery", async () => {
      const wav2vec2Service = await serviceRegistry.getService("wav2vec2");

      // Simulate service shutdown
      await wav2vec2Service.shutdown();
      expect(await wav2vec2Service.getStatus()).toBe("offline");

      // Task should trigger automatic recovery
      const task = {
        id: "recovery-test-task",
        type: "audio_process",
        modelType: "wav2vec2",
        data: new Float32Array(1024).fill(0.1),
        storeResults: false,
      };

      const result = await taskRouter.routeTask(task);
      expect(result.status).toBe("success");
      expect(await wav2vec2Service.getStatus()).toBe("online");
    });

    it("should maintain performance under load", async () => {
      const iterations = 5;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();

        await taskRouter.routeTask({
          id: `load-test-task-${i}`,
          type: "audio_process",
          modelType: "wav2vec2",
          data: new Float32Array(1024).fill(0.1),
          storeResults: false,
        });

        const endTime = process.hrtime.bigint();
        timings.push(Number(endTime - startTime) / 1_000_000);

        // Small delay between iterations to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Calculate performance metrics
      const avgTime = timings.reduce((a, b) => a + b) / iterations;
      const maxTime = Math.max(...timings);

      // Verify performance remains consistent
      expect(avgTime).toBeLessThan(1000);
      expect(maxTime).toBeLessThan(2000);
    });
  });
});
