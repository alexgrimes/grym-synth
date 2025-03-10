import { ImportanceScorer } from './importance-scorer';
import { Message } from './types';

describe('ImportanceScorer', () => {
  const mockLlmService = {
    calculateSimilarity: jest.fn()
  };

  const mockThemeDetector = {
    analyzeThemeAlignment: jest.fn()
  };

  const defaultConfig = {
    weights: {
      recency: 0.2,
      relevance: 0.25,
      interaction: 0.2,
      complexity: 0.15,
      theme: 0.1,
      keyTerms: 0.1
    },
    llmService: mockLlmService,
    themeDetector: mockThemeDetector
  };

  let scorer: ImportanceScorer;

  beforeEach(() => {
    scorer = new ImportanceScorer(defaultConfig);
    jest.clearAllMocks();
  });

  describe('calculateImportance', () => {
    const sampleMessages: Message[] = [
      {
        id: '1',
        content: 'Simple message',
        timestamp: new Date(),
        hasResponse: false
      },
      {
        id: '2',
        content: 'Technical discussion about API implementation and async functions',
        timestamp: new Date(),
        hasResponse: true,
        participantCount: 3,
        references: ['1']
      },
      {
        id: '3',
        content: '```typescript\nconst x: number = 42;\n```\nComplex code discussion',
        timestamp: new Date(),
        hasResponse: true,
        participantCount: 2
      }
    ];

    beforeEach(() => {
      mockLlmService.calculateSimilarity.mockResolvedValue(0.8);
      mockThemeDetector.analyzeThemeAlignment.mockResolvedValue(0.7);
    });

    it('should calculate importance scores for all messages', async () => {
      const currentContext = 'API implementation discussion';
      const results = await scorer.calculateImportance(sampleMessages, currentContext);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('scores');
        expect(result).toHaveProperty('finalScore');
        expect(Object.keys(result.scores)).toEqual([
          'recency',
          'relevance',
          'interaction',
          'complexity',
          'theme',
          'keyTerms'
        ]);
      });
    });

    it('should handle messages with code blocks', async () => {
      const results = await scorer.calculateImportance([sampleMessages[2]], 'code discussion');
      const { scores } = results[0];

      expect(scores.complexity).toBeGreaterThan(0.2); // Should have higher complexity due to code block
    });

    it('should consider interaction patterns', async () => {
      const results = await scorer.calculateImportance([sampleMessages[1]], 'discussion');
      const { scores } = results[0];

      expect(scores.interaction).toBeGreaterThan(0.5); // High interaction due to responses and participants
    });

    it('should handle missing LLM service gracefully', async () => {
      const scorerWithoutLLM = new ImportanceScorer({
        ...defaultConfig,
        llmService: undefined
      });

      const results = await scorerWithoutLLM.calculateImportance(sampleMessages, 'test');
      results.forEach(result => {
        expect(result.scores.relevance).toBe(0.5); // Should use default score
      });
    });

    it('should handle missing theme detector gracefully', async () => {
      const scorerWithoutTheme = new ImportanceScorer({
        ...defaultConfig,
        themeDetector: undefined
      });

      const results = await scorerWithoutTheme.calculateImportance(sampleMessages, 'test');
      results.forEach(result => {
        expect(result.scores.theme).toBe(0.5); // Should use default score
      });
    });

    it('should calculate recency scores correctly', async () => {
      const results = await scorer.calculateImportance(sampleMessages, 'test');
      
      // Most recent message should have highest recency score
      expect(results[2].scores.recency).toBeGreaterThan(results[0].scores.recency);
    });

    it('should handle technical content appropriately', async () => {
      const technicalMessage: Message = {
        id: '4',
        content: 'Discussion about API endpoints, database optimization, and algorithm complexity',
        timestamp: new Date(),
        hasResponse: true
      };

      const results = await scorer.calculateImportance([technicalMessage], 'technical discussion');
      const { scores } = results[0];

      expect(scores.keyTerms).toBeGreaterThan(0.3); // Should detect technical terms
    });
  });

  describe('error handling', () => {
    it('should handle LLM service errors gracefully', async () => {
      mockLlmService.calculateSimilarity.mockRejectedValue(new Error('LLM error'));

      const results = await scorer.calculateImportance([{
        id: '1',
        content: 'Test message',
        timestamp: new Date()
      }], 'test');

      expect(results[0].scores.relevance).toBe(0.5); // Should use fallback score
    });

    it('should handle theme detector errors gracefully', async () => {
      mockThemeDetector.analyzeThemeAlignment.mockRejectedValue(new Error('Theme error'));

      const results = await scorer.calculateImportance([{
        id: '1',
        content: 'Test message',
        timestamp: new Date()
      }], 'test');

      expect(results[0].scores.theme).toBe(0.5); // Should use fallback score
    });
  });
});