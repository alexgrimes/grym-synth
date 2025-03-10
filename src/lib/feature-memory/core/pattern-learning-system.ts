import { Wav2Vec2FeatureAdapter } from "./wav2vec2-feature-adapter";
import { PatternStorage } from "./pattern-storage";
import {
  Pattern,
  AudioFeatureVector,
  PatternMatchResult,
  FeatureValue,
} from "../interfaces";
import { MetricsCollector } from "./metrics-collector";
import { performance } from "perf_hooks";

export interface PatternRecognitionOptions {
  similarityThreshold: number;
  maxCandidates: number;
  timeout: number;
  featureWeights: Map<string, number>;
}

const DEFAULT_RECOGNITION_OPTIONS: Required<PatternRecognitionOptions> = {
  similarityThreshold: 0.8,
  maxCandidates: 5,
  timeout: 5000,
  featureWeights: new Map([["default", 1.0]]),
};

export class PatternLearningSystem {
  private metrics: MetricsCollector;
  private readonly options: Required<PatternRecognitionOptions>;

  constructor(
    private storage: PatternStorage,
    private wav2vec2: Wav2Vec2FeatureAdapter,
    options: Partial<PatternRecognitionOptions> = {}
  ) {
    this.options = { ...DEFAULT_RECOGNITION_OPTIONS, ...options };
    this.metrics = new MetricsCollector();
  }

  /**
   * Learn from audio data and store the resulting pattern
   */
  async learnFromAudio(
    audioData: Float32Array,
    metadata?: Partial<AudioFeatureVector["metadata"]>
  ): Promise<string> {
    const startTime = performance.now();
    this.metrics.startOperation("learnFromAudio");

    try {
      // Extract features using Wav2Vec2
      const extractionResult = await this.wav2vec2.extractFeatures(
        {
          data: audioData,
          sampleRate: 16000, // Default sample rate
          channels: 1,
          metadata: {
            duration: audioData.length / 16000,
            format: "wav",
            ...metadata,
          },
        },
        {
          featureLength: 768,
          normalization: true,
        }
      );

      // Create and store pattern
      const pattern = await this.createPattern(extractionResult.features);
      const storeResult = await this.storage.store(pattern);

      if (!storeResult.success) {
        throw new Error(storeResult.error || "Failed to store pattern");
      }

      return pattern.id;
    } catch (error) {
      this.metrics.recordError("learnFromAudio");
      throw error;
    } finally {
      this.metrics.endOperation("learnFromAudio");
    }
  }

  /**
   * Recognize patterns in audio data
   */
  async recognizePattern(audioData: Float32Array): Promise<{
    matched: boolean;
    patternId?: string;
    confidence: number;
  }> {
    const startTime = performance.now();
    this.metrics.startOperation("recognizePattern");

    try {
      // Extract features
      const extractionResult = await this.wav2vec2.extractFeatures(
        {
          data: audioData,
          sampleRate: 16000,
          channels: 1,
          metadata: {
            duration: audioData.length / 16000,
            format: "wav",
          },
        },
        {
          featureLength: 768,
          normalization: true,
        }
      );

      // Find similar patterns
      const searchResult = await this.storage.findSimilar(
        extractionResult.features,
        this.options.maxCandidates
      );

      if (!searchResult.success || searchResult.matches.length === 0) {
        return {
          matched: false,
          confidence: 0,
        };
      }

      // Get best match
      const bestMatch = searchResult.matches[0];
      const confidence = searchResult.confidence;

      return {
        matched: confidence >= this.options.similarityThreshold,
        patternId: bestMatch.id,
        confidence,
      };
    } catch (error) {
      this.metrics.recordError("recognizePattern");
      throw error;
    } finally {
      this.metrics.endOperation("recognizePattern");
    }
  }

  /**
   * Create a pattern from extracted features
   */
  private async createPattern(
    features: AudioFeatureVector,
    metadata?: Partial<Pattern["metadata"]>
  ): Promise<Pattern> {
    const confidence = await this.calculateInitialConfidence(features);

    return {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      features: new Map<string, FeatureValue>([
        [
          "featureData",
          Array.from(features.features).reduce((acc: number[], curr) => {
            acc.push(...Array.from(curr));
            return acc;
          }, []),
        ],
        ["dimensions", features.metadata.dimensions],
        ["timeSteps", [features.metadata.timeSteps || features.featureCount]],
        ["sampleRate", [features.metadata.sampleRate]],
        ["duration", [features.metadata.duration]],
        ["channels", [features.metadata.channels]],
      ]),
      confidence,
      timestamp: new Date(),
      metadata: {
        source: "wav2vec2",
        category: "audio",
        frequency: 1,
        lastUpdated: new Date(),
        ...metadata,
      },
    };
  }

  /**
   * Calculate initial confidence score for a pattern
   */
  private async calculateInitialConfidence(
    features: AudioFeatureVector
  ): Promise<number> {
    // Use feature statistics to estimate confidence
    let totalEnergy = 0;
    let totalVariance = 0;

    for (const frame of features.features) {
      const mean = frame.reduce((sum, val) => sum + val, 0) / frame.length;
      const variance =
        frame.reduce((sum, val) => sum + (val - mean) ** 2, 0) / frame.length;

      totalEnergy += mean;
      totalVariance += variance;
    }

    const avgEnergy = totalEnergy / features.featureCount;
    const avgVariance = totalVariance / features.featureCount;

    // Normalize confidence score between 0 and 1
    const energyScore = Math.min(1, avgEnergy / 10);
    const varianceScore = Math.min(1, avgVariance * 10);

    // Weight the scores (energy is more important than variance)
    return energyScore * 0.7 + varianceScore * 0.3;
  }
}
