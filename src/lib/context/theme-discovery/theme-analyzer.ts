import { ThemeAnalysis } from './types';
import { OllamaProvider } from '../../llm/providers/ollama-provider';

export class ThemeAnalyzer {
  private llmProvider: OllamaProvider;

  constructor(model: string = 'llama2') {
    this.llmProvider = new OllamaProvider(model);
  }

  /**
   * Analyze themes from a text input
   */
  async analyzeThemes(text: string): Promise<Set<string>> {
    const analysis = await this.analyzeConversation(text);
    const themes = new Set<string>();

    // Extract themes from concepts
    analysis.concepts.forEach(concept => {
      themes.add(concept.name);
      concept.related.forEach(related => themes.add(related));
    });

    // Add recurring patterns as themes
    analysis.patterns.recurring.forEach(pattern => themes.add(pattern));

    return themes;
  }

  async analyzeConversation(content: string): Promise<ThemeAnalysis> {
    const prompt = `
      Analyze this conversation and identify:
      1. Key concepts being discussed
      2. How these concepts relate to each other
      3. Any recurring patterns or themes
      4. Depth of discussion in each area
      
      Provide your analysis in the following JSON format:
      {
        "concepts": [
          {
            "name": "concept name",
            "related": ["related concept 1", "related concept 2"],
            "depth": number (1-5, indicating depth of discussion)
          }
        ],
        "patterns": {
          "recurring": ["pattern 1", "pattern 2"],
          "emerging": ["emerging pattern 1", "emerging pattern 2"]
        }
      }

      Conversation:
      ${content}
    `;

    try {
      const response = await this.llmProvider.getResponse(prompt);
      const analysis = this.parseAnalysis(response);
      return this.validateAndNormalizeAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      throw new Error('Failed to analyze conversation');
    }
  }

  private parseAnalysis(response: string): ThemeAnalysis {
    try {
      // Find the JSON block in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse theme analysis');
    }
  }

  private validateAndNormalizeAnalysis(analysis: any): ThemeAnalysis {
    // Ensure the analysis has the required structure
    if (!analysis.concepts || !Array.isArray(analysis.concepts)) {
      throw new Error('Invalid analysis: missing concepts array');
    }

    if (!analysis.patterns || typeof analysis.patterns !== 'object') {
      throw new Error('Invalid analysis: missing patterns object');
    }

    // Normalize concepts
    const normalizedConcepts = analysis.concepts.map((concept: any) => ({
      name: this.normalizeConceptName(concept.name),
      related: Array.isArray(concept.related)
        ? concept.related.map(this.normalizeConceptName)
        : [],
      depth: this.normalizeDepth(concept.depth)
    }));

    // Normalize patterns
    const normalizedPatterns = {
      recurring: Array.isArray(analysis.patterns.recurring)
        ? analysis.patterns.recurring.map(this.normalizeConceptName)
        : [],
      emerging: Array.isArray(analysis.patterns.emerging)
        ? analysis.patterns.emerging.map(this.normalizeConceptName)
        : []
    };

    return {
      concepts: normalizedConcepts,
      patterns: normalizedPatterns
    };
  }

  private normalizeConceptName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphen
      .replace(/\s+/g, '-');    // Replace spaces with hyphens
  }

  private normalizeDepth(depth: any): number {
    const num = Number(depth);
    if (isNaN(num)) return 1;
    return Math.max(1, Math.min(5, Math.round(num)));
  }

  async batchAnalyze(conversations: Array<{ id: string; content: string }>): Promise<Map<string, ThemeAnalysis>> {
    const results = new Map<string, ThemeAnalysis>();
    
    // Process conversations in parallel with a concurrency limit
    const BATCH_SIZE = 5;
    for (let i = 0; i < conversations.length; i += BATCH_SIZE) {
      const batch = conversations.slice(i, i + BATCH_SIZE);
      const analysisPromises = batch.map(async conv => {
        try {
          const analysis = await this.analyzeConversation(conv.content);
          return { id: conv.id, analysis };
        } catch (error) {
          console.error(`Error analyzing conversation ${conv.id}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(analysisPromises);
      batchResults.forEach(result => {
        if (result) {
          results.set(result.id, result.analysis);
        }
      });
    }

    return results;
  }
}