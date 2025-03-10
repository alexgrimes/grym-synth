import { ThemeGraph } from './theme-graph';
import { ResearchInsightGenerator } from './insight-generator';
import { 
  ResearchAssistantResult, 
  ThemeAnalysis, 
  KnowledgeMap, 
  ResearchInsight,
  UserFeedback 
} from './types';
import { LLMProvider } from '../llm/types';

export class ResearchAssistant {
  private themeGraph: ThemeGraph;
  private insightGenerator: ResearchInsightGenerator;

  constructor(llmProvider: LLMProvider) {
    this.themeGraph = new ThemeGraph();
    this.insightGenerator = new ResearchInsightGenerator(llmProvider, this.themeGraph);
  }

  async analyzeConversation(
    conversation: string,
    conversationId: string
  ): Promise<ResearchAssistantResult> {
    // Extract themes and relationships from conversation
    const themes = await this.extractThemes(conversation);

    // Update theme graph
    themes.concepts.forEach(concept => {
      this.themeGraph.addNode(concept.name);
      this.themeGraph.updateNode(
        concept.name,
        conversationId,
        concept.related
      );
    });

    // Generate visualization data
    const visualization = this.themeGraph.createKnowledgeMap();

    // Generate insights
    const insights = await this.insightGenerator.generateInsights();

    // Generate suggestions for further exploration
    const suggestedExplorations = await this.insightGenerator.generateSuggestions();

    return {
      analysis: themes,
      visualization,
      insights,
      suggestedExplorations
    };
  }

  private async extractThemes(content: string): Promise<ThemeAnalysis> {
    // This would typically use the LLM to extract themes
    // For now, return a simple analysis based on word frequency
    const words = content.toLowerCase().split(/\W+/);
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) { // Skip short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // Get top themes
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Create simple relationships based on word proximity
    const concepts = sortedWords.map(([word, count]) => {
      const related = sortedWords
        .filter(([other]) => other !== word)
        .slice(0, 3)
        .map(([other]) => other);

      return {
        name: word,
        related,
        depth: Math.min(Math.ceil(Math.log2(count + 1)), 5)
      };
    });

    return {
      concepts,
      patterns: {
        recurring: sortedWords.slice(0, 3).map(([word]) => word),
        emerging: sortedWords.slice(3, 5).map(([word]) => word)
      }
    };
  }

  incorporateFeedback(feedback: UserFeedback): void {
    // Update theme weights based on accuracy feedback
    if (!feedback.themeAccuracy) {
      this.themeGraph.pruneInactiveThemes(7); // Remove themes inactive for 7 days
    }

    // Add missing connections
    feedback.missingConnections.forEach(connection => {
      const [source, target] = connection.split('-');
      if (source && target) {
        this.themeGraph.addNode(source);
        this.themeGraph.addNode(target);
        this.themeGraph.updateNode(source, 'feedback', [target]);
        this.themeGraph.updateNode(target, 'feedback', [source]);
      }
    });
  }

  getEmergingThemes(): string[] {
    return this.themeGraph.getEmergingThemes();
  }

  async getInsights(): Promise<ResearchInsight[]> {
    return this.insightGenerator.generateInsights();
  }

  getVisualization(): KnowledgeMap {
    return this.themeGraph.createKnowledgeMap();
  }
}