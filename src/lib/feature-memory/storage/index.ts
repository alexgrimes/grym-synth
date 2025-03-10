import { HealthMonitor } from "../../monitoring/HealthMonitor";
import {
  FeatureVectorDatabase,
  FeatureVectorDatabaseConfig,
  VectorSearchOptions,
  VectorSearchResult,
} from "./FeatureVectorDatabase";
import {
  PatternRepository,
  PatternRepositoryConfig,
} from "./PatternRepository";
import { AudioPattern, PatternMetadata, PatternQuery } from "../../types/audio";

// Export types and classes for external use
export {
  FeatureVectorDatabase,
  type FeatureVectorDatabaseConfig,
  type VectorSearchOptions,
  type VectorSearchResult,
} from "./FeatureVectorDatabase";

export {
  PatternRepository,
  type PatternRepositoryConfig,
} from "./PatternRepository";

// Re-export types from audio that are commonly used with the storage system
export type {
  AudioPattern,
  PatternMetadata,
  PatternQuery,
} from "../../types/audio";

/**
 * Creates a new feature storage system instance with the given configuration.
 * This is the recommended way to instantiate the storage system.
 */
export function createFeatureStorage(config: {
  indexPath: string;
  dimensions: number;
  distanceMetric: "cosine" | "euclidean" | "dot";
  persistIndexOnDisk?: boolean;
  similarityThreshold?: number;
  maxQueryResults?: number;
  healthMonitor?: HealthMonitor;
}) {
  const {
    indexPath,
    dimensions,
    distanceMetric,
    persistIndexOnDisk = false,
    similarityThreshold = 0.7,
    maxQueryResults = 10,
    healthMonitor = undefined,
  } = config;

  // Create a new HealthMonitor if one wasn't provided
  const monitor = healthMonitor || new HealthMonitor();

  // Create the vector database
  const vectorDb = new FeatureVectorDatabase(
    {
      indexPath,
      dimensions,
      distanceMetric,
      persistIndexOnDisk,
    },
    monitor
  );

  // Create the pattern repository
  const repository = new PatternRepository(vectorDb, monitor, {
    vectorDimensions: dimensions,
    similarityThreshold,
    maxQueryResults,
  });

  return {
    /**
     * Initialize the storage system. Must be called before using other methods.
     */
    initialize: () => repository.initialize(),

    /**
     * Store a pattern in the system.
     */
    storePattern: (pattern: AudioPattern, metadata: PatternMetadata) =>
      repository.storePattern(pattern, metadata),

    /**
     * Find patterns similar to the given feature vector.
     */
    findSimilarPatterns: (
      featureVector: Float32Array,
      options?: Partial<VectorSearchOptions>
    ) => repository.findSimilarPatterns(featureVector, options),

    /**
     * Get a pattern by its ID.
     */
    getPatternById: (id: string) => repository.getPatternById(id),

    /**
     * Query patterns based on various criteria.
     */
    queryPatterns: (query: PatternQuery) => repository.queryPatterns(query),

    /**
     * Update an existing pattern.
     */
    updatePattern: (id: string, updates: Partial<AudioPattern>) =>
      repository.updatePattern(id, updates),

    /**
     * Delete a pattern from the system.
     */
    deletePattern: (id: string) => repository.deletePattern(id),

    /**
     * The underlying repository instance, exposed for advanced use cases.
     */
    repository,

    /**
     * The underlying vector database instance, exposed for advanced use cases.
     */
    vectorDb,
  };
}
