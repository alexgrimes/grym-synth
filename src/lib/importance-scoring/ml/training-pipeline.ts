import * as tf from '@tensorflow/tfjs';
import { TrainingData, ModelMetrics, TFCallbackLogs } from './types';

export class ImportanceTrainingPipeline {
  private model!: tf.LayersModel;
  private trainingBuffer: TrainingData[] = [];
  private readonly minTrainingExamples = 100;
  private readonly inputFeatureSize: number;

  constructor(inputFeatureSize: number) {
    this.inputFeatureSize = inputFeatureSize;
    this.initializeModel();
  }

  private initializeModel(): void {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [this.inputFeatureSize]
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  async trainModel(): Promise<tf.History> {
    if (this.trainingBuffer.length < this.minTrainingExamples) {
      throw new Error('Insufficient training data');
    }

    const startTime = Date.now();
    const processedData = await this.preprocessData(this.trainingBuffer);

    const history = await this.model.fit(
      processedData.features,
      processedData.labels,
      {
        batchSize: 32,
        epochs: 10,
        validationSplit: 0.2,
        callbacks: [
          {
            onEpochEnd: async (epoch: number, logs: TFCallbackLogs) => {
              console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
            }
          }
        ]
      }
    );

    // Clear training buffer after successful training
    this.trainingBuffer = [];

    return history;
  }

  private async preprocessData(data: TrainingData[]) {
    // Convert features and labels to tensors
    const features = tf.tensor2d(
      data.map(example => example.features)
    );
    
    const labels = tf.tensor2d(
      data.map(example => [example.label])
    );

    return { features, labels };
  }

  async addTrainingExample(example: TrainingData): Promise<void> {
    this.trainingBuffer.push(example);

    if (this.trainingBuffer.length >= this.minTrainingExamples) {
      await this.trainModel();
    }
  }

  async saveModel(path: string): Promise<void> {
    await this.model.save(`file://${path}`);
  }

  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  private calculateConfidenceScore(history: tf.History): number {
    const lastEpochIndex = history.history.loss.length - 1;
    const validationAccuracy = history.history.val_acc?.[lastEpochIndex] || 0;
    const validationLoss = history.history.val_loss?.[lastEpochIndex] || 1;
    
    return (validationAccuracy * (1 - Math.min(validationLoss, 1))) / 2;
  }
}