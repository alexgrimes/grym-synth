export interface Pattern {
  id: string;
  features: Map<string, FeatureValue>;
  confidence: number;
  timestamp: Date;
  metadata: {
    source: string;
    category: string;
    frequency: number;
    lastUpdated: Date;
  };
}

export type FeatureValue = number[] | number | string;

export interface AudioFeatureMetadata {
  type: string;
  dimensions: number[];
  sampleRate: number;
  duration: number;
  channels: number;
  format?: string;
  timeSteps?: number;
}

export interface AudioFeatureVector {
  features: Float32Array[];
  featureCount: number;
  timestamp: Date;
  metadata: AudioFeatureMetadata;
}

export interface ExtendedAudioProcessingOptions {
  sampleRate?: number;
  channels?: number;
  format?: "wav" | "mp3" | "ogg";
  quality?: number;
  extractFeatures?: boolean;
  featureLength?: number;
  windowSize?: number;
  hopSize?: number;
  normalize?: boolean;
  model?: {
    name: string;
    path?: string;
    settings?: Record<string, unknown>;
  };
}

export interface FeatureExtractionResult {
  features: AudioFeatureVector;
  confidence: number;
  processingTime: number;
}

export class FeatureMap extends Map<string, FeatureValue> {
  constructor(entries?: readonly (readonly [string, FeatureValue])[] | null) {
    super(entries);
  }

  set(key: string, value: FeatureValue): this {
    return super.set(key, value);
  }

  get(key: string): FeatureValue | undefined {
    return super.get(key);
  }
}

export interface StorageStats {
  patternCount: number;
  compressionRatio: number;
  lastOptimization?: Date;
  lastPersistence?: Date;
  memoryUsage: number;
  indexSize: number;
}

export interface SearchResult {
  success: boolean;
  data: Pattern[];
  confidence?: number;
  metrics: FeatureMemoryMetrics;
  error?: string;
}

export interface PatternMatchResult {
  success: boolean;
  matches: Pattern[];
  confidence: number;
  metrics: FeatureMemoryMetrics;
  systemMetrics: FeatureMemoryMetrics;
  error?: string;
}

export interface FeatureMemoryMetrics {
  operationLatency: number;
  patternRecognitionLatency: number;
  searchLatency: number;
  storageLatency: number;
  extractionLatency: number;
  memoryUsage: number;
  patternCount: number;
  cacheHitRate: number;
  errorCount: number;
  lastOperation: string;
  timestamp: Date;
  indexStats: {
    size: number;
    hitRate: number;
    missRate: number;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface FeatureProcessingMetadata {
  model: string;
  timestamp: Date;
  processingTime: number;
  inputFormat: string;
  outputFormat: string;
  dimensions: number[];
}

export interface StorageOperationResult<T> {
  success: boolean;
  data: T;
  error?: string;
  metrics: FeatureMemoryMetrics;
}

export interface AudioProcessingResult {
  features?: AudioFeatureVector;
  transcription?: string;
  confidence: number;
  metadata: {
    processingTime: number;
    model: string;
    timestamp: Date;
  };
}

// Re-export core audio types
export { AudioProcessingOptions, BasicFeatures } from "../../types/audio";
