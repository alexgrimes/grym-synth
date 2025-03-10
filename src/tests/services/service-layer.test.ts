import {
  serviceRegistry,
  serviceFactory,
  Wav2Vec2Service,
  ServiceNotFoundError,
} from "../../services";
import { Logger } from "../../utils/logger";

const logger = new Logger({ namespace: "service-layer-tests" });

describe("Service Layer", () => {
  beforeEach(async () => {
    // Clear any existing services
    await serviceRegistry.shutdownAll();
  });

  describe("Service Lifecycle", () => {
    let service: Wav2Vec2Service;

    beforeEach(() => {
      service = serviceFactory.createWav2Vec2Service({
        maxMemory: "512MB",
        modelPath: "test-model",
      });
    });

    afterEach(async () => {
      await service.shutdown();
    });

    it("should properly initialize service", async () => {
      expect(service.isInitialized()).toBe(false);
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it("should handle multiple initialization calls gracefully", async () => {
      await service.initialize();
      await service.initialize(); // Should not throw
      expect(service.isInitialized()).toBe(true);
    });

    it("should properly shutdown service", async () => {
      await service.initialize();
      await service.shutdown();
      expect(service.isInitialized()).toBe(false);
    });

    it("should maintain correct status through lifecycle", async () => {
      expect(await service.getStatus()).toBe("offline");
      await service.initialize();
      expect(await service.getStatus()).toBe("online");
      await service.shutdown();
      expect(await service.getStatus()).toBe("offline");
    });
  });

  describe("Service Registry", () => {
    it("should register and retrieve services", async () => {
      const service = serviceFactory.createWav2Vec2Service();
      serviceRegistry.registerService("test-service", service);

      const retrieved = await serviceRegistry.getService("test-service");
      expect(retrieved).toBe(service);
    });

    it("should throw on unknown service", async () => {
      await expect(
        serviceRegistry.getService("unknown-service")
      ).rejects.toThrow(ServiceNotFoundError);
    });

    it("should initialize service on first retrieval", async () => {
      const service = serviceFactory.createWav2Vec2Service();
      serviceRegistry.registerService("test-service", service);

      expect(service.isInitialized()).toBe(false);
      await serviceRegistry.getService("test-service");
      expect(service.isInitialized()).toBe(true);
    });

    it("should handle service removal", async () => {
      const service = serviceFactory.createWav2Vec2Service();
      serviceRegistry.registerService("test-service", service);

      await serviceRegistry.removeService("test-service");
      await expect(serviceRegistry.getService("test-service")).rejects.toThrow(
        ServiceNotFoundError
      );
    });

    it("should shutdown all services", async () => {
      const service1 = serviceFactory.createWav2Vec2Service();
      const service2 = serviceFactory.createWav2Vec2Service();

      serviceRegistry.registerService("service1", service1);
      serviceRegistry.registerService("service2", service2);

      await service1.initialize();
      await service2.initialize();

      await serviceRegistry.shutdownAll();

      expect(service1.isInitialized()).toBe(false);
      expect(service2.isInitialized()).toBe(false);
    });
  });

  describe("Service Factory", () => {
    it("should create service with default config", () => {
      const service = serviceFactory.createWav2Vec2Service();
      expect(service).toBeInstanceOf(Wav2Vec2Service);
    });

    it("should create service with custom config", () => {
      const service = serviceFactory.createWav2Vec2Service({
        maxMemory: "2GB",
        modelPath: "custom-model",
        deviceType: "cuda",
      });
      expect(service).toBeInstanceOf(Wav2Vec2Service);
    });

    it("should throw on invalid config", () => {
      expect(() =>
        serviceFactory.createWav2Vec2Service({ maxMemory: "" })
      ).toThrow();
    });
  });

  describe("Service Task Execution", () => {
    let service: Wav2Vec2Service;

    beforeEach(async () => {
      service = serviceFactory.createWav2Vec2Service();
      await service.initialize();
    });

    afterEach(async () => {
      await service.shutdown();
    });

    it("should execute audio processing task", async () => {
      const task = {
        id: "test-task",
        type: "audio_process",
        modelType: "wav2vec2",
        data: new Float32Array(1024),
        storeResults: false,
      };

      const result = await service.executeTask(task);
      expect(result.status).toBe("success");
      expect(result.metrics).toBeDefined();
    });

    it("should handle task errors gracefully", async () => {
      const task = {
        id: "test-task",
        type: "unknown_type",
        modelType: "wav2vec2",
        data: null,
        storeResults: false,
      };

      const result = await service.executeTask(task);
      expect(result.status).toBe("error");
      expect(result.error).toBeDefined();
    });

    it("should track metrics during task execution", async () => {
      const task = {
        id: "test-task",
        type: "audio_process",
        modelType: "wav2vec2",
        data: new Float32Array(1024),
        storeResults: false,
      };

      const result = await service.executeTask(task);
      expect(result.metrics).toMatchObject({
        memoryUsage: expect.any(Number),
        processingTime: expect.any(Number),
        requestCount: expect.any(Number),
      });
    });
  });
});
