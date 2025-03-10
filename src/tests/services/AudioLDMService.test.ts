import { AudioLDMService } from "../../services/audio/AudioLDMService";
import { Task } from "../../services/types";

// Mock the AudioLDMBridge to avoid actual Python execution during tests
jest.mock("../../services/audio/AudioLDMBridge", () => {
  return {
    AudioLDMBridge: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        generateAudio: jest.fn().mockResolvedValue({
          audio: new Float32Array(16000 * 5), // 5 seconds at 16kHz
          sampleRate: 16000,
          duration: 5.0,
          parameters: {
            prompt: "test prompt",
            steps: 25,
            guidanceScale: 3.5,
          },
        }),
        dispose: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe("AudioLDMService", () => {
  let service: AudioLDMService;

  beforeEach(() => {
    service = new AudioLDMService({
      maxMemory: "4GB",
      diffusionSteps: 25,
    });
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
      expect(await service.getStatus()).toBe("online");
    });

    it("should not reinitialize if already initialized", async () => {
      await service.initialize();
      const bridgeInit = (service as any).bridge.initialize;

      await service.initialize();
      expect(bridgeInit).toHaveBeenCalledTimes(1);
    });
  });

  describe("task execution", () => {
    it("should generate audio from text prompt", async () => {
      await service.initialize();

      const task: Task = {
        id: "test-task",
        type: "audio-generation",
        modelType: "audioldm",
        data: {
          operation: "generate",
          prompt: "A dog barking in the distance",
          params: {
            diffusionSteps: 25,
            duration: 3.0,
          },
        },
        storeResults: true,
      };

      const result = await service.executeTask(task);

      expect(result.status).toBe("success");
      expect(result.data).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle unsupported task types", async () => {
      await service.initialize();

      const task: Task = {
        id: "test-task",
        type: "text-generation", // Wrong type for AudioLDM
        modelType: "audioldm",
        data: {
          operation: "generate",
          prompt: "Test prompt",
        },
        storeResults: false,
      };

      const result = await service.executeTask(task);

      expect(result.status).toBe("error");
      expect(result.error).toBeDefined();
    });

    it("should handle errors during audio generation", async () => {
      await service.initialize();

      // Mock the bridge to throw an error
      (service as any).bridge.generateAudio.mockRejectedValueOnce(
        new Error("Generation failed")
      );

      const task: Task = {
        id: "test-task",
        type: "audio-generation",
        modelType: "audioldm",
        data: {
          operation: "generate",
          prompt: "A dog barking",
        },
        storeResults: true,
      };

      const result = await service.executeTask(task);

      expect(result.status).toBe("error");
      expect(result.error).toBeDefined();
    });
  });

  describe("metrics", () => {
    it("should track request count and processing time", async () => {
      await service.initialize();

      const task: Task = {
        id: "test-task",
        type: "audio-generation",
        modelType: "audioldm",
        data: {
          operation: "generate",
          prompt: "Test prompt",
        },
        storeResults: true,
      };

      await service.executeTask(task);
      const metrics = await service.getMetrics();

      expect(metrics.requestCount).toBe(1);
      expect(metrics.processingTime).toBeGreaterThan(0);
    });
  });
});
