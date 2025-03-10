import * as tf from '@tensorflow/tfjs';

// Custom types for TensorFlow.js extensions
export interface TFCallbackLogs {
  loss: number;  // Make loss required
  acc?: number;
  val_loss?: number;
  val_acc?: number;
  mae?: number;
  val_mae?: number;
}

export interface TFCallbackArgs {
  onEpochEnd?: (epoch: number, logs: TFCallbackLogs) => void | Promise<void>;
  onTrainEnd?: (logs?: TFCallbackLogs) => void | Promise<void>;
}

export interface TFSequentialModel extends tf.LayersModel {
  add(layer: tf.Layer): void;
  compile(args: {
    optimizer: tf.Optimizer;
    loss: string;
    metrics: string[];
  }): void;
  fit(
    x: tf.Tensor | tf.Tensor[],
    y: tf.Tensor | tf.Tensor[],
    args?: {
      batchSize?: number;
      epochs?: number;
      validationSplit?: number;
      callbacks?: tf.CallbackConfig[];
    }
  ): Promise<tf.History>;
  predict(x: tf.Tensor | tf.Tensor[]): tf.Tensor | tf.Tensor[];
}

export interface TFTensor extends tf.Tensor {
  array(): Promise<number[][]>;
}

export interface TrainingData {
  messageId: string;
  features: number[];
  label: number;  // Actual importance score
  metadata: {
    timestamp: Date;
    context: string[];
    userInteractions: UserInteraction[];
  }
}

export interface UserInteraction {
  type: 'view' | 'reference' | 'reaction';
  timestamp: Date;
  userId: string;
  metadata?: Record<string, unknown>;
}

// Add the missing ModelMetrics interface
export interface ModelMetrics {
  accuracy: number;
  loss: number;
  confidenceScore: number;
  featureImportance: Map<string, number>;
  val_accuracy?: number;
  val_loss?: number;
  epochs?: number;
  trainingTime?: number;
}

export interface TrainingMetrics {
  accuracy: number;
  loss: number;
  confidenceScore: number;
  featureImportance: Map<string, number>;
  mae?: number;
  val_mae?: number;
  val_loss?: number;
  val_accuracy?: number;
}

export interface TrainingCallback {
  onEpochEnd: (epoch: number, logs: TFCallbackLogs) => Promise<void>;
}

// Preprocessing interfaces
export interface PreprocessorConfig {
  missingValueStrategy: 'mean' | 'median' | 'mode' | 'constant';
  outlierDetectionMethod: 'zscore' | 'iqr';
  featureEngineeringConfig: {
    interactions: boolean;
    polynomialDegree: number;
  };
  normalizationMethod: 'standardization' | 'minmax';
}

export interface ProcessedData {
  processedFeatures: number[][];
  labels: number[];
  featureNames: string[];
  transformations: Map<string, any>;
}

export interface PreprocessingResult {
  processedData: ProcessedData;
  statistics: PreprocessingStatistics;
}

export interface PreprocessingStatistics {
  missingValues: {
    total: number;
    handledCount: number;
    strategy: string;
  };
  outliers: {
    detected: number;
    handled: number;
    method: string;
  };
  featureEngineering: {
    originalFeatures: number;
    engineeredFeatures: number;
    interactions: number;
  };
  normalization: {
    method: string;
    statistics: Map<string, { mean?: number; std?: number; min?: number; max?: number }>;
  };
}

export interface PipelineConfig {
  preprocessing: PreprocessorConfig;
  training: {
    batchSize: number;
    epochs: number;
    validationSplit: number;
    earlyStoppingPatience: number;
  };
  model: {
    layers: number[];
    dropoutRate: number;
    learningRate: number;
  };
}

export interface TrainingResult {
  model: TFSequentialModel;
  metrics: ModelMetrics;
  preprocessingStats: PreprocessingStatistics;
  trainingHistory: tf.History;
}

export interface PredictionResult {
  predictions: number[];
  confidenceScores: number[];
  featureContributions: Map<string, number>;
}

export interface ModelState {
  isReady: boolean;
  lastTrainingTime?: Date;
  totalExamples: number;
  modelVersion: string;
  preprocessingConfig: PreprocessorConfig;
}

// Error types
export class InsufficientDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientDataError';
  }
}

export class PreprocessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreprocessingError';
  }
}

export class ModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}