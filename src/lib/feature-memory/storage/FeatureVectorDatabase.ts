import { AudioPattern, PatternMetadata } from "../../types/audio";
import { HealthMonitor } from "../../monitoring/HealthMonitor";

export interface VectorSearchOptions {
  similarityThreshold: number;
  maxResults: number;
  includeMetadata: boolean;
}

export interface VectorSearchResult {
  patternId: string;
  similarity: number;
  pattern?: AudioPattern;
  metadata?: PatternMetadata;
}

export interface FeatureVectorDatabaseConfig {
  indexPath: string;
  dimensions: number;
  distanceMetric: "cosine" | "euclidean" | "dot";
  persistIndexOnDisk: boolean;
}

export class FeatureVectorDatabase {
  private config: FeatureVectorDatabaseConfig;
  private healthMonitor: HealthMonitor;
  private index: {
    vectors: Float32Array[];
    ids: string[];
  };
  private metadataMap: Map<string, PatternMetadata> = new Map();
  private patternMap: Map<string, AudioPattern> = new Map();
  private indexDirty: boolean = false;

  constructor(
    config: FeatureVectorDatabaseConfig,
    healthMonitor: HealthMonitor
  ) {
    this.config = config;
    this.healthMonitor = healthMonitor;
    this.index = {
      vectors: [],
      ids: [],
    };
  }

  async initialize(): Promise<void> {
    try {
      // In a real implementation, you would use a vector database like FAISS
      // For now, we'll simulate the index
      this.index = {
        vectors: [] as Float32Array[],
        ids: [] as string[],
      };

      // Load existing index if configured to persist
      if (this.config.persistIndexOnDisk) {
        await this.loadIndexFromDisk();
      }

      this.healthMonitor.recordMetric("feature_db.initialized", {
        dimensions: this.config.dimensions,
        distanceMetric: this.config.distanceMetric,
      });
    } catch (error) {
      this.healthMonitor.recordMetric("feature_db.initialization.error", {
        error: String(error),
      });
      throw error;
    }
  }

  async addVector(
    patternId: string,
    vector: Float32Array,
    pattern: AudioPattern,
    metadata: PatternMetadata
  ): Promise<void> {
    try {
      // Store in our simulated index
      this.index.vectors.push(vector);
      this.index.ids.push(patternId);

      // Store metadata and pattern
      this.metadataMap.set(patternId, metadata);
      this.patternMap.set(patternId, pattern);

      this.indexDirty = true;

      this.healthMonitor.recordMetric("feature_db.vector.added", {
        patternId,
        vectorSize: vector.length,
      });

      // Periodically save index if configured
      if (
        this.config.persistIndexOnDisk &&
        this.indexDirty &&
        Math.random() < 0.1
      ) {
        await this.saveIndexToDisk();
      }
    } catch (error) {
      this.healthMonitor.recordMetric("feature_db.vector.add_error", {
        patternId,
        error: String(error),
      });
      throw error;
    }
  }

  async searchSimilar(
    queryVector: Float32Array,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    try {
      const results: VectorSearchResult[] = [];

      // In a real implementation, you would use the vector index search
      // For now, we'll do a linear search with cosine similarity
      for (let i = 0; i < this.index.vectors.length; i++) {
        const vector = this.index.vectors[i];
        const patternId = this.index.ids[i];

        // Calculate similarity
        const similarity = this.calculateCosineSimilarity(queryVector, vector);

        // Filter by threshold
        if (similarity >= options.similarityThreshold) {
          const result: VectorSearchResult = {
            patternId,
            similarity,
          };

          // Include pattern and metadata if requested
          if (options.includeMetadata) {
            result.pattern = this.patternMap.get(patternId);
            result.metadata = this.metadataMap.get(patternId);
          }

          results.push(result);
        }
      }

      // Sort by similarity (descending)
      results.sort((a, b) => b.similarity - a.similarity);

      // Limit results
      const limitedResults = results.slice(0, options.maxResults);

      this.healthMonitor.recordMetric("feature_db.search", {
        resultsCount: limitedResults.length,
        vectorSize: queryVector.length,
        threshold: options.similarityThreshold,
      });

      return limitedResults;
    } catch (error) {
      this.healthMonitor.recordMetric("feature_db.search.error", {
        error: String(error),
      });
      throw error;
    }
  }

  async getPattern(patternId: string): Promise<AudioPattern | null> {
    return this.patternMap.get(patternId) || null;
  }

  async getMetadata(patternId: string): Promise<PatternMetadata | null> {
    return this.metadataMap.get(patternId) || null;
  }

  async getPatternIds(): Promise<string[]> {
    return [...this.index.ids];
  }

  async removeVector(patternId: string): Promise<boolean> {
    try {
      // Find index of pattern
      const index = this.index.ids.indexOf(patternId);
      if (index === -1) {
        return false;
      }

      // Remove from vectors and ids
      this.index.vectors.splice(index, 1);
      this.index.ids.splice(index, 1);

      // Remove metadata and pattern
      this.metadataMap.delete(patternId);
      this.patternMap.delete(patternId);

      this.indexDirty = true;

      this.healthMonitor.recordMetric("feature_db.vector.removed", {
        patternId,
      });

      return true;
    } catch (error) {
      this.healthMonitor.recordMetric("feature_db.vector.remove_error", {
        patternId,
        error: String(error),
      });
      throw error;
    }
  }

  async saveIndexToDisk(): Promise<void> {
    if (!this.config.persistIndexOnDisk) return;

    try {
      // In a real implementation, you would serialize and save the index
      console.log(`Saving index to ${this.config.indexPath}`);

      this.indexDirty = false;

      this.healthMonitor.recordMetric("feature_db.index.saved", {
        vectorCount: this.index.ids.length,
        path: this.config.indexPath,
      });
    } catch (error) {
      this.healthMonitor.recordMetric("feature_db.index.save_error", {
        error: String(error),
      });
      throw error;
    }
  }

  async loadIndexFromDisk(): Promise<void> {
    if (!this.config.persistIndexOnDisk) return;

    try {
      // In a real implementation, you would load the serialized index
      console.log(`Loading index from ${this.config.indexPath}`);

      this.healthMonitor.recordMetric("feature_db.index.loaded", {
        path: this.config.indexPath,
      });
    } catch (error) {
      this.healthMonitor.recordMetric("feature_db.index.load_error", {
        error: String(error),
      });
      // Don't throw, start with empty index instead
      console.error("Failed to load index, starting with empty one", error);
    }
  }

  private calculateCosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error("Vector dimensions do not match");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}
