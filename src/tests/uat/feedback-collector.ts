/**
 * Feedback Collector
 *
 * Utilities for collecting and analyzing user feedback
 */
import { Logger } from '../../utils/logger';
import { Scenario, ScenarioResult } from './scenario-runner';

// Define feedback rating
export enum FeedbackRating {
  EXCELLENT = 5,
  GOOD = 4,
  AVERAGE = 3,
  POOR = 2,
  VERY_POOR = 1
}

// Define feedback item
export interface FeedbackItem {
  // User ID
  userId: string;

  // Scenario ID
  scenarioId: string;

  // Step ID (optional)
  stepId?: string;

  // Rating
  rating: FeedbackRating;

  // Comments
  comments?: string;

  // Timestamp
  timestamp: Date;

  // Tags
  tags?: string[];

  // Additional metadata
  metadata?: Record<string, any>;
}

// Define feedback summary
export interface FeedbackSummary {
  // Scenario ID
  scenarioId: string;

  // Scenario name
  scenarioName: string;

  // Average rating
  averageRating: number;

  // Rating distribution
  ratingDistribution: Record<FeedbackRating, number>;

  // Total feedback count
  totalFeedback: number;

  // Step feedback
  stepFeedback: {
    stepId: string;
    stepName: string;
    averageRating: number;
    feedbackCount: number;
  }[];

  // Common themes from comments
  commonThemes: {
    theme: string;
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];

  // Improvement suggestions
  improvementSuggestions: string[];
}

export class FeedbackCollector {
  private logger: Logger;
  private feedback: FeedbackItem[] = [];
  private scenarios: Map<string, Scenario> = new Map();

  constructor() {
    this.logger = new Logger({ namespace: 'feedback-collector' });
  }

  /**
   * Register scenarios
   */
  registerScenarios(scenarios: Scenario[]): void {
    scenarios.forEach(scenario => {
      this.scenarios.set(scenario.id, scenario);
    });

    this.logger.info(`Registered ${scenarios.length} scenarios for feedback collection`);
  }

  /**
   * Add feedback
   */
  addFeedback(feedback: FeedbackItem): void {
    this.feedback.push(feedback);

    this.logger.info(`Received feedback for scenario: ${feedback.scenarioId}`, {
      userId: feedback.userId,
      rating: feedback.rating,
      stepId: feedback.stepId
    });
  }

  /**
   * Add multiple feedback items
   */
  addFeedbackBatch(feedbackItems: FeedbackItem[]): void {
    feedbackItems.forEach(item => this.addFeedback(item));
  }

  /**
   * Get feedback for a scenario
   */
  getFeedbackForScenario(scenarioId: string): FeedbackItem[] {
    return this.feedback.filter(item => item.scenarioId === scenarioId);
  }

  /**
   * Get feedback summary for a scenario
   */
  getFeedbackSummary(scenarioId: string): FeedbackSummary | null {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      this.logger.warn(`Scenario not found: ${scenarioId}`);
      return null;
    }

    const feedbackItems = this.getFeedbackForScenario(scenarioId);
    if (feedbackItems.length === 0) {
      this.logger.warn(`No feedback found for scenario: ${scenarioId}`);
      return null;
    }

    // Calculate average rating
    const totalRating = feedbackItems.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = totalRating / feedbackItems.length;

    // Calculate rating distribution
    const ratingDistribution: Record<FeedbackRating, number> = {
      [FeedbackRating.EXCELLENT]: 0,
      [FeedbackRating.GOOD]: 0,
      [FeedbackRating.AVERAGE]: 0,
      [FeedbackRating.POOR]: 0,
      [FeedbackRating.VERY_POOR]: 0
    };

    feedbackItems.forEach(item => {
      ratingDistribution[item.rating]++;
    });

    // Calculate step feedback
    const stepFeedback: FeedbackSummary['stepFeedback'] = [];

    // Group feedback by step
    const stepFeedbackMap = new Map<string, FeedbackItem[]>();

    feedbackItems
      .filter(item => item.stepId)
      .forEach(item => {
        const stepId = item.stepId!;
        if (!stepFeedbackMap.has(stepId)) {
          stepFeedbackMap.set(stepId, []);
        }
        stepFeedbackMap.get(stepId)!.push(item);
      });

    // Calculate step feedback summaries
    scenario.steps.forEach((step, index) => {
      const stepId = `${scenarioId}-step-${index}`;
      const stepFeedbackItems = stepFeedbackMap.get(stepId) || [];

      if (stepFeedbackItems.length > 0) {
        const stepTotalRating = stepFeedbackItems.reduce((sum, item) => sum + item.rating, 0);
        const stepAverageRating = stepTotalRating / stepFeedbackItems.length;

        stepFeedback.push({
          stepId,
          stepName: step.name,
          averageRating: stepAverageRating,
          feedbackCount: stepFeedbackItems.length
        });
      }
    });

    // Extract common themes from comments (simplified)
    const commonThemes: FeedbackSummary['commonThemes'] = [];
    const comments = feedbackItems
      .filter(item => item.comments)
      .map(item => item.comments!);

    // This is a simplified approach - in a real system you would use
    // natural language processing to extract themes and sentiment
    const positiveKeywords = ['good', 'great', 'excellent', 'easy', 'intuitive'];
    const negativeKeywords = ['bad', 'poor', 'difficult', 'confusing', 'slow'];

    const keywordCounts: Record<string, { count: number; sentiment: 'positive' | 'negative' | 'neutral' }> = {};

    comments.forEach(comment => {
      const lowerComment = comment.toLowerCase();

      // Check positive keywords
      positiveKeywords.forEach(keyword => {
        if (lowerComment.includes(keyword)) {
          if (!keywordCounts[keyword]) {
            keywordCounts[keyword] = { count: 0, sentiment: 'positive' };
          }
          keywordCounts[keyword].count++;
        }
      });

      // Check negative keywords
      negativeKeywords.forEach(keyword => {
        if (lowerComment.includes(keyword)) {
          if (!keywordCounts[keyword]) {
            keywordCounts[keyword] = { count: 0, sentiment: 'negative' };
          }
          keywordCounts[keyword].count++;
        }
      });
    });

    // Convert to common themes
    Object.entries(keywordCounts)
      .filter(([_, data]) => data.count >= 2) // At least 2 mentions
      .forEach(([keyword, data]) => {
        commonThemes.push({
          theme: keyword,
          count: data.count,
          sentiment: data.sentiment
        });
      });

    // Extract improvement suggestions (simplified)
    const improvementSuggestions: string[] = [];

    comments.forEach(comment => {
      const lowerComment = comment.toLowerCase();
      if (
        lowerComment.includes('suggest') ||
        lowerComment.includes('improve') ||
        lowerComment.includes('should') ||
        lowerComment.includes('could') ||
        lowerComment.includes('would be better')
      ) {
        improvementSuggestions.push(comment);
      }
    });

    return {
      scenarioId,
      scenarioName: scenario.name,
      averageRating,
      ratingDistribution,
      totalFeedback: feedbackItems.length,
      stepFeedback,
      commonThemes,
      improvementSuggestions
    };
  }

  /**
   * Get feedback summaries for all scenarios
   */
  getAllFeedbackSummaries(): FeedbackSummary[] {
    const summaries: FeedbackSummary[] = [];

    this.scenarios.forEach((_, scenarioId) => {
      const summary = this.getFeedbackSummary(scenarioId);
      if (summary) {
        summaries.push(summary);
      }
    });

    return summaries;
  }

  /**
   * Analyze scenario results with feedback
   */
  analyzeScenarioResults(
    results: ScenarioResult[],
    feedbackItems: FeedbackItem[]
  ): {
    successRate: number;
    averageRating: number;
    correlations: {
      successVsRating: number;
      durationVsRating: number;
    };
    problemAreas: {
      scenarioId: string;
      scenarioName: string;
      successRate: number;
      averageRating: number;
      issues: string[];
    }[];
  } {
    // Add feedback
    this.addFeedbackBatch(feedbackItems);

    // Calculate success rate
    const successCount = results.filter(result => result.success).length;
    const successRate = (successCount / results.length) * 100;

    // Calculate average rating
    const totalRating = feedbackItems.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = totalRating / feedbackItems.length;

    // Calculate correlations
    const successVsRating = this.calculateCorrelation(
      results.map(result => result.success ? 1 : 0),
      feedbackItems.map(item => item.rating)
    );

    const durationVsRating = this.calculateCorrelation(
      results.map(result => result.totalDurationMs),
      feedbackItems.map(item => item.rating)
    );

    // Identify problem areas
    const problemAreas: {
      scenarioId: string;
      scenarioName: string;
      successRate: number;
      averageRating: number;
      issues: string[];
    }[] = [];

    // Group results by scenario
    const resultsByScenario = new Map<string, ScenarioResult[]>();
    results.forEach(result => {
      if (!resultsByScenario.has(result.scenarioId)) {
        resultsByScenario.set(result.scenarioId, []);
      }
      resultsByScenario.get(result.scenarioId)!.push(result);
    });

    // Group feedback by scenario
    const feedbackByScenario = new Map<string, FeedbackItem[]>();
    feedbackItems.forEach(item => {
      if (!feedbackByScenario.has(item.scenarioId)) {
        feedbackByScenario.set(item.scenarioId, []);
      }
      feedbackByScenario.get(item.scenarioId)!.push(item);
    });

    // Analyze each scenario
    this.scenarios.forEach((scenario, scenarioId) => {
      const scenarioResults = resultsByScenario.get(scenarioId) || [];
      const scenarioFeedback = feedbackByScenario.get(scenarioId) || [];

      if (scenarioResults.length === 0 || scenarioFeedback.length === 0) {
        return;
      }

      // Calculate scenario success rate
      const scenarioSuccessCount = scenarioResults.filter(result => result.success).length;
      const scenarioSuccessRate = (scenarioSuccessCount / scenarioResults.length) * 100;

      // Calculate scenario average rating
      const scenarioTotalRating = scenarioFeedback.reduce((sum, item) => sum + item.rating, 0);
      const scenarioAverageRating = scenarioTotalRating / scenarioFeedback.length;

      // Identify issues
      const issues: string[] = [];

      // Low success rate
      if (scenarioSuccessRate < 80) {
        issues.push(`Low success rate: ${scenarioSuccessRate.toFixed(2)}%`);
      }

      // Low rating
      if (scenarioAverageRating < 3) {
        issues.push(`Low user satisfaction: ${scenarioAverageRating.toFixed(2)}/5`);
      }

      // Failed steps
      const failedSteps = new Set<string>();
      scenarioResults.forEach(result => {
        result.stepResults
          .filter(step => !step.success)
          .forEach(step => failedSteps.add(step.name));
      });

      if (failedSteps.size > 0) {
        issues.push(`Problematic steps: ${Array.from(failedSteps).join(', ')}`);
      }

      // Add to problem areas if there are issues
      if (issues.length > 0) {
        problemAreas.push({
          scenarioId,
          scenarioName: scenario.name,
          successRate: scenarioSuccessRate,
          averageRating: scenarioAverageRating,
          issues
        });
      }
    });

    // Sort problem areas by severity (lowest success rate first)
    problemAreas.sort((a, b) => a.successRate - b.successRate);

    return {
      successRate,
      averageRating,
      correlations: {
        successVsRating,
        durationVsRating
      },
      problemAreas
    };
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;

    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate covariance and variances
    let covariance = 0;
    let varianceX = 0;
    let varianceY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;

      covariance += diffX * diffY;
      varianceX += diffX * diffX;
      varianceY += diffY * diffY;
    }

    // Calculate correlation coefficient
    if (varianceX === 0 || varianceY === 0) {
      return 0;
    }

    return covariance / Math.sqrt(varianceX * varianceY);
  }

  /**
   * Export feedback data
   */
  exportFeedbackData(): {
    feedback: FeedbackItem[];
    summaries: FeedbackSummary[];
  } {
    const summaries = this.getAllFeedbackSummaries();

    return {
      feedback: [...this.feedback],
      summaries
    };
  }

  /**
   * Import feedback data
   */
  importFeedbackData(data: {
    feedback: FeedbackItem[];
    summaries?: FeedbackSummary[];
  }): void {
    // Clear existing data
    this.feedback = [];

    // Import feedback
    this.addFeedbackBatch(data.feedback);

    this.logger.info(`Imported ${data.feedback.length} feedback items`);
  }
}
