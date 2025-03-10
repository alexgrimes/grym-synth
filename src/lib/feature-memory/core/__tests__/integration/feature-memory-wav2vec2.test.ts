import {
  FeatureMemorySystem,
  FeatureValue,
  Pattern,
  SearchResult,
  PatternMatchResult,
  FeatureExtractionResult,
  AudioFeatureVector,
} from "../../../index";
import { SimpleAudioBuffer } from "../../../../../types/audio";
import { Wav2Vec2FeatureAdapter } from "../../wav2vec2-feature-adapter";

describe("Feature Memory System with Wav2Vec2 Integration", () => {
  let featureMemory: FeatureMemorySystem;
  let wav2vec2Adapter: Wav2Vec2FeatureAdapter;
  let mockAudioBuffer: SimpleAudioBuffer;
  let samplePatterns: Pattern[] = [];

  beforeAll(async () => {
    // Initialize feature memory system
    featureMemory = new FeatureMemorySystem({
      maxPatterns: 1000,
      cacheSize: 100,
      persistenceEnabled: false,
    });

    // Initialize wav2vec2 adapter
    wav2vec2Adapter = new Wav2Vec2FeatureAdapter({
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
      data: new Float32Array(16000), // 1 second at 16kHz
      channels: 1,
      sampleRate: 16000,
      metadata: {
        duration: 1,
        format: "wav",
      },
    };

    // Mock feature extraction
    const mockFeatures = Array(100)
      .fill(0)
      .map(() => new Float32Array(512).map(() => Math.random() - 0.5));

    (wav2vec2Adapter as any).handleTask = jest.fn().mockResolvedValue({
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
    });
  }, 30000);

  afterAll(async () => {
    await wav2vec2Adapter.dispose();
    await featureMemory.dispose();
  });

  describe("Pattern Extraction and Storage", () => {
    it("should extract features and store pattern", async () => {
      // Extract features
      const extractionResult = await wav2vec2Adapter.extractFeatures(
        mockAudioBuffer
      );
      expect(extractionResult.confidence).toBeGreaterThan(0);

      // Create pattern
      const pattern = await wav2vec2Adapter.createPattern(
        extractionResult.features
      );
      expect(pattern.id).toBeDefined();

      // Store pattern
      const storeResult = await featureMemory.storePattern(pattern);
      expect(storeResult.success).toBe(true);

      // Verify storage
      const searchResult = await featureMemory.searchPatterns({
        features: pattern.features,
      });
      expect(searchResult.success).toBe(true);
      expect(searchResult.data).toHaveLength(1);
      expect(searchResult.data[0].id).toBe(pattern.id);
    });

    it("should recognize similar audio patterns", async () => {
      // Store initial pattern
      const result1 = await wav2vec2Adapter.extractFeatures(mockAudioBuffer);
      const pattern1 = await wav2vec2Adapter.createPattern(result1.features);
      await featureMemory.storePattern(pattern1);

      // Create similar audio with slight modification
      const similarAudio = {
        ...mockAudioBuffer,
        data: new Float32Array(mockAudioBuffer.data.map((x) => x * 1.1)),
      };

      // Extract and create pattern for similar audio
      const result2 = await wav2vec2Adapter.extractFeatures(similarAudio);
      const pattern2 = await wav2vec2Adapter.createPattern(result2.features);

      // Calculate similarity
      const similarity = await wav2vec2Adapter.calculateSimilarity(
        result1.features,
        result2.features
      );
      expect(similarity).toBeGreaterThan(0.8); // High similarity expected

      // Store second pattern
      await featureMemory.storePattern(pattern2);

      // Search for similar patterns
      const searchResult = await featureMemory.searchPatterns({
        features: pattern1.features,
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data.length).toBe(2); // Should find both patterns
    });
  });

  describe("System Integration", () => {
    let storedPatterns: Pattern[] = [];

    beforeEach(async () => {
      // Store multiple patterns with varying characteristics
      const audioVariations = [1.0, 1.1, 0.9, 1.2, 0.8].map((factor) => ({
        ...mockAudioBuffer,
        data: new Float32Array(mockAudioBuffer.data.map((x) => x * factor)),
      }));

      storedPatterns = await Promise.all(
        audioVariations.map(async (audio) => {
          const result = await wav2vec2Adapter.extractFeatures(audio);
          const pattern = await wav2vec2Adapter.createPattern(result.features);
          const storeResult = await featureMemory.storePattern(pattern);
          expect(storeResult.success).toBe(true);
          return pattern;
        })
      );
    });

    it("should maintain pattern relationships", async () => {
      const similarityMatrix: number[][] = [];

      for (const pattern1 of storedPatterns) {
        const row: number[] = [];
        for (const pattern2 of storedPatterns) {
          if (pattern1 === pattern2) {
            row.push(1);
            continue;
          }
          const result = await featureMemory.searchPatterns({
            features: pattern1.features,
          });

          if (result.success) {
            const match = result.data.find(
              (p: Pattern) => p.id === pattern2.id
            );
            row.push(match && result.confidence ? result.confidence : 0);
          } else {
            row.push(0);
          }
        }
        similarityMatrix.push(row);
      }

      expect(similarityMatrix.length).toBe(storedPatterns.length);
      expect(similarityMatrix[0].length).toBe(storedPatterns.length);

      // Check symmetry (similarity should be bidirectional)
      for (let i = 0; i < similarityMatrix.length; i++) {
        for (let j = i + 1; j < similarityMatrix[i].length; j++) {
          expect(
            Math.abs(similarityMatrix[i][j] - similarityMatrix[j][i])
          ).toBeLessThan(0.01);
        }
      }
    });

    it("should handle concurrent operations", async () => {
      type OperationResults = [
        SearchResult,
        PatternMatchResult,
        FeatureExtractionResult
      ];

      const operations = Array(10)
        .fill(0)
        .map(async () => {
          const randomIndex = Math.floor(Math.random() * storedPatterns.length);
          const pattern = storedPatterns[randomIndex];

          return Promise.all([
            featureMemory.searchPatterns({ features: pattern.features }),
            featureMemory.recognizePattern(pattern.features),
            wav2vec2Adapter.extractFeatures(mockAudioBuffer),
          ]) as Promise<OperationResults>;
        });

      const results = await Promise.all(operations);

      // Verify all operations completed successfully
      results.forEach(([search, recognition, extraction]) => {
        expect(search.success).toBe(true);
        expect(recognition.success).toBe(true);
        expect(extraction.features).toBeDefined();
      });
    });
  });
});
