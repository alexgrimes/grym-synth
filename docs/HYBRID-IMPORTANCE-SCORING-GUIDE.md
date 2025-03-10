# Hybrid Importance Scoring Guide

This guide explains how the hybrid importance scoring system combines rule-based and machine learning approaches to score message importance.

## Overview

The hybrid system uses two scoring mechanisms:
1. Rule-based scoring (static rules and heuristics)
2. ML-based scoring (trained on user feedback)

These scores are combined using adaptive weighting that adjusts based on model confidence and performance metrics.

## Components

### 1. Rule-Based Scoring
- Recency scoring
- Relevance scoring
- Interaction scoring
- Complexity scoring
- Theme alignment
- Key terms analysis

### 2. ML-Based Scoring
The ML component uses a neural network trained on user feedback:

```typescript
const mlPipeline = new ImportanceTrainingPipeline(7); // 7 features

// Add training examples
await mlPipeline.addTrainingExample({
  messageId: 'msg1',
  features: [0.5, 0.3, 0.8, 0.2, 0.9, 0.4, 0.6],
  label: 0.8,
  metadata: {
    timestamp: new Date(),
    context: ['audio-processing'],
    userInteractions: [...]
  }
});

// Train model when enough examples are collected
const results = await mlPipeline.trainModel();
```

### 3. Hybrid Scoring

```typescript
const hybridScorer = new HybridImportanceScorer({
  weights: {
    recency: 0.2,
    relevance: 0.3,
    interaction: 0.2,
    complexity: 0.1,
    theme: 0.1,
    keyTerms: 0.1
  },
  mlModel: mlPipeline,
  initialMLWeight: 0.3,
  adaptationRate: 0.1,
  minConfidence: 0.4
});
```

## Features

### Adaptive Weighting
- Initial ML weight: 30%
- Adapts based on model confidence
- Minimum confidence threshold: 40%
- Adaptation rate: 10% per update

### Continuous Learning
1. Collect user feedback
2. Extract features
3. Train model in batches
4. Update weights
5. Monitor performance

### Visualization
Monitor training progress and model performance:

```typescript
<TrainingVisualization
  trainingMetrics={results.metrics}
  featureImportance={results.featureImportance}
/>
```

## Usage

### Basic Usage
```typescript
const scores = await hybridScorer.calculateImportance(messages, currentContext);
```

### Providing Feedback
```typescript
await hybridScorer.provideFeedback({
  messageId: 'msg1',
  userScore: 0.8,
  actualImportance: 0.9
});
```

### Monitoring
```typescript
const metrics = await hybridScorer.getPerformanceMetrics();
console.log('Accuracy:', metrics.accuracy);
console.log('Confidence:', metrics.confidence);
```

## Model Training

### Feature Extraction
- Message content features
- User interaction metrics
- Contextual relevance
- Temporal features
- Structural features

### Training Process
1. Buffer training examples (minimum 100)
2. Preprocess and normalize features
3. Balance dataset
4. Train with early stopping
5. Evaluate performance
6. Update production model

### Model Architecture
- Input layer: 7 features
- Hidden layers: 64 and 32 units with ReLU
- Dropout layers for regularization
- Output layer: Single unit with sigmoid

## Best Practices

### Data Collection
- Collect diverse training examples
- Ensure balanced importance distribution
- Include varied contexts and interactions

### Model Training
- Monitor validation metrics
- Use early stopping to prevent overfitting
- Save model checkpoints
- Regularly evaluate performance

### Scoring
- Start with higher weight on rule-based scoring
- Gradually increase ML weight as confidence improves
- Monitor and adjust adaptation rate
- Regularly validate scoring accuracy

## Integration

### With Context Management
```typescript
const contextManager = new ContextManager();
const context = await contextManager.getCurrentContext();
const scores = await hybridScorer.calculateImportance(messages, context);
```

### With Theme Discovery
```typescript
const themeDetector = new ThemeDetector();
const themes = await themeDetector.analyzeThemes(messages);
hybridScorer.updateThemeContext(themes);
```

## Troubleshooting

### Common Issues
1. Insufficient training data
2. Model overfitting
3. Poor feature extraction
4. Imbalanced datasets

### Solutions
1. Collect more diverse training examples
2. Adjust model architecture
3. Improve feature engineering
4. Implement data augmentation

## References
- [TDR-008: ML Training Pipeline](./TDR-008-IMPORTANCE-SCORING.md)
- [ML-TRAINING-PIPELINE.md](./ML-TRAINING-PIPELINE.md)
- [TDR-009: Hybrid Importance Scoring](./TDR-009-HYBRID-IMPORTANCE-SCORING.md)
