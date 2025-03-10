import { AudioPattern, PatternMetadata, PatternQuery } from "../../types/audio";
import {
  FeatureVectorDatabase,
  VectorSearchOptions,
} from "./FeatureVectorDatabase";
import { HealthMonitor } from "../../monitoring/HealthMonitor";

export interface PatternRepositoryConfig {
  vectorDimensions: number;
  similarityThreshold: number;
  maxQueryResults: number;
}

export class PatternRepository {
  private vectorDb: FeatureVectorDatabase;
  private healthMonitor: HealthMonitor;
  private config: PatternRepositoryConfig;

  constructor(
    vectorDb: FeatureVectorDatabase,
    healthMonitor: HealthMonitor,
    config: PatternRepositoryConfig
  ) {
    this.vectorDb = vectorDb;
    this.healthMonitor = healthMonitor;
    this.config = config;
  }

  async initialize(): Promise<void> {
    await this.vectorDb.initialize();
  }

  async storePattern(
    pattern: AudioPattern,
    metadata: PatternMetadata
  ): Promise<string> {
    try {
      if (!pattern.id) {
        pattern.id = crypto.randomUUID();
      }

      if (!pattern.features || pattern.features.length === 0) {
        throw new Error("Pattern has no feature vector");
      }

      // Store in vector database
      await this.vectorDb.addVector(
        pattern.id,
        pattern.features,
        pattern,
        metadata
      );

      this.healthMonitor.recordMetric("repository.pattern.stored", {
        patternId: pattern.id,
        type: pattern.type,
      });

      return pattern.id;
    } catch (error) {
      this.healthMonitor.recordMetric("repository.pattern.store_error", {
        error: String(error),
      });
      throw error;
    }
  }

  async findSimilarPatterns(
    featureVector: Float32Array,
    options?: Partial<VectorSearchOptions>
  ): Promise<AudioPattern[]> {
    try {
      const searchOptions: VectorSearchOptions = {
        similarityThreshold:
          options?.similarityThreshold || this.config.similarityThreshold,
        maxResults: options?.maxResults || this.config.maxQueryResults,
        includeMetadata: true,
      };

      const results = await this.vectorDb.searchSimilar(
        featureVector,
        searchOptions
      );

      // Extract patterns from results
      const patterns = results
        .filter((result) => result.pattern !== undefined)
        .map((result) => result.pattern!);

      this.healthMonitor.recordMetric("repository.similar.found", {
        count: patterns.length,
        threshold: searchOptions.similarityThreshold,
      });

      return patterns;
    } catch (error) {
      this.healthMonitor.recordMetric("repository.similar.find_error", {
        error: String(error),
      });
      throw error;
    }
  }

  async getPatternById(id: string): Promise<AudioPattern | null> {
    try {
      const pattern = await this.vectorDb.getPattern(id);

      if (pattern) {
        this.healthMonitor.recordMetric("repository.pattern.retrieved", {
          patternId: id,
        });
      }

      return pattern;
    } catch (error) {
      this.healthMonitor.recordMetric("repository.pattern.get_error", {
        patternId: id,
        error: String(error),
      });
      throw error;
    }
  }

  async queryPatterns(query: PatternQuery): Promise<AudioPattern[]> {
    try {
      const patterns: AudioPattern[] = [];

      // Get all patterns that match the query criteria
      const allPatterns = await this.getAllPatterns();

      // Apply filters
      for (const pattern of allPatterns) {
        if (this.matchesQuery(pattern, query)) {
          patterns.push(pattern);
        }
      }

      // Apply sorting
      if (query.sortBy) {
        this.sortPatterns(patterns, query.sortBy, query.sortDirection);
      }

      // Apply limit
      const limitedPatterns = query.limit
        ? patterns.slice(0, query.limit)
        : patterns;

      this.healthMonitor.recordMetric("repository.patterns.queried", {
        criteria: Object.keys(query).join(","),
        resultCount: limitedPatterns.length,
      });

      return limitedPatterns;
    } catch (error) {
      this.healthMonitor.recordMetric("repository.patterns.query_error", {
        error: String(error),
      });
      throw error;
    }
  }

  async updatePattern(
    id: string,
    updates: Partial<AudioPattern>
  ): Promise<boolean> {
    try {
      // Get current pattern
      const pattern = await this.vectorDb.getPattern(id);
      if (!pattern) {
        return false;
      }

      // Create updated pattern
      const updatedPattern = {
        ...pattern,
        ...updates,
        id: pattern.id, // Ensure ID doesn't change
      };

      // Get current metadata
      const metadata = (await this.vectorDb.getMetadata(id)) || {
        sourceId: "unknown",
        createdAt: new Date(),
        lastModified: new Date(),
      };

      // Update last modified timestamp
      const updatedMetadata = {
        ...metadata,
        lastModified: new Date(),
      };

      // Remove old vector and store updated one
      await this.vectorDb.removeVector(id);
      await this.vectorDb.addVector(
        id,
        updatedPattern.features,
        updatedPattern,
        updatedMetadata
      );

      this.healthMonitor.recordMetric("repository.pattern.updated", {
        patternId: id,
        updatedFields: Object.keys(updates).join(","),
      });

      return true;
    } catch (error) {
      this.healthMonitor.recordMetric("repository.pattern.update_error", {
        patternId: id,
        error: String(error),
      });
      throw error;
    }
  }

  async deletePattern(id: string): Promise<boolean> {
    try {
      const success = await this.vectorDb.removeVector(id);

      if (success) {
        this.healthMonitor.recordMetric("repository.pattern.deleted", {
          patternId: id,
        });
      }

      return success;
    } catch (error) {
      this.healthMonitor.recordMetric("repository.pattern.delete_error", {
        patternId: id,
        error: String(error),
      });
      throw error;
    }
  }

  // Private helper methods

  private async getAllPatterns(): Promise<AudioPattern[]> {
    const patterns: AudioPattern[] = [];
    const ids = await this.vectorDb.getPatternIds();

    for (const id of ids) {
      const pattern = await this.vectorDb.getPattern(id);
      if (pattern) {
        patterns.push(pattern);
      }
    }
    return patterns;
  }

  private matchesQuery(pattern: AudioPattern, query: PatternQuery): boolean {
    // Type filter
    if (query.type && pattern.type !== query.type) {
      return false;
    }

    // Time range filter
    if (query.timeRange) {
      const { min, max } = query.timeRange;
      if (pattern.endTime < min || pattern.startTime > max) {
        return false;
      }
    }

    // Frequency range filter
    if (query.frequencyRange) {
      const { min, max } = query.frequencyRange;
      if (
        pattern.frequencyRange.high < min ||
        pattern.frequencyRange.low > max
      ) {
        return false;
      }
    }

    // Confidence threshold filter
    if (
      query.confidenceThreshold !== undefined &&
      pattern.confidence < query.confidenceThreshold
    ) {
      return false;
    }

    return true;
  }

  private sortPatterns(
    patterns: AudioPattern[],
    sortBy: "startTime" | "endTime" | "confidence",
    direction: "asc" | "desc" = "asc"
  ): void {
    patterns.sort((a, b) => {
      let comparison: number;

      switch (sortBy) {
        case "startTime":
          comparison = a.startTime - b.startTime;
          break;
        case "endTime":
          comparison = a.endTime - b.endTime;
          break;
        case "confidence":
          comparison = a.confidence - b.confidence;
          break;
        default:
          comparison = 0;
      }

      return direction === "asc" ? comparison : -comparison;
    });
  }
}
