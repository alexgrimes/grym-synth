import { Wav2Vec2Adapter } from "../../../adapters/Wav2Vec2Adapter";
import { AudioTask, TaskType } from "../../../interfaces/tasks";
import { SimpleAudioBuffer } from "../../../interfaces/audio";
import { MetricsCollector } from "./metrics-collector";
import { HealthMonitor } from "./health-monitor";
import {
  Pattern,
  AudioFeatureVector,
  ExtendedAudioProcessingOptions,
  FeatureExtractionResult,
  FeatureMap,
  AudioFeatureMetadata,
  AudioProcessingResult,
} from "../interfaces";
import { performance } from "perf_hooks";

const DEFAULT_OPTIONS: Required<ExtendedAudioProcessingOptions> = {
  sampleRate: 16000,
  channels: 1,
  format: "wav",
  quality: 1,
  extractFeatures: true,
  featureLength: 768,
  windowSize: 512,
  hopSize: 256,
  normalize: true,
  model: {
    name: "wav2vec2",
    settings: {},
  },
};

export interface FeatureExtractionOptions {
  featureLength: number;
  normalization: boolean;
  dimensionalityReduction?: "pca" | "tsne" | "none";
}

export class Wav2Vec2FeatureAdapter extends Wav2Vec2Adapter {
  private metrics: MetricsCollector;
  private healthMonitor: HealthMonitor;
  private readonly options: Required<ExtendedAudioProcessingOptions>;
  private featureCache: Map<string, AudioFeatureVector>;

  constructor(config: {
    maxMemory: string;
    modelPath?: string;
    options?: Partial<ExtendedAudioProcessingOptions>;
  }) {
    super(config);
    this.options = { ...DEFAULT_OPTIONS, ...config.options };
    this.metrics = new MetricsCollector();
    this.healthMonitor = new HealthMonitor(this.metrics);
    this.featureCache = new Map();
  }

  /**
   * Normalize feature vectors for consistent comparison
   * @param features Feature vector to normalize
   * @returns Normalized feature vector
   */
  normalizeFeatures(features: Float32Array): Float32Array {
    const normalizedFeatures = new Float32Array(features.length);

    // Calculate mean and standard deviation
    let sum = 0;
    let sumSquared = 0;

    for (let i = 0; i < features.length; i++) {
      sum += features[i];
      sumSquared += features[i] * features[i];
    }

    const mean = sum / features.length;
    const variance = sumSquared / features.length - mean * mean;
    const stdDev = Math.sqrt(variance);

    // Apply z-score normalization
    for (let i = 0; i < features.length; i++) {
      normalizedFeatures[i] = (features[i] - mean) / (stdDev || 1);
    }

    return normalizedFeatures;
  }

  /**
   * Extract feature vectors from audio data for pattern recognition
   * This method supports both SimpleAudioBuffer and Web Audio API's AudioBuffer
   */
  async extractFeatures(
    audio: SimpleAudioBuffer | AudioBuffer,
    options: FeatureExtractionOptions = {
      featureLength: 768,
      normalization: true,
    }
  ): Promise<FeatureExtractionResult> {
    this.metrics.startOperation("extractFeatures");
    const startTime = performance.now();

    try {
      let simpleAudio: SimpleAudioBuffer;

      // Convert input to SimpleAudioBuffer format
      if (this.isSimpleAudioBuffer(audio)) {
        simpleAudio = audio;
        if (!simpleAudio.metadata?.duration) {
          throw new Error(
            "Missing audio duration in metadata for SimpleAudioBuffer"
          );
        }
      } else {
        simpleAudio = {
          data: audio.getChannelData(0),
          sampleRate: audio.sampleRate,
          channels: audio.numberOfChannels,
          metadata: {
            duration: audio.duration,
            format: "wav",
          },
        };
      }

      const task: AudioTask = {
        id: `feat_${Date.now()}`,
        type: TaskType.AUDIO_ANALYZE,
        timestamp: Date.now(),
        data: {
          audio: simpleAudio,
          options: {
            ...this.options,
            model: {
              name: "wav2vec2",
              settings: {
                extractFeatures: true,
                featureLength:
                  options.featureLength || this.options.featureLength,
              },
            },
          },
        },
      };

      const result = await this.handleTask(task);

      if (!result.success || !result.data?.analysis?.features) {
        throw new Error("Feature extraction failed");
      }

      // We've already validated metadata exists and has required fields
      const metadata = simpleAudio.metadata!;

      // Ensure featureLength is defined
      const featureLength = options.featureLength ?? this.options.featureLength;

      // Get the feature count from analysis result
      const featureCount = result.data.analysis.features.length;

      // Ensure we have a valid duration
      const duration =
        metadata.duration || simpleAudio.data.length / simpleAudio.sampleRate;

      // Create feature metadata with the normalized audio properties
      const featureMetadata: AudioFeatureMetadata = {
        type: "wav2vec2_features",
        dimensions: [featureCount, featureLength],
        sampleRate: simpleAudio.sampleRate,
        duration: duration,
        channels: simpleAudio.channels,
        format: metadata.format || "wav", // Provide default if not specified
      };

      // Only add timeSteps if we have features
      if (featureCount > 0) {
        featureMetadata.timeSteps = featureCount;
      }

      const featureVector: AudioFeatureVector = {
        features: result.data.analysis.features,
        featureCount: result.data.analysis.features.length,
        timestamp: new Date(),
        metadata: featureMetadata,
      };

      const confidence = this.calculateConfidence(featureVector);

      if (confidence < this.options.quality) {
        throw new Error(`Low confidence score: ${confidence}`);
      }

      const cacheKey = this.generateCacheKey(simpleAudio);
      this.featureCache.set(cacheKey, featureVector);

      const processingTime = performance.now() - startTime;
      this.metrics.recordLatency("extractFeatures", processingTime);

      return {
        features: featureVector,
        confidence,
        processingTime,
      };
    } catch (error) {
      this.metrics.recordError("extractFeatures");
      throw error;
    } finally {
      this.metrics.endOperation("extractFeatures");
    }
  }

  /**
   * Calculate similarity between two feature vectors
   */
  async calculateSimilarity(
    features1: AudioFeatureVector,
    features2: AudioFeatureVector
  ): Promise<number> {
    this.metrics.startOperation("calculateSimilarity");

    try {
      if (features1.featureCount !== features2.featureCount) {
        throw new Error("Feature vectors have different lengths");
      }

      let totalSimilarity = 0;

      for (let i = 0; i < features1.featureCount; i++) {
        const frame1 = features1.features[i];
        const frame2 = features2.features[i];

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let j = 0; j < frame1.length; j++) {
          dotProduct += frame1[j] * frame2[j];
          norm1 += frame1[j] * frame1[j];
          norm2 += frame2[j] * frame2[j];
        }

        totalSimilarity += dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      }

      const avgSimilarity = totalSimilarity / features1.featureCount;
      return Math.max(0, Math.min(1, avgSimilarity));
    } finally {
      this.metrics.endOperation("calculateSimilarity");
    }
  }

  async createPattern(features: AudioFeatureVector): Promise<Pattern> {
    const serializedFeatures = features.features.map((frame) =>
      Array.from(frame)
    );
    const dimensions = features.metadata.dimensions;
    const timeSteps = features.metadata.timeSteps || features.featureCount;

    const featureEntries: [string, number[]][] = [
      ["featureData", serializedFeatures.flat()],
      ["dimensions", dimensions],
      ["timeSteps", [timeSteps]],
      ["sampleRate", [features.metadata.sampleRate]],
      ["duration", [features.metadata.duration]],
      ["channels", [features.metadata.channels]],
    ];

    return {
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      features: new FeatureMap(featureEntries),
      confidence: this.calculateConfidence(features),
      timestamp: features.timestamp,
      metadata: {
        source: "wav2vec2",
        category: "audio",
        frequency: 1,
        lastUpdated: new Date(),
      },
    };
  }

  private calculateConfidence(features: AudioFeatureVector): number {
    let totalEnergy = 0;
    let totalVariance = 0;

    for (const frame of features.features) {
      const energy = frame.reduce(
        (sum: number, val: number) => sum + val * val,
        0
      );
      totalEnergy += energy;

      const mean = energy / frame.length;
      const variance =
        frame.reduce(
          (sum: number, val: number) => sum + Math.pow(val - mean, 2),
          0
        ) / frame.length;
      totalVariance += variance;
    }

    const avgEnergy = totalEnergy / features.featureCount;
    const avgVariance = totalVariance / features.featureCount;

    const energyScore = Math.min(1, avgEnergy / 10);
    const varianceScore = Math.min(1, avgVariance * 10);

    return energyScore * 0.7 + varianceScore * 0.3;
  }

  private isSimpleAudioBuffer(
    audio: SimpleAudioBuffer | AudioBuffer
  ): audio is SimpleAudioBuffer {
    return "data" in audio && "channels" in audio && "metadata" in audio;
  }

  private generateCacheKey(audio: SimpleAudioBuffer | AudioBuffer): string {
    if (this.isSimpleAudioBuffer(audio)) {
      if (!audio.metadata?.duration) {
        throw new Error("Missing audio duration in metadata");
      }
      return `${audio.sampleRate}_${audio.metadata.duration}_${Date.now()}`;
    } else {
      return `${audio.sampleRate}_${audio.duration}_${Date.now()}`;
    }
  }

  async dispose(): Promise<void> {
    this.featureCache.clear();
    await super.dispose();
  }
}
