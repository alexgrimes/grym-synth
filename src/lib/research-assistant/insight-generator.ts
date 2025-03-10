import { ThemeGraph } from './theme-graph';
import { ResearchInsight, ThemeAnalysis } from './types';
import { LLMProvider } from '../llm/types';

export class ResearchInsightGenerator {
  private llmProvider: LLMProvider;
  private themeGraph: ThemeGraph;

  constructor(llmProvider: LLMProvider, themeGraph: ThemeGraph) {
    this.llmProvider = llmProvider;
    this.themeGraph = themeGraph;
  }

  async generateInsights(): Promise<ResearchInsight[]> {
    const graphData = this.prepareGraphData();
    const prompt = this.createAnalysisPrompt(graphData);
    
    const analysis = await this.llmProvider.chat({
      messages: [{
        role: 'system',
        content: 'You are a research insights analyzer. Analyze the provided theme graph data and generate meaningful insights about learning patterns, connections, and potential areas for exploration.'
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0.7
    });

    return this.parseInsights(analysis.content);
  }

  private prepareGraphData() {
    const nodes = this.themeGraph.getAllNodes();
    const connections = this.themeGraph.findConnections();
    const emerging = this.themeGraph.getEmergingThemes();

    return {
      themes: nodes.map(node => ({
        name: node.id,
        occurrences: node.occurrences,
        depth: node.evolution.depth,
        firstSeen: node.firstSeen,
        lastSeen: node.lastSeen,
        relatedConcepts: Array.from(node.relatedConcepts.entries())
          .map(([concept, strength]) => ({ concept, strength }))
      })),
      connections: Array.from(connections.entries())
        .map(([theme, related]) => ({ theme, related })),
      emergingThemes: emerging
    };
  }

  private createAnalysisPrompt(data: any): string {
    return `
Analyze the following theme graph data and generate research insights:

Theme Data:
${JSON.stringify(data.themes, null, 2)}

Theme Connections:
${JSON.stringify(data.connections, null, 2)}

Emerging Themes:
${JSON.stringify(data.emergingThemes, null, 2)}

Generate insights in the following categories:
1. Trends: Identify patterns in how themes evolve and grow
2. Connections: Find meaningful relationships between different themes
3. Gaps: Identify potential areas that need more exploration
4. Suggestions: Recommend specific areas or connections to explore further

For each insight, provide:
- A clear title
- A detailed description
- Confidence level (0-1)
- Related themes
- Whether it's actionable

Format each insight as a JSON object following this structure:
{
  "type": "trend|connection|gap|suggestion",
  "title": "string",
  "description": "string",
  "confidence": number,
  "relatedThemes": string[],
  "actionable": boolean
}
`;
  }

  private parseInsights(response: string): ResearchInsight[] {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return this.generateFallbackInsights();
      }

      const insights: ResearchInsight[] = JSON.parse(jsonMatch[0]);
      return this.validateInsights(insights);
    } catch (error) {
      console.error('Error parsing insights:', error);
      return this.generateFallbackInsights();
    }
  }

  private validateInsights(insights: ResearchInsight[]): ResearchInsight[] {
    return insights.filter(insight => {
      return (
        insight.type &&
        ['trend', 'connection', 'gap', 'suggestion'].includes(insight.type) &&
        typeof insight.title === 'string' &&
        typeof insight.description === 'string' &&
        typeof insight.confidence === 'number' &&
        Array.isArray(insight.relatedThemes) &&
        typeof insight.actionable === 'boolean'
      );
    });
  }

  private generateFallbackInsights(): ResearchInsight[] {
    const emerging = this.themeGraph.getEmergingThemes();
    
    return [{
      type: 'trend',
      title: 'Emerging Themes Detected',
      description: `Found ${emerging.length} emerging themes that show recent activity and connections.`,
      confidence: 0.8,
      relatedThemes: emerging,
      actionable: true
    }];
  }

  async generateSuggestions(): Promise<string[]> {
    const insights = await this.generateInsights();
    return insights
      .filter(insight => insight.type === 'suggestion' && insight.actionable)
      .map(insight => insight.description);
  }
}