import { Wav2Vec2FeatureAdapter } from "../wav2vec2-feature-adapter";
import { SimpleAudioBuffer } from "../../../../types/audio";
import { TaskResult, TaskType } from "../../../../types/tasks";
import { AudioFeatureVector } from "../../interfaces";

// Mock the base adapter class
jest.mock("../../../../adapters/Wav2Vec2Adapter", () => {
  return {
    Wav2Vec2Adapter: jest.fn().mockImplementation(() => ({
      handleTask: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

describe("Wav2Vec2FeatureAdapter", () => {
  let adapter: Wav2Vec2FeatureAdapter;
  let mockAudioBuffer: SimpleAudioBuffer;

  beforeEach(() => {
    // Create adapter instance with test configuration
    adapter = new Wav2Vec2FeatureAdapter({
      maxMemory: "1GB",
      modelPath: "test/model/path",
      options: {
        featureLength: 512,
        windowSize: 320,
        hopSize: 160,
      },
    });

    // Create mock audio buffer
    mockAudioBuffer = {
      data: new Float32Array(16000), // 1 second of audio at 16kHz
      channels: 1,
      sampleRate: 16000,
      metadata: {
        duration: 1,
        format: "wav",
      },
    };

    // Setup successful feature extraction mock
    const mockFeatures = Array(100)
      .fill(0)
      .map(() => new Float32Array(512).map(() => Math.random() - 0.5));

    const mockResult: TaskResult = {
      success: true,
      data: {
        analysis: {
          features: mockFeatures,
          metadata: {
            dimensions: [100, 512],
            timeSteps: 100,
          },
        },
      },
    };

    // Mock the handleTask method
    (adapter as any).handleTask = jest.fn().mockResolvedValue(mockResult);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("extractFeatures", () => {
    it("should extract features from audio buffer", async () => {
      const result = await adapter.extractFeatures(mockAudioBuffer);

      expect(result).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);

      // Verify task creation
      expect((adapter as any).handleTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TaskType.AUDIO_ANALYZE,
          data: expect.objectContaining({
            audio: mockAudioBuffer,
          }),
        })
      );
    });

    it("should throw error if audio metadata is missing", async () => {
      const invalidBuffer = { ...mockAudioBuffer, metadata: undefined };
      await expect(adapter.extractFeatures(invalidBuffer)).rejects.toThrow(
        "Missing audio duration"
      );
    });

    it("should throw error if feature extraction fails", async () => {
      (adapter as any).handleTask = jest.fn().mockResolvedValue({
        success: false,
        error: "Extraction failed",
      });

      await expect(adapter.extractFeatures(mockAudioBuffer)).rejects.toThrow(
        "Feature extraction failed"
      );
    });

    it("should cache extracted features", async () => {
      const result1 = await adapter.extractFeatures(mockAudioBuffer);
      const spy = jest.spyOn(adapter as any, "handleTask");

      // Second extraction of same audio should use cache
      const result2 = await adapter.extractFeatures(mockAudioBuffer);

      expect(spy).toHaveBeenCalledTimes(0);
      expect(result2.features).toEqual(result1.features);
    });
  });

  describe("calculateSimilarity", () => {
    let features1: AudioFeatureVector;
    let features2: AudioFeatureVector;

    beforeEach(async () => {
      const result1 = await adapter.extractFeatures(mockAudioBuffer);
      features1 = result1.features;

      // Create slightly modified audio
      const modifiedBuffer = {
        ...mockAudioBuffer,
        data: new Float32Array(mockAudioBuffer.data.map((x) => x * 1.1)),
      };
      const result2 = await adapter.extractFeatures(modifiedBuffer);
      features2 = result2.features;
    });

    it("should calculate similarity between two feature vectors", async () => {
      const similarity = await adapter.calculateSimilarity(
        features1,
        features2
      );

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it("should throw error for incompatible feature vectors", async () => {
      const invalidFeatures = {
        ...features1,
        featureCount: features1.featureCount + 1,
      };

      await expect(
        adapter.calculateSimilarity(
          features1,
          invalidFeatures as AudioFeatureVector
        )
      ).rejects.toThrow("different lengths");
    });
  });

  describe("createPattern", () => {
    let featureVector: AudioFeatureVector;

    beforeEach(async () => {
      const result = await adapter.extractFeatures(mockAudioBuffer);
      featureVector = result.features;
    });

    it("should create pattern from feature vector", async () => {
      const pattern = await adapter.createPattern(featureVector);

      expect(pattern).toBeDefined();
      expect(pattern.id).toMatch(/^pattern_\d+_/);
      expect(pattern.confidence).toBeGreaterThan(0);
      expect(pattern.features.get("featureData")).toBeDefined();
      expect(pattern.features.get("sampleRate")).toBe(
        mockAudioBuffer.sampleRate
      );
      expect(pattern.features.get("duration")).toBe(
        mockAudioBuffer.metadata?.duration
      );
      expect(pattern.metadata.source).toBe("wav2vec2");
    });

    it("should maintain feature dimensionality", async () => {
      const pattern = await adapter.createPattern(featureVector);

      const dimensions = pattern.features.get("dimensions") as number[];
      expect(dimensions).toEqual(featureVector.metadata.dimensions);

      const featureData = pattern.features.get("featureData") as number[];
      expect(featureData.length).toBe(dimensions[0] * dimensions[1]);
    });
  });

  describe("resource management", () => {
    it("should clear cache on dispose", async () => {
      await adapter.extractFeatures(mockAudioBuffer);
      await adapter.dispose();

      // Try to extract features again - should not use cache
      const spy = jest.spyOn(adapter as any, "handleTask");
      await adapter.extractFeatures(mockAudioBuffer);

      expect(spy).toHaveBeenCalled();
    });

    it("should handle memory pressure", async () => {
      // Fill cache with multiple extractions
      const buffers = Array(10)
        .fill(0)
        .map((_, i) => ({
          ...mockAudioBuffer,
          data: new Float32Array(mockAudioBuffer.data.map((x) => x * (i + 1))),
        }));

      await Promise.all(
        buffers.map((buffer) => adapter.extractFeatures(buffer))
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Verify adapter still functions
      const result = await adapter.extractFeatures(mockAudioBuffer);
      expect(result).toBeDefined();
    });
  });
});
