import { RelevanceScorer } from '../RelevanceScorer';
import { InteractionContext } from '../types';
import { Pattern } from '../../feature-memory/types';

describe('RelevanceScorer', () => {
  let scorer: RelevanceScorer;
  let patterns: Pattern[];
  let context: InteractionContext;

  beforeEach(() => {
    scorer = new RelevanceScorer();

    // Create test patterns
    patterns = [
      // Recent, frequently used pattern
      {
        id: 'pattern1',
        features: new Map<string, any>([
          ['type', 'ambient'],
          ['complexity', 'high'],
          ['duration', 60]
        ]),
        confidence: 0.9,
        timestamp: new Date(), // Now
        metadata: {
          source: 'user',
          category: 'ambient',
          frequency: 8,
          lastUpdated: new Date()
        }
      },
      // Older pattern with medium frequency
      {
        id: 'pattern2',
        features: new Map<string, any>([
          ['type', 'rhythmic'],
          ['complexity', 'medium'],
          ['duration', 30]
        ]),
        confidence: 0.7,
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        metadata: {
          source: 'system',
          category: 'rhythmic',
          frequency: 4,
          lastUpdated: new Date()
        }
      },
      // Very old pattern with low frequency
      {
        id: 'pattern3',
        features: new Map<string, any>([
          ['type', 'melodic'],
          ['complexity', 'low'],
          ['duration', 120]
        ]),
        confidence: 0.6,
        timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        metadata: {
          source: 'user',
          category: 'melodic',
          frequency: 1,
          lastUpdated: new Date()
        }
      }
    ];

    // Create test context
    context = {
      query: 'ambient music with high complexity',
      currentWorkflow: 'ambient',
      activePatterns: [],
      audioProperties: {
        duration: 60,
        sampleRate: 44100,
        channels: 2
      }
    };
  });

  test('should score patterns based on relevance to context', () => {
    const scoredPatterns = scorer.scorePatternRelevance(patterns, context);

    // Verify patterns are scored and sorted
    expect(scoredPatterns.length).toBe(3);
    expect(scoredPatterns[0].pattern.id).toBe('pattern1'); // Most relevant
    expect(scoredPatterns[2].pattern.id).toBe('pattern3'); // Least relevant
  });

  test('should prioritize active patterns', () => {
    // Set pattern3 as active
    context.activePatterns = ['pattern3'];

    const scoredPatterns = scorer.scorePatternRelevance(patterns, context);

    // Verify pattern3 is now the most relevant despite being old with low frequency
    expect(scoredPatterns[0].pattern.id).toBe('pattern3');
  });

  test('should consider query term matches', () => {
    // Change query to match pattern2
    context.query = 'rhythmic medium complexity';
    context.currentWorkflow = 'rhythmic';

    const scoredPatterns = scorer.scorePatternRelevance(patterns, context);

    // Verify pattern2 is now more relevant than pattern1 despite being older
    expect(scoredPatterns[0].pattern.id).toBe('pattern2');
  });

  test('should consider audio property similarity', () => {
    // Change context duration to match pattern3
    context.audioProperties = {
      duration: 120,
      sampleRate: 44100,
      channels: 2
    };
    context.query = 'long duration';

    const scoredPatterns = scorer.scorePatternRelevance(patterns, context);

    // Verify pattern3 gets a higher score due to matching duration
    expect(scoredPatterns.find(p => p.pattern.id === 'pattern3')?.score).toBeGreaterThan(0.2);
  });

  test('should limit the number of returned patterns', () => {
    const scoredPatterns = scorer.scorePatternRelevance(patterns, context, 2);

    // Verify only 2 patterns are returned
    expect(scoredPatterns.length).toBe(2);
    expect(scoredPatterns[0].pattern.id).toBe('pattern1');
    expect(scoredPatterns[1].pattern.id).toBe('pattern2');
  });

  test('should handle empty patterns array', () => {
    const scoredPatterns = scorer.scorePatternRelevance([], context);

    // Verify empty array is returned
    expect(scoredPatterns).toEqual([]);
  });

  test('should handle errors gracefully', () => {
    // Mock calculateRelevanceScore to throw an error
    jest.spyOn(scorer as any, 'calculateRelevanceScore').mockImplementation(() => {
      throw new Error('Test error');
    });

    const scoredPatterns = scorer.scorePatternRelevance(patterns, context);

    // Verify empty array is returned on error
    expect(scoredPatterns).toEqual([]);
  });
});
