export * from './types';
export * from './advanced-preprocessor';
export * from './integrated-pipeline';

// Re-export commonly used configurations
export const defaultPreprocessorConfig = {
  missingValueStrategy: 'mean' as const,
  outlierDetectionMethod: 'zscore' as const,
  featureEngineeringConfig: {
    interactions: true,
    polynomialDegree: 2
  },
  normalizationMethod: 'standardization' as const
};

export const defaultPipelineConfig = {
  preprocessing: defaultPreprocessorConfig,
  training: {
    batchSize: 32,
    epochs: 100,
    validationSplit: 0.2,
    earlyStoppingPatience: 10
  },
  model: {
    layers: [64, 32, 16],
    dropoutRate: 0.2,
    learningRate: 0.001
  }
};