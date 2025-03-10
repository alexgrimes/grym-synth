import '@testing-library/jest-dom';
import { ResearchAssistant } from './research-assistant';
import { LLMProvider, Message, ChatOptions, ChatResponse, ModelCapabilities } from '../llm/types';

// Mock LLM Provider for testing
class MockLLMProvider implements LLMProvider {
  name = 'Mock Provider';
  endpoint = 'mock://localhost';
  contextLimit = 8192;

  async chat(options: ChatOptions): Promise<ChatResponse> {
    // Simulate theme analysis response
    if (options.messages.some(m => m.content.includes('theme graph data'))) {
      return {
        role: 'assistant',
        content: JSON.stringify([{
          type: 'trend',
          title: 'Increasing Focus on Testing',
          description: 'There is a growing emphasis on testing methodologies',
          confidence: 0.85,
          relatedThemes: ['testing', 'quality', 'automation'],
          actionable: true
        }])
      };
    }
    
    return {
      role: 'assistant',
      content: 'Mock response'
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async getCapabilities(): Promise<ModelCapabilities> {
    return {
      contextWindow: this.contextLimit,
      streamingSupport: false,
      specialTokens: {},
      modelType: 'chat'
    };
  }
}

describe('ResearchAssistant', () => {
  let assistant: ResearchAssistant;
  let mockProvider: LLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    assistant = new ResearchAssistant(mockProvider);
  });

  describe('analyzeConversation', () => {
    it('should analyze conversation and return research results', async () => {
      const conversation = `
        User: Let's discuss testing strategies.
        Assistant: There are several approaches to testing:
        1. Unit testing
        2. Integration testing
        3. End-to-end testing
        User: How do we implement unit tests?
        Assistant: Unit tests focus on testing individual components...
      `;

      const result = await assistant.analyzeConversation(conversation, 'test-convo-1');

      // Verify analysis structure
      expect(result.analysis).toBeDefined();
      expect(result.analysis.concepts).toBeInstanceOf(Array);
      expect(result.analysis.patterns).toBeDefined();

      // Verify visualization data
      expect(result.visualization).toBeDefined();
      expect(result.visualization.nodes).toBeInstanceOf(Array);
      expect(result.visualization.links).toBeInstanceOf(Array);
      expect(result.visualization.clusters).toBeInstanceOf(Array);

      // Verify insights
      expect(result.insights).toBeInstanceOf(Array);
      if (result.insights.length > 0) {
        expect(result.insights[0]).toMatchObject({
          type: 'trend',
          title: 'Increasing Focus on Testing',
          confidence: 0.85,
          actionable: true
        });
      }

      // Verify suggested explorations
      expect(result.suggestedExplorations).toBeInstanceOf(Array);
    });
  });

  describe('incorporateFeedback', () => {
    it('should update theme weights based on feedback', () => {
      const feedback = {
        themeAccuracy: true,
        missingConnections: ['testing-automation'],
        userInsights: 'Testing and automation are closely related'
      };

      assistant.incorporateFeedback(feedback);

      // Get emerging themes after feedback
      const emergingThemes = assistant.getEmergingThemes();
      expect(emergingThemes).toContain('testing');
      expect(emergingThemes).toContain('automation');
    });
  });

  describe('getVisualization', () => {
    it('should return current knowledge map state', async () => {
      // First add some data
      await assistant.analyzeConversation('Testing discussion...', 'test-convo-2');

      const visualization = assistant.getVisualization();

      expect(visualization.nodes.length).toBeGreaterThan(0);
      expect(visualization.links.length).toBeGreaterThanOrEqual(0);
      expect(visualization.clusters.length).toBeGreaterThanOrEqual(0);

      // Verify node structure
      const node = visualization.nodes[0];
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('size');
      expect(node).toHaveProperty('depth');
      expect(node).toHaveProperty('connections');
    });
  });

  describe('getInsights', () => {
    it('should generate research insights', async () => {
      // First add some data
      await assistant.analyzeConversation('Testing discussion...', 'test-convo-3');

      const insights = await assistant.getInsights();

      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);

      // Verify insight structure
      const insight = insights[0];
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('title');
      expect(insight).toHaveProperty('description');
      expect(insight).toHaveProperty('confidence');
      expect(insight).toHaveProperty('relatedThemes');
      expect(insight).toHaveProperty('actionable');
    });
  });
});