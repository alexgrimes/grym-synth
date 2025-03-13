import { InteractionContext, ScoredPattern } from './types';
import { Pattern } from '../feature-memory/types';
import { Logger } from '../../utils/logger';

/**
 * RelevanceScorer is responsible for scoring patterns based on their relevance
 * to the current context. It helps prioritize which patterns should be included
 * in the context provided to the LLM.
 */
export class RelevanceScorer {
  private static readonly RECENCY_WEIGHT = 0.3;
  private static readonly FREQUENCY_WEIGHT = 0.3;
  private static readonly SIMILARITY_WEIGHT = 0.4;

  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger({ namespace: 'relevance-scorer' });
  }

  /**
   * Score patterns based on their relevance to the current context
   * @param patterns The patterns to score
   * @param context The current interaction context
   * @param limit Optional limit on the number of patterns to return
   * @returns Array of scored patterns, sorted by relevance (highest first)
   */
  public scorePatternRelevance(
    patterns: Pattern[],
    context: InteractionContext,
    limit?: number
  ): ScoredPattern[] {
    try {
      // Score each pattern
      const scoredPatterns = patterns.map(pattern => ({
        pattern,
        score: this.calculateRelevanceScore(pattern, context)
      }));

      // Sort by score (highest first)
      const sortedPatterns = scoredPatterns.sort((a, b) => b.score - a.score);

      // Apply limit if specified
      return limit ? sortedPatterns.slice(0, limit) : sortedPatterns;
    } catch (error) {
      this.logger.error('Error scoring pattern relevance', { error });
      return [];
    }
  }

  /**
   * Calculate a relevance score for a pattern based on the current context
   * @param pattern The pattern to score
   * @param context The current interaction context
   * @returns A relevance score between 0 and 1
   */
  private calculateRelevanceScore(
    pattern: Pattern,
    context: InteractionContext
  ): number {
    // Calculate recency score (newer patterns score higher)
    const now = new Date().getTime();
    const patternAge = now - pattern.timestamp.getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const recencyScore = Math.max(0, 1 - (patternAge / maxAge));

    // Calculate frequency score (more frequently used patterns score higher)
    const frequencyScore = Math.min(1, pattern.metadata.frequency / 10);

    // Calculate similarity score based on pattern features and context
    const similarityScore = this.calculateSimilarityScore(pattern, context);

    // Combine scores using weights
    return (
      RelevanceScorer.RECENCY_WEIGHT * recencyScore +
      RelevanceScorer.FREQUENCY_WEIGHT * frequencyScore +
      RelevanceScorer.SIMILARITY_WEIGHT * similarityScore
    );
  }

  /**
   * Calculate similarity between a pattern and the current context
   * @param pattern The pattern to compare
   * @param context The current interaction context
   * @returns A similarity score between 0 and 1
   */
  private calculateSimilarityScore(
    pattern: Pattern,
    context: InteractionContext
  ): number {
    let similarityScore = 0;
    let matchCount = 0;

    // Check if pattern is in active patterns
    if (context.activePatterns.includes(pattern.id)) {
      return 1.0; // Maximum similarity for active patterns
    }

    // Check for query term matches in pattern features
    if (context.query && pattern.features) {
      const queryTerms = context.query.toLowerCase().split(/\s+/);

      for (const [key, value] of pattern.features.entries()) {
        const featureValue = String(value).toLowerCase();

        for (const term of queryTerms) {
          if (term.length > 2 && (
            key.toLowerCase().includes(term) ||
            featureValue.includes(term)
          )) {
            similarityScore += 0.2;
            matchCount++;
          }
        }
      }
    }

    // Check for workflow relevance
    if (context.currentWorkflow &&
        pattern.metadata.category.toLowerCase() === context.currentWorkflow.toLowerCase()) {
      similarityScore += 0.3;
      matchCount++;
    }

    // Check for audio property similarity
    if (context.audioProperties) {
      // Look for duration in pattern features
      const patternDuration = pattern.features.get('duration');

      if (patternDuration && typeof patternDuration === 'number') {
        const contextDuration = context.audioProperties.duration;

        // Score based on duration similarity (within 20% is considered similar)
        const durationDiff = Math.abs(contextDuration - patternDuration) / Math.max(contextDuration, patternDuration);
        if (durationDiff < 0.2) {
          similarityScore += 0.2;
          matchCount++;
        }
      }
    }

    // Normalize score based on match count
    return matchCount > 0 ? Math.min(1, similarityScore) : 0;
  }
}
