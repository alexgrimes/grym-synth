import { KDTree } from "./indexing/kd-tree";
import { LRUCache } from "./lru-cache";
import {
  Pattern,
  AudioFeatureVector,
  StorageStats,
  StorageOperationResult,
  FeatureMemoryMetrics,
  PatternMatchResult,
} from "../interfaces";
import { MetricsCollector } from "./metrics-collector";
import { performance } from "perf_hooks";

export interface PatternStorageOptions {
  maxPatterns: number;
  persistenceEnabled: boolean;
  compressionEnabled: boolean;
  indexingStrategy: "kd-tree" | "lsh" | "faiss";
}

const DEFAULT_OPTIONS: Required<PatternStorageOptions> = {
  maxPatterns: 10000,
  persistenceEnabled: false,
  compressionEnabled: false,
  indexingStrategy: "kd-tree",
};

export class PatternStorage {
  private patterns: Map<string, Pattern>;
  private indexStructure: KDTree;
  private cache: LRUCache<string, Pattern>;
  private metrics: MetricsCollector;
  private readonly options: Required<PatternStorageOptions>;

  constructor(options: Partial<PatternStorageOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.patterns = new Map();
    this.indexStructure = new KDTree(768); // Default feature dimension
    this.cache = new LRUCache(this.options.maxPatterns);
    this.metrics = new MetricsCollector();
  }

  /**
   * Store a new pattern in the storage system
   */
  async store(pattern: Pattern): Promise<StorageOperationResult<Pattern>> {
    const startTime = performance.now();
    this.metrics.startOperation("store");

    try {
      // Convert pattern features to array format for KD-Tree
      const featureArray = this.patternToFeatureArray(pattern);

      // Store in primary storage
      this.patterns.set(pattern.id, pattern);

      // Add to index
      this.indexStructure.insert(featureArray, pattern.id);

      // Update cache
      this.cache.set(pattern.id, pattern);

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        data: pattern,
        metrics: this.createMetrics(processingTime),
      };
    } catch (error) {
      this.metrics.recordError("store");
      return {
        success: false,
        data: pattern,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during storage",
        metrics: this.createMetrics(performance.now() - startTime),
      };
    } finally {
      this.metrics.endOperation("store");
    }
  }

  /**
   * Retrieve a pattern by its ID
   */
  async retrieve(id: string): Promise<StorageOperationResult<Pattern | null>> {
    const startTime = performance.now();
    this.metrics.startOperation("retrieve");

    try {
      // Check cache first
      let pattern = this.cache.get(id);

      if (!pattern) {
        // Check primary storage
        pattern = this.patterns.get(id) || null;

        // Update cache if found
        if (pattern) {
          this.cache.set(id, pattern);
        }
      }

      return {
        success: true,
        data: pattern,
        metrics: this.createMetrics(performance.now() - startTime),
      };
    } catch (error) {
      this.metrics.recordError("retrieve");
      return {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during retrieval",
        metrics: this.createMetrics(performance.now() - startTime),
      };
    } finally {
      this.metrics.endOperation("retrieve");
    }
  }

  /**
   * Find patterns similar to the provided feature vector
   */
  async findSimilar(
    features: AudioFeatureVector,
    limit: number
  ): Promise<PatternMatchResult> {
    const startTime = performance.now();
    this.metrics.startOperation("findSimilar");

    try {
      // Convert features to array format
      const featureArray = this.featureVectorToArray(features);

      // Find nearest neighbors
      const nearest = this.indexStructure.findNearest(featureArray, limit);

      // Retrieve full patterns
      const matches = await Promise.all(
        nearest.map(async ([distance, id]) => {
          const result = await this.retrieve(id as string);
          return result.data!;
        })
      );

      // Calculate average confidence
      const confidence =
        matches.reduce((sum, p) => sum + p.confidence, 0) / matches.length;

      return {
        success: true,
        matches,
        confidence,
        metrics: this.createMetrics(performance.now() - startTime),
        systemMetrics: this.createMetrics(performance.now() - startTime),
      };
    } catch (error) {
      this.metrics.recordError("findSimilar");
      return {
        success: false,
        matches: [],
        confidence: 0,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during similarity search",
        metrics: this.createMetrics(performance.now() - startTime),
        systemMetrics: this.createMetrics(performance.now() - startTime),
      };
    } finally {
      this.metrics.endOperation("findSimilar");
    }
  }

  /**
   * Update an existing pattern
   */
  async update(
    id: string,
    updates: Partial<Pattern>
  ): Promise<StorageOperationResult<Pattern>> {
    const startTime = performance.now();
    this.metrics.startOperation("update");

    try {
      const existing = await this.retrieve(id);
      if (!existing.success || !existing.data) {
        throw new Error(`Pattern with id ${id} not found`);
      }

      const updated = { ...existing.data, ...updates };

      // Remove old index entry
      // Note: This is a simplified approach. A proper implementation would
      // need to handle removing the old entry from the KD-tree

      // Add new entry
      await this.store(updated);

      return {
        success: true,
        data: updated,
        metrics: this.createMetrics(performance.now() - startTime),
      };
    } catch (error) {
      this.metrics.recordError("update");
      return {
        success: false,
        data: updates as Pattern,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during update",
        metrics: this.createMetrics(performance.now() - startTime),
      };
    } finally {
      this.metrics.endOperation("update");
    }
  }

  /**
   * Delete a pattern from storage
   */
  async delete(id: string): Promise<StorageOperationResult<boolean>> {
    const startTime = performance.now();
    this.metrics.startOperation("delete");

    try {
      const pattern = this.patterns.get(id);
      if (!pattern) {
        return {
          success: false,
          data: false,
          error: `Pattern with id ${id} not found`,
          metrics: this.createMetrics(performance.now() - startTime),
        };
      }

      // Remove from primary storage
      this.patterns.delete(id);

      // Remove from cache
      this.cache.delete(id);

      // Note: Removing from KD-tree is not implemented as it would require
      // rebuilding the tree. In a production system, we'd either implement
      // proper removal or use a different data structure that supports deletion.

      return {
        success: true,
        data: true,
        metrics: this.createMetrics(performance.now() - startTime),
      };
    } catch (error) {
      this.metrics.recordError("delete");
      return {
        success: false,
        data: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during deletion",
        metrics: this.createMetrics(performance.now() - startTime),
      };
    } finally {
      this.metrics.endOperation("delete");
    }
  }

  /**
   * Get current storage statistics
   */
  getStats(): StorageStats {
    return {
      patternCount: this.patterns.size,
      compressionRatio: this.options.compressionEnabled ? 0.5 : 1, // Placeholder
      memoryUsage: process.memoryUsage().heapUsed,
      indexSize: this.indexStructure.size(),
    };
  }

  /**
   * Convert a pattern's features to an array format suitable for the KD-tree
   */
  private patternToFeatureArray(pattern: Pattern): number[] {
    const featureData = pattern.features.get("featureData");
    if (!Array.isArray(featureData)) {
      throw new Error("Invalid feature data format");
    }
    return featureData;
  }

  /**
   * Convert an AudioFeatureVector to an array format suitable for the KD-tree
   */
  private featureVectorToArray(features: AudioFeatureVector): number[] {
    // Convert Float32Array[] to number[]
    const result: number[] = [];
    for (const feature of features.features) {
      for (let i = 0; i < feature.length; i++) {
        result.push(feature[i]);
      }
    }
    return result;
  }

  /**
   * Create metrics object for operation results
   */
  private createMetrics(latency: number): FeatureMemoryMetrics {
    return {
      operationLatency: latency,
      patternRecognitionLatency: latency,
      searchLatency: latency,
      storageLatency: latency,
      extractionLatency: latency,
      memoryUsage: process.memoryUsage().heapUsed,
      patternCount: this.patterns.size,
      cacheHitRate: this.cache.getHitRate(),
      errorCount: 0,
      lastOperation: this.metrics.getLastOperation() || "",
      timestamp: new Date(),
      indexStats: {
        size: this.indexStructure.size(),
        hitRate: 1.0,
        missRate: 0.0,
      },
      resourceUsage: {
        cpu: 0,
        memory: process.memoryUsage().heapUsed,
        disk: 0,
      },
    };
  }
}
