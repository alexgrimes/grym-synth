# Importance Scoring System Guide

## Overview

The importance scoring system provides a sophisticated way to evaluate and rank messages based on multiple factors. This guide explains how to use the system in your application.

## Installation

The importance scoring system is part of the core library. No additional installation is required.

## Basic Usage

```typescript
import { createImportanceScorer } from '../lib/importance-scoring';

// Create a scorer with default weights
const scorer = createImportanceScorer();

// Calculate importance scores for messages
const scores = await scorer.calculateImportance(messages, currentContext);
```

## Configuration

### Custom Weights

You can customize the scoring weights when creating the scorer:

```typescript
const scorer = createImportanceScorer({
  weights: {
    recency: 0.3,     // Increase recency importance
    relevance: 0.2,   // Decrease relevance importance
    interaction: 0.2,
    complexity: 0.15,
    theme: 0.1,
    keyTerms: 0.05
  }
});
```

### Service Integration

Integrate with LLM and theme detection services for enhanced scoring:

```typescript
const scorer = createImportanceScorer({
  llmService: myLlmService,       // For semantic analysis
  themeDetector: myThemeDetector  // For theme relevance
});
```

## Scoring Factors

The system evaluates messages across six dimensions:

1. **Recency (20%)**: Time-based relevance
   - Recent messages get higher priority
   - Uses exponential decay

2. **Relevance (25%)**: Semantic context match
   - Compares content with current context
   - Requires LLM service for optimal results

3. **Interaction (20%)**: User engagement metrics
   - Response presence (+0.3)
   - Discussion participation (+0.4)
   - Reference count (+0.3)

4. **Complexity (15%)**: Information density
   - Content length
   - Code block presence
   - Technical term density
   - Structural complexity
   - Conceptual density

5. **Theme (10%)**: Thematic alignment
   - Evaluates conversation theme relevance
   - Requires theme detector service

6. **Key Terms (10%)**: Domain terminology
   - Identifies technical terms
   - Normalized by frequency

## Error Handling

The system includes built-in error handling and fallbacks:

```typescript
// Service unavailability handled automatically
const scorer = createImportanceScorer({
  // Even if services are unavailable, scoring continues
  // with fallback mechanisms
  llmService: unreliableService,
  themeDetector: unreliableDetector
});
```

## Performance Considerations

1. **Async Processing**
   - All scoring operations are asynchronous
   - Batch processing for multiple messages

2. **Service Dependencies**
   - Fallback scoring when services unavailable
   - Configurable timeout settings

3. **Optimization**
   - Efficient score calculation
   - Memory-conscious implementation

## Examples

### Basic Scoring

```typescript
const messages = [
  {
    id: '1',
    content: 'Technical discussion about API design',
    timestamp: new Date(),
    hasResponse: true,
    participantCount: 2
  }
];

const scores = await scorer.calculateImportance(messages, 'API architecture');
console.log(scores[0]);
// Output:
// {
//   scores: {
//     recency: 1,
//     relevance: 0.85,
//     interaction: 0.7,
//     complexity: 0.4,
//     theme: 0.6,
//     keyTerms: 0.3
//   },
//   finalScore: 0.72
// }
```

### Batch Processing

```typescript
const messageSet = fetchMessages(); // Your message fetching logic
const context = getCurrentContext(); // Your context management

// Process all messages at once
const allScores = await scorer.calculateImportance(messageSet, context);

// Sort by importance
const sortedMessages = messageSet
  .map((msg, i) => ({ message: msg, score: allScores[i] }))
  .sort((a, b) => b.score.finalScore - a.score.finalScore);
```

## Integration Tips

1. **Context Management**
   - Keep context strings focused and relevant
   - Update context based on conversation flow

2. **Service Configuration**
   - Configure service timeouts appropriately
   - Implement service health checks

3. **Weight Tuning**
   - Monitor scoring patterns
   - Adjust weights based on usage data
   - Consider user feedback

## Troubleshooting

Common issues and solutions:

1. **Low Relevance Scores**
   - Check LLM service configuration
   - Verify context string relevance
   - Consider adjusting weights

2. **Performance Issues**
   - Implement batch processing
   - Check service response times
   - Consider caching mechanisms

3. **Inconsistent Scores**
   - Verify service stability
   - Check weight configuration
   - Validate message formatting

## References

- [TDR-008: Importance Scoring](TDR-008-IMPORTANCE-SCORING.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Context Management Guide](TDR-001-CONTEXT-MANAGEMENT.md)
