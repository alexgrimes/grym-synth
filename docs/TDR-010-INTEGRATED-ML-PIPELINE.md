# TDR-010: Integrated ML Pipeline

## Overview

The Integrated ML Pipeline is a comprehensive system for preprocessing data, training models, and making predictions in our importance scoring system. It combines advanced preprocessing techniques with TensorFlow.js-based neural network training to provide a robust machine learning pipeline.

## Architecture

The pipeline consists of three main components:

1. **AdvancedPreprocessor**: Handles data preparation and feature engineering
2. **IntegratedMLPipeline**: Manages the overall training and prediction workflow
3. **Types and Configurations**: Provides type safety and standardized configurations

### Component Details

#### AdvancedPreprocessor

Responsible for:
- Missing value handling
- Outlier detection and treatment
- Feature engineering
- Data normalization
- Statistical analysis

```typescript
const preprocessor = new AdvancedPreprocessor({
  missingValueStrategy: 'mean',
  outlierDetectionMethod: 'zscore',
  featureEngineeringConfig: {
    interactions: true,
    polynomialDegree: 2
  },
  normalizationMethod: 'standardization'
});
```

#### IntegratedMLPipeline

Manages:
- Model creation and configuration
- Training process
- Prediction pipeline
- Model persistence
- Progress monitoring

```typescript
const pipeline = new IntegratedMLPipeline({
  preprocessing: defaultPreprocessorConfig,
  training: {
    batchSize: 32,
    epochs: 100,
    validationSplit: 0.2
  },
  model: {
    layers: [64, 32, 16],
    dropoutRate: 0.2,
    learningRate: 0.001
  }
});
```

## Usage

### Basic Training Workflow

```typescript
import { IntegratedMLPipeline, defaultPipelineConfig } from './ml';

// Initialize pipeline
const pipeline = new IntegratedMLPipeline(defaultPipelineConfig);

// Train model
const trainingData = [...]; // Your feature array
const result = await pipeline.train(trainingData);

// Make predictions
const predictions = await pipeline.predict(newData);
```

### Monitoring Training Progress

```typescript
pipeline.on('trainingProgress', (metrics) => {
  console.log(`Epoch ${metrics.epoch}: loss = ${metrics.loss}`);
});
```

### Model Persistence

```typescript
// Save model
await pipeline.saveModel('file://./models/importance-scorer');

// Load model
await pipeline.loadModel('file://./models/importance-scorer');
```

## Error Handling

The pipeline includes comprehensive error handling:

- **PreprocessingError**: Data preparation issues
- **ModelError**: Training and prediction problems
- **ValidationError**: Configuration validation failures

Example:
```typescript
try {
  await pipeline.train(data);
} catch (error) {
  if (error instanceof PreprocessingError) {
    // Handle preprocessing issues
  } else if (error instanceof ModelError) {
    // Handle model-related problems
  }
}
```

## Configuration

### Default Configurations

The system provides sensible defaults:

```typescript
const defaultPreprocessorConfig = {
  missingValueStrategy: 'mean',
  outlierDetectionMethod: 'zscore',
  featureEngineeringConfig: {
    interactions: true,
    polynomialDegree: 2
  },
  normalizationMethod: 'standardization'
};

const defaultPipelineConfig = {
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
```

### Custom Configurations

You can customize any part of the configuration:

```typescript
const customConfig = {
  ...defaultPipelineConfig,
  model: {
    layers: [128, 64, 32], // Larger network
    dropoutRate: 0.3,      // More aggressive dropout
    learningRate: 0.0005   // Lower learning rate
  }
};
```

## Best Practices

1. **Data Preparation**
   - Always validate input data structure
   - Consider feature scaling requirements
   - Handle missing values appropriately

2. **Training**
   - Monitor training progress
   - Use early stopping to prevent overfitting
   - Validate model performance on test data

3. **Production Use**
   - Save trained models for reuse
   - Implement proper error handling
   - Monitor prediction quality

## Integration with Importance Scoring

The ML pipeline integrates with our importance scoring system:

```typescript
import { HybridImportanceScorer } from '../importance-scoring';
import { IntegratedMLPipeline } from './ml';

const pipeline = new IntegratedMLPipeline(defaultPipelineConfig);
const scorer = new HybridImportanceScorer({
  mlPipeline: pipeline,
  weights: {
    mlScore: 0.7,
    heuristicScore: 0.3
  }
});
```

## Testing

The pipeline includes comprehensive tests:

- Unit tests for individual components
- Integration tests for the full pipeline
- Performance tests for model evaluation

Run tests using:
```bash
npm test -- --testPathPattern=importance-scoring/ml
```

## Future Improvements

1. **Feature Selection**
   - Implement automated feature importance analysis
   - Add support for feature selection algorithms

2. **Model Optimization**
   - Add hyperparameter tuning
   - Implement model architecture search

3. **Performance**
   - Add batch prediction support
   - Implement caching for preprocessed data

4. **Monitoring**
   - Add detailed performance metrics
   - Implement drift detection

## Related Documents

- [TDR-008: Importance Scoring](./TDR-008-IMPORTANCE-SCORING.md)
- [TDR-009: Hybrid Importance Scoring](./TDR-009-HYBRID-IMPORTANCE-SCORING.md)
- [ML Training Pipeline Guide](./ML-TRAINING-PIPELINE.md)
