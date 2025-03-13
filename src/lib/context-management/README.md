# Context Management System

A sophisticated system for managing context across user sessions, tracking preferences, and optimizing context for LLM interactions.

## Overview

The Context Management System provides tools for:

1. **Context Summarization**: Efficiently summarize relevant context for LLM interactions
2. **Preference Tracking**: Track and manage user preferences from explicit and implicit sources
3. **Pattern Relevance Scoring**: Score patterns based on their relevance to the current context
4. **Context Optimization**: Prioritize the most relevant information within token limits

## Integration with Feature Memory

The Context Management System integrates with the Feature Memory System:

- Uses patterns stored in Feature Memory
- Scores patterns based on relevance to current context
- Prioritizes the most relevant patterns for inclusion in LLM context

This creates a powerful workflow where:
1. Feature Memory serves as "long-term storage" for audio patterns
2. Context Management acts as "working memory" that determines what's relevant now
3. Together they ensure the LLM has the most useful context within token limits

## Usage

### Basic Usage

```typescript
import { ContextSummarizer, PreferenceTracker, RelevanceScorer } from '../lib/context-management';

// Create instances
const summarizer = new ContextSummarizer();
const preferenceTracker = new PreferenceTracker();
const relevanceScorer = new RelevanceScorer();

// Initialize user profile
const userProfile = {
  id: 'user123',
  preferences: new Map(),
  interactionHistory: [],
  favoritePatterns: [],
  workflowHistory: []
};

// Track preferences
preferenceTracker.extractExplicitPreference("I prefer ambient sounds", userProfile);

// Score patterns by relevance
const scoredPatterns = relevanceScorer.scorePatternRelevance(
  patterns,
  context,
  10 // Limit to top 10 most relevant patterns
);

// Generate context summary
const contextSummary = summarizer.summarizeForLLM(
  recentInteractions,
  userProfile,
  scoredPatterns.map(sp => sp.pattern),
  systemState
);
```

See the `examples` directory for more detailed usage examples.

## Key Components

### ContextSummarizer

Generates optimized context summaries for LLM interactions, prioritizing the most relevant information within token limits.

```typescript
const summarizer = new ContextSummarizer();
const context = summarizer.summarizeForLLM(
  recentHistory,
  userProfile,
  relevantPatterns,
  systemState
);
```

### PreferenceTracker

Tracks and manages user preferences from both explicit statements and implicit behavior.

```typescript
const tracker = new PreferenceTracker();

// Track implicit preferences
tracker.trackInteraction(interaction, userProfile);

// Extract explicit preferences
tracker.extractExplicitPreference("I prefer ambient sounds", userProfile);

// Get preference vector
const vector = tracker.getPreferenceVector(userProfile);
```

### RelevanceScorer

Scores patterns based on their relevance to the current context, considering factors like recency, frequency, and similarity.

```typescript
const scorer = new RelevanceScorer();

// Score patterns by relevance to context
const scoredPatterns = scorer.scorePatternRelevance(
  patterns,
  context,
  10 // Optional limit
);
```

## Testing

Run the tests with:

```bash
npm test -- --testPathPattern=context-management
```

## Documentation

For more detailed documentation, see:

- [Context Management System](../../docs/CONTEXT-MANAGEMENT-SYSTEM.md)
