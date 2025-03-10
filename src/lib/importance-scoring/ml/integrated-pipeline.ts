import * as tf from '@tensorflow/tfjs';
import { EventEmitter } from 'events';
import {
  PipelineConfig,
  TrainingMetrics,
  PreprocessingError,
  ModelError,
  ValidationError,
  TFCallbackLogs,
  TFSequentialModel,
  TFCallbackArgs,
  TFTensor
} from './types';
import { AdvancedPreprocessor } from './advanced-preprocessor';

interface TensorData {
  features: tf.Tensor2D;
  labels: tf.Tensor2D;
}

export class IntegratedMLPipeline extends EventEmitter {
  private preprocessor: AdvancedPreprocessor;
  private model: TFSequentialModel | null;
  private pipelineState: {
    preprocessedData: any;
    features: string[];
    transformations: Map<string, any>;
  };
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    super();
    this.validateConfig(config);
    this.config = config;
    this.preprocessor = new AdvancedPreprocessor(config.preprocessing);
    this.model = null;
    this.pipelineState = {
      preprocessedData: null,
      features: [],
      transformations: new Map()
    };
  }

  private validateConfig(config: PipelineConfig): void {
    if (!config.preprocessing || !config.training || !config.model) {
      throw new ValidationError('Invalid pipeline configuration: missing required sections');
    }
    if (!Array.isArray(config.model.layers) || config.model.layers.length === 0) {
      throw new ValidationError('Invalid model configuration: layers must be a non-empty array');
    }
  }

  async train(rawData: any[]): Promise<{
    model: TFSequentialModel;
    metrics: TrainingMetrics;
  }> {
    try {
      // 1. Preprocess Data
      const preprocessed = await this.preprocessor.preprocessFeatures(rawData);
      this.pipelineState = {
        preprocessedData: preprocessed.processedData,
        features: preprocessed.processedData.featureNames,
        transformations: preprocessed.processedData.transformations
      };

      // 2. Convert to tensors
      const tensors = await this.convertToTensors(preprocessed.processedData);

      // 3. Create and train model
      this.model = await this.createModel(
        tensors.features.shape[1],
        this.config.model
      );

      // 4. Train model
      const trainingMetrics = await this.trainModel(tensors);

      return {
        model: this.model,
        metrics: trainingMetrics
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error instanceof PreprocessingError) {
          throw error;
        }
        throw new ModelError(`Training pipeline error: ${error.message}`);
      }
      throw new ModelError('Training pipeline failed with an unknown error');
    }
  }

  async predict(newData: any[]): Promise<number[]> {
    try {
      if (!this.model) {
        throw new ModelError('Model not trained. Call train() first.');
      }

      // 1. Preprocess using saved transformations
      const preprocessed = await this.applyPreprocessing(newData);

      // 2. Convert to tensor
      const tensor = await this.convertToTensors(preprocessed);

      // 3. Get predictions
      const predictions = this.model.predict(tensor.features) as TFTensor;

      // 4. Post-process predictions
      const processedPredictions = await this.postProcessPredictions(predictions);

      return processedPredictions;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new ModelError(`Prediction error: ${error.message}`);
      }
      throw new ModelError('Prediction failed with an unknown error');
    }
  }

  private async createModel(
    inputFeatures: number,
    config: PipelineConfig['model']
  ): Promise<TFSequentialModel> {
    const model = tf.sequential() as TFSequentialModel;

    // Input layer
    model.add(tf.layers.dense({
      units: config.layers[0],
      activation: 'relu',
      inputShape: [inputFeatures]
    }));

    // Hidden layers
    for (const units of config.layers.slice(1)) {
      model.add(tf.layers.dense({ units, activation: 'relu' }));
      model.add(tf.layers.dropout({ rate: config.dropoutRate }));
    }

    // Output layer
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  private async trainModel(tensors: TensorData): Promise<TrainingMetrics> {
    const { features, labels } = tensors;

    const trainLogs = await this.model!.fit(features, labels, {
      batchSize: this.config.training.batchSize,
      epochs: this.config.training.epochs,
      validationSplit: this.config.training.validationSplit,
      callbacks: [
        {
          onEpochEnd: async (epoch: number, logs: TFCallbackLogs) => {
            await this.updateTrainingProgress(epoch, logs);
          }
        }
      ]
    });

    return this.calculateTrainingMetrics(trainLogs);
  }

  private async convertToTensors(data: any): Promise<TensorData> {
    return tf.tidy(() => {
      const features = tf.tensor2d(data.processedFeatures);
      const labels = tf.tensor2d(data.labels.map((l: number) => [l]));
      return { features, labels };
    });
  }

  private async applyPreprocessing(data: any[]): Promise<any> {
    if (!this.pipelineState.transformations) {
      throw new PreprocessingError('No preprocessing state available. Train the model first.');
    }

    // Apply saved transformations in the correct order
    const orderedTransformations = [
      'missingValues',
      'outliers',
      'featureEngineering',
      'normalization'
    ];

    let processedData = [...data];

    for (const transform of orderedTransformations) {
      const transformConfig = this.pipelineState.transformations.get(transform);
      if (transformConfig) {
        processedData = await this.applyTransformation(processedData, transformConfig);
      }
    }

    return {
      processedFeatures: processedData,
      labels: [], // No labels for prediction
      featureNames: this.pipelineState.features
    };
  }

  private async applyTransformation(data: any[], config: any): Promise<any[]> {
    // Apply the transformation based on saved configuration
    switch (config.type) {
      case 'missingValues':
        return this.applyMissingValueTransform(data, config);
      case 'outliers':
        return this.applyOutlierTransform(data, config);
      case 'featureEngineering':
        return this.applyFeatureEngineeringTransform(data, config);
      case 'normalization':
        return this.applyNormalizationTransform(data, config);
      default:
        throw new PreprocessingError(`Unknown transformation type: ${config.type}`);
    }
  }

  private async applyMissingValueTransform(data: any[], config: any): Promise<any[]> {
    // Apply missing value handling using saved statistics
    return data.map(row => row.map((value: any, index: number) => {
      if (value === null || isNaN(value)) {
        const stats = config.statistics[`feature_${index}`];
        return stats.replacement;
      }
      return value;
    }));
  }

  private async applyOutlierTransform(data: any[], config: any): Promise<any[]> {
    // Apply outlier handling using saved statistics
    return data.map(row => row.map((value: any, index: number) => {
      const stats = config.statistics[`feature_${index}`];
      if (this.isOutlier(value, stats)) {
        return stats.replacement;
      }
      return value;
    }));
  }

  private async applyFeatureEngineeringTransform(data: any[], config: any): Promise<any[]> {
    // Apply feature engineering using saved configuration
    const result = [...data];
    if (config.interactions) {
      // Add interaction terms
      for (let i = 0; i < data[0].length; i++) {
        for (let j = i + 1; j < data[0].length; j++) {
          data.forEach((row, idx) => {
            result[idx].push(row[i] * row[j]);
          });
        }
      }
    }
    return result;
  }

  private async applyNormalizationTransform(data: any[], config: any): Promise<any[]> {
    // Apply normalization using saved statistics
    return data.map(row => row.map((value: any, index: number) => {
      const stats = config.statistics[`feature_${index}`];
      if (config.method === 'standardization') {
        return (value - stats.mean) / (stats.std || 1);
      } else if (config.method === 'minmax') {
        const range = stats.max - stats.min;
        return range === 0 ? 0 : (value - stats.min) / range;
      }
      return value;
    }));
  }

  private isOutlier(value: number, stats: any): boolean {
    if (stats.method === 'zscore') {
      return Math.abs((value - stats.mean) / stats.std) > 3;
    } else if (stats.method === 'iqr') {
      return value < stats.lowerBound || value > stats.upperBound;
    }
    return false;
  }

  private async postProcessPredictions(predictions: TFTensor): Promise<number[]> {
    const predArray = await predictions.array();
    return predArray.map((p: number[]) => p[0]);
  }

  private async updateTrainingProgress(epoch: number, logs: TFCallbackLogs): Promise<void> {
    const metrics = {
      epoch,
      loss: logs.loss,
      valLoss: logs.val_loss,
      mae: logs.mae,
      valMae: logs.val_mae
    };

    this.emit('trainingProgress', metrics);
  }

  private calculateTrainingMetrics(trainResults: tf.History): TrainingMetrics {
    const lastEpoch = trainResults.history.loss.length - 1;
    
    return {
      accuracy: trainResults.history.acc?.[lastEpoch] || 0,
      loss: trainResults.history.loss[lastEpoch],
      confidenceScore: this.calculateConfidenceScore(trainResults),
      featureImportance: new Map() // Feature importance would be calculated separately
    };
  }

  private calculateConfidenceScore(trainResults: tf.History): number {
    const validationAccuracy = trainResults.history.val_acc?.[trainResults.history.val_acc.length - 1] || 0;
    const validationLoss = trainResults.history.val_loss?.[trainResults.history.val_loss.length - 1] || 0;
    
    return (validationAccuracy * (1 - Math.min(validationLoss, 1))) / 2;
  }

  // Model persistence methods
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new ModelError('No model to save. Train the model first.');
    }
    await this.model.save(`file://${path}`);
  }

  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`) as TFSequentialModel;
  }
}