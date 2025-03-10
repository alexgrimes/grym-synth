import * as tf from '@tensorflow/tfjs';
import { LayersModel, Tensor, Tensor2D } from '@tensorflow/tfjs';

export interface ModelMetrics {
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  stability: {
    varianceScore: number;
    consistencyScore: number;
  };
  resourceUsage: {
    inferenceTime: number;
    memoryUsage: number;
  };
}

interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export class ModelEvaluator {
  private static PREDICTION_THRESHOLD = 0.5;

  async evaluateModel(model: LayersModel, testData: { features: Tensor2D; labels: Tensor2D }): Promise<ModelMetrics> {
    const startTime = Date.now();
    
    // Calculate performance metrics
    const performanceMetrics = await this.calculatePerformanceMetrics(model, testData);
    
    // Calculate stability metrics
    const stabilityMetrics = await this.assessModelStability(model, testData);
    
    // Calculate resource usage
    const endTime = Date.now();
    const resourceMetrics = {
      inferenceTime: endTime - startTime,
      memoryUsage: await this.measureMemoryUsage(model)
    };

    return {
      performance: performanceMetrics,
      stability: stabilityMetrics,
      resourceUsage: resourceMetrics
    };
  }

  private async calculatePerformanceMetrics(
    model: LayersModel,
    testData: { features: Tensor2D; labels: Tensor2D }
  ): Promise<ModelMetrics['performance']> {
    return tf.tidy(() => {
      const predictions = model.predict(testData.features) as Tensor;
      const binaryPredictions = predictions.greater(ModelEvaluator.PREDICTION_THRESHOLD);
      const confusionMatrix = this.calculateConfusionMatrix(binaryPredictions, testData.labels);
      
      const accuracy = this.calculateAccuracy(confusionMatrix);
      const precision = this.calculatePrecision(confusionMatrix);
      const recall = this.calculateRecall(confusionMatrix);
      const f1Score = this.calculateF1Score(precision, recall);

      return {
        accuracy,
        precision,
        recall,
        f1Score
      };
    });
  }

  private calculateConfusionMatrix(predictions: Tensor, labels: Tensor2D): ConfusionMatrix {
    const predArray = predictions.dataSync();
    const labelArray = labels.dataSync();

    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    for (let i = 0; i < predArray.length; i++) {
      if (predArray[i] === 1 && labelArray[i] === 1) {
        truePositives++;
      } else if (predArray[i] === 1 && labelArray[i] === 0) {
        falsePositives++;
      } else if (predArray[i] === 0 && labelArray[i] === 0) {
        trueNegatives++;
      } else {
        falseNegatives++;
      }
    }

    return {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives
    };
  }

  private calculateAccuracy(cm: ConfusionMatrix): number {
    const total = cm.truePositives + cm.trueNegatives + cm.falsePositives + cm.falseNegatives;
    return total > 0 ? (cm.truePositives + cm.trueNegatives) / total : 0;
  }

  private calculatePrecision(cm: ConfusionMatrix): number {
    return cm.truePositives + cm.falsePositives > 0
      ? cm.truePositives / (cm.truePositives + cm.falsePositives)
      : 0;
  }

  private calculateRecall(cm: ConfusionMatrix): number {
    return cm.truePositives + cm.falseNegatives > 0
      ? cm.truePositives / (cm.truePositives + cm.falseNegatives)
      : 0;
  }

  private calculateF1Score(precision: number, recall: number): number {
    return precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
  }

  private async assessModelStability(
    model: LayersModel,
    testData: { features: Tensor2D; labels: Tensor2D }
  ): Promise<ModelMetrics['stability']> {
    const NUM_ITERATIONS = 5;
    const predictions: number[][] = [];

    // Run multiple predictions to assess stability
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      const result = await tf.tidy(() => {
        const preds = model.predict(testData.features) as Tensor;
        return Array.from(preds.dataSync());
      });
      predictions.push(result);
    }

    // Calculate variance across predictions
    const varianceScore = this.calculatePredictionVariance(predictions);
    
    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(predictions);

    return {
      varianceScore,
      consistencyScore
    };
  }

  private calculatePredictionVariance(predictions: number[][]): number {
    const numPredictions = predictions.length;
    const numSamples = predictions[0].length;
    let totalVariance = 0;

    for (let i = 0; i < numSamples; i++) {
      const samplePredictions = predictions.map(p => p[i]);
      const mean = samplePredictions.reduce((a, b) => a + b) / numPredictions;
      const variance = samplePredictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numPredictions;
      totalVariance += variance;
    }

    return 1 - (totalVariance / numSamples); // Normalize and invert so higher is better
  }

  private calculateConsistencyScore(predictions: number[][]): number {
    const numPredictions = predictions.length;
    const numSamples = predictions[0].length;
    let consistentPredictions = 0;

    for (let i = 0; i < numSamples; i++) {
      const samplePredictions = predictions.map(p => p[i] > ModelEvaluator.PREDICTION_THRESHOLD);
      const allMatch = samplePredictions.every(p => p === samplePredictions[0]);
      if (allMatch) consistentPredictions++;
    }

    return consistentPredictions / numSamples;
  }

  private async measureMemoryUsage(model: LayersModel): Promise<number> {
    // Get model memory usage through TensorFlow.js memory() API
    const memoryInfo = tf.memory();
    const modelWeights = model.getWeights();
    
    // Calculate total bytes used by model weights
    const weightBytes = modelWeights.reduce((total, w) => {
      const bytesPerElement = w.dtype === 'float32' ? 4 : 1; // float32 = 4 bytes, int8 = 1 byte
      return total + (w.size * bytesPerElement);
    }, 0);
    
    // Clean up
    modelWeights.forEach(w => w.dispose());
    
    // Return total memory usage (model weights + runtime memory)
    return weightBytes + memoryInfo.numBytes;
  }
}