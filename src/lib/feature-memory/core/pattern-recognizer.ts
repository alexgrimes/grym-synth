import {
  Pattern,
  FeatureValue,
  PatternMatchResult,
  FeatureMemoryMetrics,
} from "../interfaces";
import { MetricsCollector } from "./metrics-collector";

export interface RecognizerOptions {
  similarityThreshold: number;
  maxCandidates: number;
  useFeatureWeighting: boolean;
  confidenceThreshold: number;
}

export interface SimilarityScore {
  pattern: Pattern;
  score: number;
  confidence: number;
}

const DEFAULT_OPTIONS: RecognizerOptions = {
  similarityThreshold: 0.8,
  maxCandidates: 10,
  useFeatureWeighting: true,
  confidenceThreshold: 0.6,
};

export class PatternRecognizer {
  private options: RecognizerOptions;
  private metrics: MetricsCollector;
  private featureWeights: Map<string, number>;

  constructor(
    options: Partial<RecognizerOptions> = {},
    metrics?: MetricsCollector
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.metrics = metrics || new MetricsCollector();
    this.featureWeights = new Map();
    this.initializeFeatureWeights();
  }

  private initializeFeatureWeights(): void {
    // Initialize default feature weights
    this.featureWeights.set("featureData", 1.0);
    this.featureWeights.set("dimensions", 0.5);
    this.featureWeights.set("sampleRate", 0.3);
    this.featureWeights.set("duration", 0.4);
    this.featureWeights.set("channels", 0.2);
  }

  public async recognizePattern(
    features: Map<string, FeatureValue>,
    candidates: Pattern[]
  ): Promise<PatternMatchResult> {
    this.metrics.startOperation("recognizePattern");

    try {
      const similarities: SimilarityScore[] = [];

      for (const pattern of candidates) {
        const score = this.calculateSimilarity(features, pattern.features);
        if (score >= this.options.similarityThreshold) {
          similarities.push({
            pattern,
            score,
            confidence: this.calculateConfidence(score, pattern),
          });
        }
      }

      // Sort by score and take top matches
      similarities.sort((a, b) => b.score - a.score);
      const topMatches = similarities.slice(0, this.options.maxCandidates);

      // Filter by confidence threshold
      const matches = topMatches.filter(
        (m) => m.confidence >= this.options.confidenceThreshold
      );

      const bestConfidence =
        matches.length > 0 ? Math.max(...matches.map((m) => m.confidence)) : 0;

      return {
        success: true,
        matches: matches.map((m) => m.pattern),
        confidence: bestConfidence,
        metrics: this.metrics.getMetrics(),
        systemMetrics: this.metrics.getMetrics(),
      };
    } catch (error) {
      this.metrics.recordError("recognizePattern");
      return {
        success: false,
        matches: [],
        confidence: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: this.metrics.getMetrics(),
        systemMetrics: this.metrics.getMetrics(),
      };
    } finally {
      this.metrics.endOperation("recognizePattern");
    }
  }

  private calculateSimilarity(
    features1: Map<string, FeatureValue>,
    features2: Map<string, FeatureValue>
  ): number {
    let totalWeight = 0;
    let weightedSimilarity = 0;

    for (const [key, weight] of this.featureWeights) {
      if (features1.has(key) && features2.has(key)) {
        const value1 = features1.get(key)!;
        const value2 = features2.get(key)!;

        const featureSimilarity = this.compareValues(value1, value2);
        weightedSimilarity += featureSimilarity * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? weightedSimilarity / totalWeight : 0;
  }

  private compareValues(value1: FeatureValue, value2: FeatureValue): number {
    if (Array.isArray(value1) && Array.isArray(value2)) {
      return this.compareArrays(value1, value2);
    }
    if (typeof value1 === "number" && typeof value2 === "number") {
      return this.compareNumbers(value1, value2);
    }
    return value1 === value2 ? 1 : 0;
  }

  private compareArrays(arr1: number[], arr2: number[]): number {
    if (arr1.length !== arr2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < arr1.length; i++) {
      dotProduct += arr1[i] * arr2[i];
      norm1 += arr1[i] * arr1[i];
      norm2 += arr2[i] * arr2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private compareNumbers(num1: number, num2: number): number {
    const maxDiff = Math.max(Math.abs(num1), Math.abs(num2)) * 0.1;
    const actualDiff = Math.abs(num1 - num2);
    return Math.max(0, 1 - actualDiff / maxDiff);
  }

  private calculateConfidence(similarity: number, pattern: Pattern): number {
    // Combine similarity score with pattern's inherent confidence
    const patternConfidence = pattern.confidence;
    const temporalFactor = this.calculateTemporalFactor(pattern.timestamp);

    return similarity * 0.6 + patternConfidence * 0.3 + temporalFactor * 0.1;
  }

  private calculateTemporalFactor(timestamp: Date): number {
    const age = Date.now() - timestamp.getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    return Math.max(0, 1 - age / maxAge);
  }

  public updateFeatureWeight(feature: string, weight: number): void {
    if (weight >= 0 && weight <= 1) {
      this.featureWeights.set(feature, weight);
    }
  }

  public getFeatureWeights(): Map<string, number> {
    return new Map(this.featureWeights);
  }
}
