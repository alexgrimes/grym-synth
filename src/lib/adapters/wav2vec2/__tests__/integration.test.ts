import { PythonBridgeService } from "../PythonBridgeService";
import { Wav2Vec2FeatureAdapter } from "../Wav2Vec2FeatureAdapter";
import { HealthMonitor } from "../../../monitoring/HealthMonitor";

describe("Wav2Vec2 Integration Tests", () => {
  let bridge: PythonBridgeService;
  let adapter: Wav2Vec2FeatureAdapter;
  let healthMonitor: HealthMonitor;

  beforeAll(() => {
    healthMonitor = new HealthMonitor();

    bridge = new PythonBridgeService(
      {
        baseUrl: "http://localhost:8000",
        timeout: 5000,
        maxRetries: 3,
        healthEndpoint: "/health",
        modelEndpoints: {
          "wav2vec2-base": "/process/wav2vec2",
        },
      },
      healthMonitor
    );

    adapter = new Wav2Vec2FeatureAdapter(
      "http://localhost:8000",
      {
        modelType: "base",
        useQuantization: false,
      },
      5000,
      {
        maxRetries: 3,
        backoff: 1000,
      },
      healthMonitor,
      bridge
    );
  });

  describe("PythonBridgeService", () => {
    it("should check health status of Python backend", async () => {
      const health = await bridge.checkHealth();
      expect(health).toBe(true);
    });

    it("should load a model", async () => {
      const result = await bridge.loadModel({
        name: "wav2vec2-base",
        path: "facebook/wav2vec2-base-960h",
        parameters: {},
      });

      expect(result).toBe(true);
    });

    it("should process audio and return features", async () => {
      // Create a test audio buffer
      const sampleRate = 16000;
      const duration = 2; // seconds
      const buffer = createTestAudioBuffer(sampleRate, duration);

      const features = await bridge.processAudio(buffer, "wav2vec2-base", {
        model: "wav2vec2-base",
      });

      expect(features).toBeInstanceOf(Float32Array);
      expect(features.length).toBeGreaterThan(0);
    });
  });

  describe("Wav2Vec2FeatureAdapter", () => {
    it("should initialize successfully", async () => {
      const initialized = await adapter.initialize();
      expect(initialized).toBe(true);
    });

    it("should extract features from audio", async () => {
      const sampleRate = 16000;
      const duration = 2;
      const buffer = createTestAudioBuffer(sampleRate, duration);

      const features = await adapter.extractFeatures(buffer);

      expect(features).toBeInstanceOf(Float32Array);
      expect(features.length).toBeGreaterThan(0);
    });

    it("should create pattern from audio region", async () => {
      const sampleRate = 16000;
      const duration = 2;
      const buffer = createTestAudioBuffer(sampleRate, duration);

      const pattern = await adapter.createPattern(buffer, {
        startTime: 0,
        endTime: 1,
        frequencyRange: {
          low: 20,
          high: 8000,
        },
      });

      expect(pattern).toBeDefined();
      expect(pattern.id).toBeDefined();
      expect(pattern.features).toBeInstanceOf(Float32Array);
    });

    it("should compare features correctly", async () => {
      // Create two similar audio buffers
      const sampleRate = 16000;
      const duration = 2;
      const buffer1 = createTestAudioBuffer(sampleRate, duration);
      const buffer2 = createTestAudioBuffer(sampleRate, duration);

      const features1 = await adapter.extractFeatures(buffer1);
      const features2 = await adapter.extractFeatures(buffer2);

      const similarity = await adapter.compareFeatures(features1, features2);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });
});

// Helper function to create a test audio buffer
function createTestAudioBuffer(
  sampleRate: number,
  duration: number
): AudioBuffer {
  const length = sampleRate * duration;
  const buffer = new AudioBuffer({
    length,
    numberOfChannels: 1,
    sampleRate,
  });

  const data = buffer.getChannelData(0);

  // Fill with a simple sine wave
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin((440 * Math.PI * 2 * i) / sampleRate);
  }

  return buffer;
}
