import { FeatureVectorDatabase } from "../FeatureVectorDatabase";
import { PatternRepository } from "../PatternRepository";
import { HealthMonitor } from "../../../monitoring/HealthMonitor";
import { AudioPattern, PatternMetadata } from "../../../types/audio";

describe("Feature Storage Integration Tests", () => {
  let vectorDb: FeatureVectorDatabase;
  let repository: PatternRepository;
  let healthMonitor: HealthMonitor;

  beforeAll(async () => {
    healthMonitor = new HealthMonitor();

    vectorDb = new FeatureVectorDatabase(
      {
        indexPath: "./test-index",
        dimensions: 768,
        distanceMetric: "cosine",
        persistIndexOnDisk: false,
      },
      healthMonitor
    );

    repository = new PatternRepository(vectorDb, healthMonitor, {
      vectorDimensions: 768,
      similarityThreshold: 0.7,
      maxQueryResults: 10,
    });

    await repository.initialize();
  });

  beforeEach(async () => {
    // Clear any existing patterns
    const patterns = await repository.queryPatterns({});
    for (const pattern of patterns) {
      await repository.deletePattern(pattern.id);
    }
  });

  it("should store and retrieve patterns", async () => {
    const pattern = createTestPattern();
    const metadata = createTestMetadata();

    const id = await repository.storePattern(pattern, metadata);
    expect(id).toBeDefined();

    const retrieved = await repository.getPatternById(id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(id);
    expect(retrieved?.type).toBe(pattern.type);
  });

  it("should find similar patterns based on feature vectors", async () => {
    // Store multiple patterns with varying similarities
    const baseFeatures = createFeatureVector(0.5);
    const similarFeatures = createFeatureVector(0.6); // More similar
    const dissimilarFeatures = createFeatureVector(0.1); // Less similar

    const patterns = [
      { ...createTestPattern(), features: baseFeatures },
      { ...createTestPattern(), features: similarFeatures },
      { ...createTestPattern(), features: dissimilarFeatures },
    ];

    for (const pattern of patterns) {
      await repository.storePattern(pattern, createTestMetadata());
    }

    const results = await repository.findSimilarPatterns(baseFeatures, {
      similarityThreshold: 0.7,
      maxResults: 2,
    });

    expect(results.length).toBeLessThanOrEqual(2);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should query patterns based on criteria", async () => {
    // Store patterns with different characteristics
    const patterns = [
      {
        ...createTestPattern(),
        type: "harmonic",
        startTime: 0,
        endTime: 1,
        confidence: 0.9,
      },
      {
        ...createTestPattern(),
        type: "percussive",
        startTime: 1,
        endTime: 2,
        confidence: 0.7,
      },
      {
        ...createTestPattern(),
        type: "harmonic",
        startTime: 2,
        endTime: 3,
        confidence: 0.8,
      },
    ];

    for (const pattern of patterns) {
      await repository.storePattern(pattern, createTestMetadata());
    }

    // Query by type
    const harmonicPatterns = await repository.queryPatterns({
      type: "harmonic",
    });
    expect(harmonicPatterns.length).toBe(2);

    // Query by time range
    const timeRangePatterns = await repository.queryPatterns({
      timeRange: { min: 0.5, max: 1.5 },
    });
    expect(timeRangePatterns.length).toBe(2);

    // Query by confidence threshold
    const highConfidencePatterns = await repository.queryPatterns({
      confidenceThreshold: 0.8,
    });
    expect(highConfidencePatterns.length).toBe(2);
  });

  it("should update patterns", async () => {
    const pattern = createTestPattern();
    const id = await repository.storePattern(pattern, createTestMetadata());

    const updates = {
      type: "updated",
      confidence: 0.95,
    };

    const success = await repository.updatePattern(id, updates);
    expect(success).toBe(true);

    const updated = await repository.getPatternById(id);
    expect(updated?.type).toBe("updated");
    expect(updated?.confidence).toBe(0.95);
  });

  it("should delete patterns", async () => {
    const pattern = createTestPattern();
    const id = await repository.storePattern(pattern, createTestMetadata());

    const success = await repository.deletePattern(id);
    expect(success).toBe(true);

    const deleted = await repository.getPatternById(id);
    expect(deleted).toBeNull();
  });
});

// Helper functions

function createTestPattern(
  overrides: Partial<AudioPattern> = {}
): AudioPattern {
  return {
    id: crypto.randomUUID(),
    startTime: 0,
    endTime: 1,
    frequencyRange: { low: 20, high: 20000 },
    confidence: 0.8,
    type: "test",
    features: createFeatureVector(0.5),
    ...overrides,
  };
}

function createTestMetadata(
  overrides: Partial<PatternMetadata> = {}
): PatternMetadata {
  return {
    sourceId: "test-source",
    createdAt: new Date(),
    lastModified: new Date(),
    ...overrides,
  };
}

function createFeatureVector(baseValue: number): Float32Array {
  const vector = new Float32Array(768);
  for (let i = 0; i < vector.length; i++) {
    vector[i] = baseValue + (Math.random() * 0.2 - 0.1);
  }
  return vector;
}
