import { EventEmitter } from 'events';
import { ContextManager } from '../context-manager';
import { ContextStorageAdapter } from './storage';
import { ThemeAnalyzer } from '../theme-discovery/theme-analyzer';
import { Message } from '../../storage/types';
import { OllamaProvider } from '../../llm/providers/ollama-provider';
import {
  ModelSpecialization,
  ModelContextState,
  ContextRoutingConfig,
  RoutingResult,
  ContextPreparationParams,
  PreparedContext,
  SummarizationOptions,
  ContextError,
  ContextEvent
} from './types';

/**
 * Manages specialized context for different models with varying capabilities
 */
export class SpecializedContextManager extends EventEmitter {
  private modelContexts = new Map<string, ModelContextState>();
  private storage: ContextStorageAdapter;
  private themeAnalyzer: ThemeAnalyzer;
  private baseContextManager: ContextManager;
  private config: ContextRoutingConfig;
  private llmProvider: OllamaProvider;

  constructor(
    baseContextManager: ContextManager,
    config: ContextRoutingConfig
  ) {
    super();
    this.baseContextManager = baseContextManager;
    this.storage = new ContextStorageAdapter();
    this.themeAnalyzer = new ThemeAnalyzer();
    this.config = config;
    this.llmProvider = new OllamaProvider('deepseek-r1:14b');
  }

  /**
   * Initialize the context manager and load persisted contexts
   */
  async init() {
    await this.storage.init();
    await this.loadPersistedContexts();
  }

  /**
   * Route a query to the most suitable model based on content and themes
   */
  async routeQueryToModel(query: string, context: string[]): Promise<RoutingResult> {
    try {
      // Analyze query themes
      const queryThemes = await this.themeAnalyzer.analyzeThemes(query);
      
      // Find best model match
      const bestModel = await this.findBestModelMatch(query, queryThemes);
      
      // Prepare specialized context
      const preparedContext = await this.prepareSpecializedContext({
        model: bestModel,
        baseContext: context,
        query,
        themes: queryThemes
      });

      // Generate followup suggestions based on model strengths
      const followups = this.generateFollowups(bestModel, queryThemes);

      return {
        model: bestModel,
        context: preparedContext.context,
        suggestedFollowups: followups,
        relevanceScore: this.calculateRelevanceScore(bestModel, queryThemes)
      };
    } catch (error) {
      console.error('Failed to route query:', error);
      throw new Error(ContextError.ROUTING_FAILED);
    }
  }

  /**
   * Convert string content to Message objects
   */
  private convertToMessages(content: string[]): Message[] {
    return content.map((text, index) => ({
      id: `msg-${Date.now()}-${index}`,
      conversationId: 'specialized-context',
      role: 'system',
      content: text,
      timestamp: Date.now()
    }));
  }

  /**
   * Generate summary using LLM
   */
  private async generateSummary(content: string[]): Promise<string> {
    const prompt = `
      Summarize the following content while preserving key information:
      ${content.join('\n')}
    `;

    const response = await this.llmProvider.getResponse(prompt);
    return response;
  }

  /**
   * Find the best model match for a query based on themes and model strengths
   */
  private async findBestModelMatch(
    query: string,
    themes: Set<string>
  ): Promise<ModelSpecialization> {
    let bestScore = -1;
    let bestModel = null;

    // Convert Map entries to array for iteration
    const modelEntries = Array.from(this.modelContexts.entries());
    
    for (const [_, state] of modelEntries) {
      const score = this.calculateModelScore(state.specialization, themes);
      if (score > bestScore) {
        bestScore = score;
        bestModel = state.specialization;
      }
    }

    if (!bestModel || bestScore < this.config.minRelevanceScore) {
      return this.getDefaultModel();
    }

    return bestModel;
  }

  /**
   * Prepare context specialized for a specific model
   */
  private async prepareSpecializedContext(
    params: ContextPreparationParams
  ): Promise<PreparedContext> {
    const { model, baseContext, query, themes } = params;
    
    // Filter context based on model's domains and themes
    const relevantContext = this.filterRelevantContext(
      baseContext,
      model.strengths.domains,
      themes
    );

    // Check if we need to summarize based on model's context size
    if (this.exceedsContextLimit(relevantContext, model.strengths.contextSize)) {
      return await this.summarizeContext({
        strategy: model.contextManager.summarizationStrategy,
        maxTokens: model.strengths.contextSize,
        preserveThemes: themes || new Set(),
        priorityTopics: model.contextManager.priorityTopics
      }, relevantContext);
    }

    return {
      context: relevantContext,
      themes: themes || new Set(),
      tokens: this.estimateTokenCount(relevantContext)
    };
  }

  /**
   * Summarize context based on strategy and constraints
   */
  private async summarizeContext(
    options: SummarizationOptions,
    context: string[]
  ): Promise<PreparedContext> {
    const { strategy, maxTokens, preserveThemes, priorityTopics } = options;

    // Convert themes to array for iteration
    const themesToPreserve = Array.from(preserveThemes);
    
    // Filter messages that contain priority themes or topics
    const priorityContext = context.filter(msg => 
      themesToPreserve.some(theme => msg.toLowerCase().includes(theme.toLowerCase())) ||
      priorityTopics.some(topic => msg.toLowerCase().includes(topic.toLowerCase()))
    );

    // Calculate remaining token budget
    const priorityTokens = this.estimateTokenCount(priorityContext);
    const remainingTokens = maxTokens - priorityTokens;

    if (remainingTokens <= 0) {
      // If we're over budget even with priority messages, summarize aggressively
      const summary = await this.generateSummary(priorityContext);
      return {
        context: [summary],
        themes: preserveThemes,
        tokens: this.estimateTokenCount([summary]),
        summary
      };
    }

    // Handle remaining context based on strategy
    const remainingContext = context.filter(msg => !priorityContext.includes(msg));
    let summarizedContext: string[] = [];

    switch (strategy) {
      case 'aggressive':
        // Summarize all remaining context into one summary
        const aggSummary = await this.generateSummary(remainingContext);
        summarizedContext = [aggSummary];
        break;

      case 'minimal':
        // Keep as much original context as possible
        summarizedContext = this.truncateToFit(remainingContext, remainingTokens);
        break;

      case 'selective':
        // Group by theme and summarize each group
        const themeGroups = await this.groupByThemes(remainingContext);
        for (const group of themeGroups) {
          if (this.estimateTokenCount(summarizedContext) < remainingTokens) {
            const groupSummary = await this.generateSummary(group);
            summarizedContext.push(groupSummary);
          }
        }
        break;
    }

    const finalContext = [...priorityContext, ...summarizedContext];
    return {
      context: finalContext,
      themes: preserveThemes,
      tokens: this.estimateTokenCount(finalContext)
    };
  }

  /**
   * Filter context based on relevance to domains and themes
   */
  private filterRelevantContext(
    context: string[],
    domains: string[],
    themes?: Set<string>
  ): string[] {
    return context.filter(item => {
      const matchesDomain = domains.some(domain => 
        item.toLowerCase().includes(domain.toLowerCase())
      );
      
      const matchesTheme = !themes || Array.from(themes).some(theme =>
        item.toLowerCase().includes(theme.toLowerCase())
      );

      return matchesDomain || matchesTheme;
    });
  }

  /**
   * Calculate model's score for handling a query with given themes
   */
  private calculateModelScore(
    model: ModelSpecialization,
    themes: Set<string>
  ): number {
    let score = 0;

    // Convert Set to array for iteration
    const themeArray = Array.from(themes);

    // Score based on theme matches
    for (const theme of themeArray) {
      if (model.contextManager.priorityTopics.includes(theme)) {
        score += this.config.themeWeights[theme] || 1;
      }
    }

    // Bonus for specialized features
    score += model.strengths.specialFeatures.length * 0.5;

    return score;
  }

  /**
   * Calculate relevance score for model and themes
   */
  private calculateRelevanceScore(
    model: ModelSpecialization,
    themes: Set<string>
  ): number {
    const score = this.calculateModelScore(model, themes);
    return Math.min(score / 10, 1); // Normalize to 0-1
  }

  /**
   * Generate followup suggestions based on model strengths
   */
  private generateFollowups(
    model: ModelSpecialization,
    themes: Set<string>
  ): string[] {
    const followups: string[] = [];

    // Add domain-specific followups
    for (const domain of model.strengths.domains) {
      followups.push(`Tell me more about ${domain}`);
    }

    // Convert Set to array for iteration
    const themeArray = Array.from(themes);

    // Add theme-based followups
    for (const theme of themeArray) {
      if (model.contextManager.priorityTopics.includes(theme)) {
        followups.push(`Explore ${theme} in more detail`);
      }
    }

    return followups.slice(0, 3); // Limit to top 3 suggestions
  }

  /**
   * Check if context exceeds model's token limit
   */
  private exceedsContextLimit(context: string[], limit: number): boolean {
    return this.estimateTokenCount(context) > limit;
  }

  /**
   * Estimate token count for context
   */
  private estimateTokenCount(context: string[]): number {
    return context.reduce((sum, item) => sum + item.length / 4, 0);
  }

  /**
   * Get default model for fallback
   */
  private getDefaultModel(): ModelSpecialization {
    const defaultModel = this.modelContexts.get(this.config.defaultModel);
    if (!defaultModel) {
      throw new Error(ContextError.INVALID_MODEL);
    }
    return defaultModel.specialization;
  }

  /**
   * Truncate context to fit within token limit
   */
  private truncateToFit(context: string[], maxTokens: number): string[] {
    const result: string[] = [];
    let totalTokens = 0;

    for (const item of context) {
      const tokens = this.estimateTokenCount([item]);
      if (totalTokens + tokens <= maxTokens) {
        result.push(item);
        totalTokens += tokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Group context messages by themes
   */
  private async groupByThemes(context: string[]): Promise<string[][]> {
    const groups: Map<string, string[]> = new Map();

    for (const msg of context) {
      const themes = await this.themeAnalyzer.analyzeThemes(msg);
      const key = Array.from(themes).sort().join(',');
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(msg);
    }

    return Array.from(groups.values());
  }

  /**
   * Load persisted contexts from storage
   */
  private async loadPersistedContexts() {
    const contexts = await this.storage.getContextsByPlatform('ollama');
    contexts.forEach(context => {
      this.modelContexts.set(context.modelId, {
        activeThemes: new Set(context.activeThemes),
        relevantContext: context.relevantContext,
        specialization: context.specialization,
        lastUsed: context.lastUsed
      });
    });
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.storage.close();
    this.removeAllListeners();
  }
}