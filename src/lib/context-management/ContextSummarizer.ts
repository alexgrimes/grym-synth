import { TokenBudgets, Interaction, UserProfile, SystemState, ScoredPattern } from './types';
import { Pattern } from '../feature-memory/types';
import { Logger } from '../../utils/logger';

export class ContextSummarizer {
  private static readonly MAX_CONTEXT_TOKENS = 4096;
  private static readonly PRIORITY_WEIGHTS = {
    recentInteractions: 0.4,
    userPreferences: 0.3,
    patternMatches: 0.2,
    systemState: 0.1
  };

  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger({ namespace: 'context-summarizer' });
  }

  public summarizeForLLM(
    recentHistory: Interaction[],
    userProfile: UserProfile,
    relevantPatterns: Pattern[],
    systemState: SystemState
  ): string {
    try {
      const tokenBudgets = this.calculateTokenBudgets();

      // Generate summaries for each component
      const historySummary = this.summarizeHistory(recentHistory, tokenBudgets.recentInteractions);
      const preferenceSummary = this.summarizePreferences(userProfile, tokenBudgets.userPreferences);
      const patternSummary = this.summarizePatterns(relevantPatterns, tokenBudgets.patternMatches);
      const stateSummary = this.summarizeSystemState(systemState, tokenBudgets.systemState);

      return this.formatContext(
        historySummary,
        preferenceSummary,
        patternSummary,
        stateSummary
      );
    } catch (error) {
      this.logger.error('Error summarizing context', { error });
      return this.createFallbackContext(recentHistory, systemState);
    }
  }

  private calculateTokenBudgets(): TokenBudgets {
    const totalTokens = ContextSummarizer.MAX_CONTEXT_TOKENS;

    return {
      recentInteractions: Math.floor(totalTokens * ContextSummarizer.PRIORITY_WEIGHTS.recentInteractions),
      userPreferences: Math.floor(totalTokens * ContextSummarizer.PRIORITY_WEIGHTS.userPreferences),
      patternMatches: Math.floor(totalTokens * ContextSummarizer.PRIORITY_WEIGHTS.patternMatches),
      systemState: Math.floor(totalTokens * ContextSummarizer.PRIORITY_WEIGHTS.systemState)
    };
  }

  private summarizeHistory(history: Interaction[], tokenBudget: number): string {
    // Sort by importance and recency
    const sortedHistory = [...history].sort((a, b) => {
      const importanceDiff = b.metadata.importance - a.metadata.importance;
      if (importanceDiff !== 0) return importanceDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    let summary = '';
    let tokensUsed = 0;

    for (const interaction of sortedHistory) {
      const interactionSummary = this.createInteractionSummary(interaction);
      const summaryTokens = this.estimateTokenCount(interactionSummary);

      if (tokensUsed + summaryTokens > tokenBudget) break;

      summary += interactionSummary + '\n';
      tokensUsed += summaryTokens;
    }

    return summary.trim();
  }

  private summarizePreferences(profile: UserProfile, tokenBudget: number): string {
    const preferences: string[] = [];
    let tokensUsed = 0;

    // Sort preferences by confidence and frequency
    const sortedPreferences = Array.from(profile.preferences.entries())
      .sort(([, a], [, b]) => (b.confidence * b.frequency) - (a.confidence * a.frequency));

    for (const [key, data] of sortedPreferences) {
      const preferenceSummary = `${key}: ${data.value} (confidence: ${data.confidence.toFixed(2)})`;
      const summaryTokens = this.estimateTokenCount(preferenceSummary);

      if (tokensUsed + summaryTokens > tokenBudget) break;

      preferences.push(preferenceSummary);
      tokensUsed += summaryTokens;
    }

    return preferences.join('\n');
  }

  private summarizePatterns(patterns: Pattern[], tokenBudget: number): string {
    let summary = '';
    let tokensUsed = 0;

    for (const pattern of patterns) {
      const patternSummary = this.createPatternSummary(pattern);
      const summaryTokens = this.estimateTokenCount(patternSummary);

      if (tokensUsed + summaryTokens > tokenBudget) break;

      summary += patternSummary + '\n';
      tokensUsed += summaryTokens;
    }

    return summary.trim();
  }

  private summarizeSystemState(state: SystemState, tokenBudget: number): string {
    const summary = [
      `Current workflow: ${state.currentWorkflow || 'None'}`,
      `Active patterns: ${state.activePatterns.length}`,
      state.currentAudioProperties ?
        `Audio: ${state.currentAudioProperties.duration}s, ${state.currentAudioProperties.sampleRate}Hz` :
        'No audio loaded',
      `Memory usage: ${Math.round(state.resourceUsage.memory / 1024 / 1024)}MB`,
      `CPU usage: ${Math.round(state.resourceUsage.cpu * 100)}%`
    ].join('\n');

    if (this.estimateTokenCount(summary) > tokenBudget) {
      return this.createMinimalStateSummary(state);
    }

    return summary;
  }

  private formatContext(
    historySummary: string,
    preferenceSummary: string,
    patternSummary: string,
    stateSummary: string
  ): string {
    return `[Current Context]

Recent Interactions:
${historySummary}

User Preferences:
${preferenceSummary}

Relevant Patterns:
${patternSummary}

System State:
${stateSummary}`;
  }

  private createInteractionSummary(interaction: Interaction): string {
    return `[${interaction.type}] ${interaction.timestamp.toISOString()}: ${
      typeof interaction.content === 'string' ?
        interaction.content :
        JSON.stringify(interaction.content)
    }`;
  }

  private createPatternSummary(pattern: Pattern): string {
    return `Pattern ${pattern.id}: ${pattern.metadata.category} (${pattern.metadata.frequency} uses)`;
  }

  private createMinimalStateSummary(state: SystemState): string {
    return `Workflow: ${state.currentWorkflow || 'None'}, Patterns: ${state.activePatterns.length}`;
  }

  private createFallbackContext(recentHistory: Interaction[], systemState: SystemState): string {
    // Create minimal context when full summarization fails
    const lastInteraction = recentHistory[recentHistory.length - 1];
    return `[Minimal Context]
Last interaction: ${lastInteraction ? this.createInteractionSummary(lastInteraction) : 'None'}
Current workflow: ${systemState.currentWorkflow || 'None'}`;
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: average English word is ~5 characters
    return Math.ceil(text.length / 5);
  }
}
