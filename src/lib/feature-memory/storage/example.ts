import { createFeatureStorage } from "./index";
import { AudioPattern, PatternMetadata } from "../../types/audio";
import { HealthMonitor } from "../../monitoring/HealthMonitor";

// Error types
class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

const isStorageError = (error: unknown): error is StorageError => {
  return error instanceof StorageError;
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

async function exampleUsage() {
  // Initialize the feature storage system
  const storage = createFeatureStorage({
    indexPath: "./feature-index",
    dimensions: 768, // Wav2Vec2 feature dimension
    distanceMetric: "cosine",
    persistIndexOnDisk: true,
    similarityThreshold: 0.8,
    maxQueryResults: 5,
    healthMonitor: new HealthMonitor(),
  });

  await storage.initialize();

  // Example 1: Store a pattern
  const pattern: AudioPattern = {
    id: crypto.randomUUID(),
    startTime: 0,
    endTime: 1.5,
    frequencyRange: {
      low: 20,
      high: 8000,
    },
    confidence: 0.9,
    type: "harmonic",
    features: new Float32Array(768).fill(0.5), // Example feature vector
  };

  const metadata: PatternMetadata = {
    sourceId: "example-audio-1",
    createdAt: new Date(),
    lastModified: new Date(),
    labels: ["music", "piano"],
  };

  const patternId = await storage.storePattern(pattern, metadata);
  console.log("Stored pattern:", patternId);

  // Example 2: Query patterns
  const harmonicPatterns = await storage.queryPatterns({
    type: "harmonic",
    timeRange: {
      min: 0,
      max: 2,
    },
    confidenceThreshold: 0.7,
  });
  console.log("Found harmonic patterns:", harmonicPatterns.length);

  // Example 3: Find similar patterns
  const queryFeatures = new Float32Array(768).fill(0.5);
  const similarPatterns = await storage.findSimilarPatterns(queryFeatures, {
    similarityThreshold: 0.7,
    maxResults: 3,
  });
  console.log("Found similar patterns:", similarPatterns.length);

  // Example 4: Update a pattern
  const updateSuccess = await storage.updatePattern(patternId, {
    confidence: 0.95,
    type: "melodic",
  });
  console.log("Update success:", updateSuccess);

  // Example 5: Get pattern by ID
  const retrievedPattern = await storage.getPatternById(patternId);
  console.log("Retrieved pattern:", retrievedPattern?.type);

  // Example 6: Delete a pattern
  const deleteSuccess = await storage.deletePattern(patternId);
  console.log("Delete success:", deleteSuccess);
}

// Example of batch processing
async function batchProcessingExample() {
  const storage = createFeatureStorage({
    indexPath: "./feature-index",
    dimensions: 768,
    distanceMetric: "cosine",
  });

  await storage.initialize();

  // Process multiple patterns
  const patterns: AudioPattern[] = [];
  for (let i = 0; i < 10; i++) {
    patterns.push({
      id: crypto.randomUUID(),
      startTime: i,
      endTime: i + 1,
      frequencyRange: { low: 20, high: 8000 },
      confidence: 0.8 + Math.random() * 0.2,
      type: i % 2 === 0 ? "harmonic" : "percussive",
      features: new Float32Array(768).map(() => Math.random()),
    });
  }

  // Store all patterns
  const results = await Promise.all(
    patterns.map((pattern) =>
      storage.storePattern(pattern, {
        sourceId: "batch-example",
        createdAt: new Date(),
        lastModified: new Date(),
      })
    )
  );

  console.log("Stored patterns:", results.length);

  // Find patterns with high confidence
  const highConfidencePatterns = await storage.queryPatterns({
    confidenceThreshold: 0.9,
  });

  console.log("High confidence patterns:", highConfidencePatterns.length);
}

// Example of error handling
async function errorHandlingExample() {
  const storage = createFeatureStorage({
    indexPath: "./feature-index",
    dimensions: 768,
    distanceMetric: "cosine",
  });

  try {
    await storage.initialize();

    // Try to get a non-existent pattern
    const pattern = await storage.getPatternById("non-existent-id");
    if (!pattern) {
      console.log("Pattern not found");
    }

    // Try to store an invalid pattern
    try {
      await storage.storePattern(
        {
          id: crypto.randomUUID(),
          startTime: 0,
          endTime: 1,
          frequencyRange: { low: 20, high: 8000 },
          confidence: 0.8,
          type: "test",
          features: new Float32Array(100), // Wrong dimensions
        },
        {
          sourceId: "error-example",
          createdAt: new Date(),
          lastModified: new Date(),
        }
      );
    } catch (error) {
      console.log("Invalid pattern error:", formatError(error));
    }

    // Try to update a non-existent pattern
    const updateResult = await storage.updatePattern("non-existent-id", {
      confidence: 0.9,
    });
    console.log("Update result:", updateResult); // Should be false
  } catch (error) {
    console.error("Storage system error:", formatError(error));
  }
}

// Run examples
async function runExamples() {
  console.log("Running basic example...");
  await exampleUsage().catch((error) => {
    console.error("Basic example error:", formatError(error));
  });

  console.log("\nRunning batch processing example...");
  await batchProcessingExample().catch((error) => {
    console.error("Batch processing error:", formatError(error));
  });

  console.log("\nRunning error handling example...");
  await errorHandlingExample().catch((error) => {
    console.error("Error handling example error:", formatError(error));
  });
}

// Only run if this file is executed directly
if (require.main === module) {
  runExamples().catch((error) => {
    console.error("Example runner error:", formatError(error));
    process.exit(1);
  });
}
