import { ThemeGraph } from './theme-graph';
import { ThemeAnalyzer } from './theme-analyzer';
import { Pattern, ThemeAnalysis, TimeRange, TrendPrediction } from './types';

export interface ThemeDiscoveryResult {
  newThemes: string[];
  evolvedThemes: Map<string, string[]>;
  connections: Map<string, string[]>;
}

export class DynamicThemeDiscovery {
  private themeGraph: ThemeGraph;
  private analyzer: ThemeAnalyzer;
  private readonly PRUNE_THRESHOLD = 30; // Days before pruning inactive themes

  constructor(llmModel: string = 'llama2') {
    this.themeGraph = new ThemeGraph();
    this.analyzer = new ThemeAnalyzer(llmModel);
  }

  async analyzeConversation(content: string, conversationId: string): Promise<ThemeDiscoveryResult> {
    try {
      // Get LLM analysis of the conversation
      const analysis = await this.analyzer.analyzeConversation(content);
      
      // Update theme graph with new information
      this.updateThemeGraph(analysis, conversationId);

      // Look for emerging patterns
      return this.findEmergingPatterns();
    } catch (error) {
      console.error('Error in conversation analysis:', error);
      throw new Error('Failed to analyze conversation');
    }
  }

  private updateThemeGraph(analysis: ThemeAnalysis, conversationId: string): void {
    // Update each concept in the theme graph
    analysis.concepts.forEach(concept => {
      this.themeGraph.updateNode(concept.name, conversationId, concept.related);
    });

    // Add emerging patterns as potential themes
    analysis.patterns.emerging.forEach(pattern => {
      this.themeGraph.addNode(pattern);
    });
  }

  private findEmergingPatterns(): ThemeDiscoveryResult {
    // Get emerging themes
    const newThemes = this.themeGraph.getEmergingThemes();

    // Get theme connections
    const connections = this.themeGraph.findConnections();

    // Track theme evolution
    const evolvedThemes = new Map<string, string[]>();
    newThemes.forEach(theme => {
      const themeDetails = this.themeGraph.getThemeDetails(theme);
      if (themeDetails && themeDetails.evolution.branches.size > 0) {
        // Get the latest branch
        const branches = Array.from(themeDetails.evolution.branches.entries());
        const latestBranch = branches[branches.length - 1];
        if (latestBranch) {
          evolvedThemes.set(theme, latestBranch[1]);
        }
      }
    });

    return {
      newThemes,
      evolvedThemes,
      connections
    };
  }

  async batchAnalyzeConversations(
    conversations: Array<{ id: string; content: string }>
  ): Promise<ThemeDiscoveryResult> {
    // Analyze all conversations
    const analysisResults = await this.analyzer.batchAnalyze(conversations);

    // Update theme graph with all results
    analysisResults.forEach((analysis, conversationId) => {
      this.updateThemeGraph(analysis, conversationId);
    });

    // Find patterns across all analyzed conversations
    return this.findEmergingPatterns();
  }

  findPatterns(timeRange?: TimeRange): Pattern[] {
    return this.themeGraph.findPatterns(timeRange);
  }

  getThemeDetails(theme: string) {
    return this.themeGraph.getThemeDetails(theme);
  }

  getAllThemes(): string[] {
    return this.themeGraph.getAllThemes();
  }

  pruneInactiveThemes(): void {
    this.themeGraph.pruneInactiveThemes(this.PRUNE_THRESHOLD);
  }

  // Helper method to get a summary of the current state
  getDiscoveryStatus(): {
    totalThemes: number;
    activeThemes: string[];
    topConnections: Array<[string, string[]]>;
  } {
    const allThemes = this.getAllThemes();
    const connections = this.themeGraph.findConnections();
    
    // Sort connections by number of related themes
    const sortedConnections = Array.from(connections.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10); // Get top 10 most connected themes

    return {
      totalThemes: allThemes.length,
      activeThemes: this.themeGraph.getEmergingThemes(),
      topConnections: sortedConnections
    };
  }
}