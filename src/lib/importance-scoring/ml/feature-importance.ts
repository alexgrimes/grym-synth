import * as tf from '@tensorflow/tfjs';
import { LayersModel, Tensor, Tensor2D } from '@tensorflow/tfjs';

interface FeatureMetrics {
  contribution: number;
  correlation: number;
  stability: number;
}

export class FeatureImportanceAnalyzer {
  private features = new Map<string, FeatureMetrics>();
  private featureNames: string[] = [];

  constructor(featureNames: string[]) {
    this.featureNames = featureNames;
    featureNames.forEach(feature => {
      this.features.set(feature, {
        contribution: 0,
        correlation: 0,
        stability: 0
      });
    });
  }

  async calculateFeatureImportance(model: LayersModel, dataset: Tensor2D): Promise<Array<{feature: string; importance: number}>> {
    const baselineScore = await this.getBaselinePrediction(model, dataset);
    
    const importanceScores = await Promise.all(
      this.featureNames.map(async feature => {
        const permutedScore = await this.calculatePermutationImportance(
          model, 
          dataset, 
          feature
        );
        
        const contribution = Math.abs(baselineScore - permutedScore);
        const correlation = await this.calculateCorrelation(dataset, feature);
        const stability = await this.calculateStability(model, dataset, feature);
        
        this.features.set(feature, {
          contribution,
          correlation,
          stability
        });

        // Weighted importance score combining all metrics
        const importance = (
          contribution * 0.5 + // Higher weight for direct contribution
          correlation * 0.3 + // Medium weight for correlation
          stability * 0.2     // Lower weight for stability
        );

        return {
          feature,
          importance
        };
      })
    );

    return importanceScores.sort((a, b) => b.importance - a.importance);
  }

  private async getBaselinePrediction(model: LayersModel, dataset: Tensor2D): Promise<number> {
    const predictions = model.predict(dataset) as Tensor;
    const meanPrediction = await predictions.mean().data();
    predictions.dispose();
    return meanPrediction[0];
  }

  private async calculatePermutationImportance(
    model: LayersModel,
    dataset: Tensor2D,
    feature: string
  ): Promise<number> {
    const featureIndex = this.featureNames.indexOf(feature);
    if (featureIndex === -1) {
      throw new Error(`Feature ${feature} not found`);
    }

    return tf.tidy(() => {
      // Create a copy of the dataset
      const permutedData = dataset.clone();
      const values = dataset.slice([0, featureIndex], [-1, 1]);
      
      // Shuffle the feature values
      const shuffledValues = tf.tensor1d(this.shuffleArray(Array.from(values.dataSync())));
      
      // Replace the feature column
      const indices = tf.range(0, permutedData.shape[0]).reshape([-1, 1]);
      const updated = permutedData.scatter(indices, shuffledValues) as Tensor2D;
      
      // Get predictions with permuted feature
      const predictions = model.predict(updated) as Tensor;
      const meanPrediction = predictions.mean().dataSync()[0];
      
      return meanPrediction;
    });
  }

  private async calculateCorrelation(dataset: Tensor2D, feature: string): Promise<number> {
    const featureIndex = this.featureNames.indexOf(feature);
    if (featureIndex === -1) {
      throw new Error(`Feature ${feature} not found`);
    }

    return tf.tidy(() => {
      const featureValues = dataset.slice([0, featureIndex], [-1, 1]);
      const target = dataset.slice([0, -1], [-1, 1]); // Assuming last column is target

      const meanX = featureValues.mean();
      const meanY = target.mean();
      const centeredX = featureValues.sub(meanX);
      const centeredY = target.sub(meanY);
      const numerator = centeredX.mul(centeredY).mean();
      const denominator = centeredX.square().mean().sqrt()
        .mul(centeredY.square().mean().sqrt());
      const correlation = numerator.div(denominator);

      return Math.abs(correlation.dataSync()[0]); // Return absolute correlation
    });
  }

  private async calculateStability(
    model: LayersModel, 
    dataset: Tensor2D,
    feature: string
  ): Promise<number> {
    const NUM_ITERATIONS = 5;
    const predictions: number[] = [];

    for (let i = 0; i < NUM_ITERATIONS; i++) {
      const permutedScore = await this.calculatePermutationImportance(
        model,
        dataset,
        feature
      );
      predictions.push(permutedScore);
    }

    // Calculate coefficient of variation (lower means more stable)
    const mean = predictions.reduce((a, b) => a + b) / predictions.length;
    const variance = predictions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / predictions.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // Convert to stability score (1 - cv, normalized to [0,1])
    return 1 / (1 + cv);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getFeatureMetrics(feature: string): FeatureMetrics | undefined {
    return this.features.get(feature);
  }

  getAllFeatureMetrics(): Map<string, FeatureMetrics> {
    return new Map(this.features);
  }
}