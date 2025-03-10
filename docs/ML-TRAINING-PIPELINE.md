# ML Training Pipeline Guide

This guide provides detailed technical information about the machine learning training pipeline used in the importance scoring system.

## Overview

The ML training pipeline is implemented in `src/lib/importance-scoring/ml/` and provides a robust system for:
- Collecting and preprocessing training data
- Training a TensorFlow.js model
- Evaluating model performance
- Feature importance analysis
- Model stability assessment

> **Note**: An enhanced version of this pipeline with advanced preprocessing capabilities is being implemented. See [TDR-010: Integrated ML Pipeline](./TDR-010-INTEGRATED-ML-PIPELINE.md) for details about the upcoming improvements.

## Architecture

### Directory Structure
```
src/lib/importance-scoring/ml/
├── types.ts                 # Type definitions
├── training-pipeline.ts     # Core training implementation
├── feature-importance.ts    # Feature importance analyzer
├── model-evaluator.ts      # Model evaluation system
├── test-training-pipeline.ts# Test suite
├── advanced-preprocessor.ts # Advanced preprocessing system (coming soon)
├── integrated-pipeline.ts   # Enhanced pipeline implementation (coming soon)
└── index.ts                 # Public API
```

### Components
```
src/lib/importance-scoring/components/
└── training-visualization.tsx # Training progress visualization
```

## Implementation Details

### Model Architecture
- Input layer: Matches feature dimension
- Hidden layers: 64 and 32 units with ReLU activation
- Dropout layers: 0.3 dropout rate for regularization
- Output layer: Single unit with sigmoid activation

### Training Configuration
```typescript
const config = {
  batchSize: 32,
  epochs: 10,
  validationSplit: 0.2,
  learningRate: 0.001,
  minTrainingExamples: 100
};
```

### Early Stopping
```typescript
const earlyStoppingCallback = tf.callbacks.earlyStopping({
  monitor: 'val_loss',
  patience: 3
});
```

## Feature Importance Analysis

The system includes a comprehensive feature importance analyzer that uses a SHAP-inspired approach to determine feature contributions:

### FeatureImportanceAnalyzer
```typescript
const analyzer = new FeatureImportanceAnalyzer(featureNames);
const importanceScores = await analyzer.calculateFeatureImportance(model, dataset);
```

Key capabilities:
1. Permutation Importance
   - Measures feature impact by permuting values
   - Calculates contribution to model predictions

2. Feature Correlation
   - Analyzes relationships between features
   - Considers target variable correlations

3. Stability Metrics
   - Assesses feature importance stability
   - Provides confidence in importance scores

## Model Evaluation

The ModelEvaluator provides comprehensive evaluation metrics:

```typescript
const evaluator = new ModelEvaluator();
const metrics = await evaluator.evaluateModel(model, { features, labels });
```

### Performance Metrics
- Accuracy
- Precision
- Recall
- F1 Score

### Stability Assessment
- Variance Score: Measures prediction stability
- Consistency Score: Evaluates prediction reliability

### Resource Usage
- Inference Time
- Memory Usage

## Usage Examples

### Basic Training
```typescript
const pipeline = new ImportanceTrainingPipeline();

// Add training examples
await pipeline.addTrainingExample({
  messageId: 'msg1',
  features: [0.5, 0.3, 0.8],
  label: 0.7,
  metadata: {
    timestamp: new Date(),
    context: ['audio-processing'],
    userInteractions: []
  }
});

// Train when enough examples are collected
if (pipeline.hasEnoughData()) {
  const results = await pipeline.trainModel();
  console.log('Training metrics:', results.metrics);
}
```

### Feature Importance Analysis
```typescript
const analyzer = new FeatureImportanceAnalyzer(featureNames);
const importanceScores = await analyzer.calculateFeatureImportance(model, dataset);

// Get detailed metrics for a specific feature
const featureMetrics = analyzer.getFeatureMetrics('feature_name');
console.log('Feature metrics:', {
  contribution: featureMetrics.contribution,
  correlation: featureMetrics.correlation,
  stability: featureMetrics.stability
});
```

### Model Evaluation
```typescript
const evaluator = new ModelEvaluator();
const metrics = await evaluator.evaluateModel(model, {
  features: testFeatures,
  labels: testLabels
});

console.log('Model performance:', metrics.performance);
console.log('Model stability:', metrics.stability);
console.log('Resource usage:', metrics.resourceUsage);
```

### With Visualization
```typescript
function TrainingMonitor() {
  return (
    <div className="training-monitor">
      <TrainingVisualization
        trainingMetrics={pipeline.getMetrics()}
        featureImportance={pipeline.getFeatureImportance()}
      />
    </div>
  );
}
```

## Feature Engineering

### Base Features
1. Content length
2. Term frequency
3. User interaction count
4. Time relevance
5. Context match score
6. Complexity score
7. Theme alignment

### Derived Features
```typescript
async function calculateDerivedFeatures(example: TrainingData) {
  return [
    await calculateContextualRelevance(example),
    calculateTemporalImportance(example),
    calculateStructuralComplexity(example)
  ];
}
```

## Performance Optimization

### Data Preprocessing
- Feature normalization
- Dataset balancing
- Batch processing

### Model Optimization
- Gradient clipping
- Learning rate scheduling
- Dropout regularization

## Monitoring and Debugging

### Metrics Tracked
- Training loss
- Validation loss
- Accuracy
- Feature importance
- Confidence scores
- Model stability
- Resource utilization

### Debugging Tools
```typescript
const debugCallback = {
  onBatchEnd: (batch, logs) => {
    console.log(`Batch ${batch}: loss = ${logs.loss}`);
  },
  onEpochEnd: (epoch, logs) => {
    console.log(`Epoch ${epoch}:`, logs);
  }
};
```

## Testing

### Unit Tests
```typescript
describe('ImportanceTrainingPipeline', () => {
  it('should train successfully with sufficient data', async () => {
    const pipeline = new ImportanceTrainingPipeline();
    // Add test data
    const results = await pipeline.trainModel();
    expect(results.metrics.accuracy).toBeGreaterThan(0.7);
  });
});
```

### Integration Tests
```typescript
describe('Training Pipeline Integration', () => {
  it('should integrate with HybridScorer', async () => {
    const scorer = new HybridImportanceScorer();
    await scorer.trainAndUpdate();
    expect(scorer.isModelReady()).toBe(true);
  });
});
```

## Error Handling

### Common Issues
1. Insufficient training data
2. Model convergence problems
3. Memory constraints
4. Numerical instability

### Recovery Strategies
```typescript
try {
  await pipeline.trainModel();
} catch (error) {
  if (error instanceof InsufficientDataError) {
    await collectMoreData();
  } else if (error instanceof ConvergenceError) {
    await adjustHyperparameters();
  }
}
```

## Future Improvements

1. Advanced Feature Engineering
   - Implement more sophisticated derived features
   - Add support for custom feature extractors

2. Model Architecture
   - Experiment with different architectures
   - Support for transfer learning
   - Model compression techniques

3. Training Process
   - Implement cross-validation
   - Add support for distributed training
   - Improve batch processing efficiency

4. Monitoring
   - Enhanced visualization components
   - Real-time training metrics
   - Advanced debugging tools

## References

- [TDR-008: Importance Scoring](./TDR-008-IMPORTANCE-SCORING.md)
- [TDR-010: Integrated ML Pipeline](./TDR-010-INTEGRATED-ML-PIPELINE.md)
- [Hybrid Importance Scoring Guide](./HYBRID-IMPORTANCE-SCORING-GUIDE.md)
- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
