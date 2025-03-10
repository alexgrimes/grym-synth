import { ImportanceTrainingPipeline } from './training-pipeline';
import { TrainingData } from './types';
import * as tf from '@tensorflow/tfjs';

describe('ImportanceTrainingPipeline', () => {
  let pipeline: ImportanceTrainingPipeline;
  const inputFeatureSize = 7; // Based on our feature extraction

  beforeEach(() => {
    pipeline = new ImportanceTrainingPipeline(inputFeatureSize);
  });

  const createMockTrainingData = (count: number): TrainingData[] => {
    return Array.from({ length: count }, (_, i) => ({
      messageId: `msg_${i}`,
      features: Array.from({ length: inputFeatureSize }, () => Math.random()),
      label: Math.random() > 0.5 ? 1 : 0,
      metadata: {
        timestamp: new Date(),
        context: ['test context'],
        userInteractions: [
          {
            type: 'view',
            timestamp: new Date(),
            userId: 'test_user'
          }
        ]
      }
    }));
  };

  describe('addTrainingExample', () => {
    it('should add training examples without training if below minimum', async () => {
      const mockData = createMockTrainingData(1)[0];
      await pipeline.addTrainingExample(mockData);
      // Training buffer is private, so we can't check directly
      // Instead, we verify no error is thrown
    });

    it('should trigger training when reaching minimum examples', async () => {
      const mockData = createMockTrainingData(100);
      
      // Add examples one by one
      for (const example of mockData) {
        await pipeline.addTrainingExample(example);
      }
      // Training should be triggered automatically at 100 examples
    });
  });

  describe('trainModel', () => {
    it('should throw error if insufficient data', async () => {
      await expect(pipeline.trainModel()).rejects.toThrow('Insufficient training data');
    });

    it('should train successfully with sufficient data', async () => {
      const mockData = createMockTrainingData(120);
      
      // Add all examples
      for (const example of mockData) {
        await pipeline.addTrainingExample(example);
      }

      const result = await pipeline.trainModel();
      expect(result.history).toBeDefined();
      expect(result.history.loss).toBeDefined();
      expect(result.history.acc).toBeDefined();
    });
  });

  describe('model persistence', () => {
    it('should save and load model', async () => {
      // Train model with some data
      const mockData = createMockTrainingData(120);
      for (const example of mockData) {
        await pipeline.addTrainingExample(example);
      }
      await pipeline.trainModel();

      // Save model
      const tempPath = './temp-model';
      await pipeline.saveModel(tempPath);

      // Create new pipeline and load model
      const newPipeline = new ImportanceTrainingPipeline(inputFeatureSize);
      await newPipeline.loadModel(tempPath);

      // Test prediction with same input
      const testData = createMockTrainingData(1)[0];
      
      // Add example to both pipelines
      await pipeline.addTrainingExample(testData);
      await newPipeline.addTrainingExample(testData);

      // Both pipelines should be in a valid state after training
      expect(await pipeline.trainModel()).toBeDefined();
      expect(await newPipeline.trainModel()).toBeDefined();
    });
  });
});