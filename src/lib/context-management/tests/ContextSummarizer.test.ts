import { ContextSummarizer } from '../ContextSummarizer';
import { Interaction, UserProfile, SystemState } from '../types';
import { Pattern } from '../../feature-memory/types';

describe('ContextSummarizer', () => {
  let summarizer: ContextSummarizer;
  let mockHistory: Interaction[];
  let mockProfile: UserProfile;
  let mockPatterns: Pattern[];
  let mockState: SystemState;

  beforeEach(() => {
    summarizer = new ContextSummarizer();

    mockHistory = [
      {
        id: '1',
        timestamp: new Date(),
        type: 'user-input',
        content: 'Generate ambient sound',
        metadata: {
          importance: 0.8,
          category: 'generation'
        }
      }
    ];

    mockProfile = {
      id: 'user1',
      preferences: new Map([
        ['ambient_complexity', { value: 'high', confidence: 0.9, lastUpdated: new Date(), source: 'explicit', frequency: 5 }]
      ]),
      interactionHistory: ['1'],
      favoritePatterns: ['pattern1'],
      workflowHistory: ['workflow1']
    };

    mockPatterns = [{
      id: 'pattern1',
      features: new Map<string, any>([
        ['type', 'ambient'],
        ['complexity', 'high']
      ]),
      confidence: 0.9,
      timestamp: new Date(),
      metadata: {
        source: 'user',
        category: 'ambient',
        frequency: 3,
        lastUpdated: new Date()
      }
    }];

    mockState = {
      currentWorkflow: 'generation',
      activePatterns: ['pattern1'],
      resourceUsage: {
        memory: 1024 * 1024 * 100,  // 100MB
        cpu: 0.4
      }
    };
  });

  test('should summarize context without errors', () => {
    const result = summarizer.summarizeForLLM(
      mockHistory,
      mockProfile,
      mockPatterns,
      mockState
    );

    expect(result).toBeDefined();
    expect(result).toContain('Recent Interactions');
    expect(result).toContain('User Preferences');
    expect(result).toContain('Relevant Patterns');
    expect(result).toContain('System State');
  });

  test('should handle empty history', () => {
    const result = summarizer.summarizeForLLM(
      [],
      mockProfile,
      mockPatterns,
      mockState
    );

    expect(result).toBeDefined();
    expect(result).not.toContain('undefined');
  });

  test('should prioritize recent and important interactions', () => {
    const oldInteraction: Interaction = {
      id: '2',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      type: 'user-input',
      content: 'Old interaction',
      metadata: {
        importance: 0.3,
        category: 'misc'
      }
    };

    const importantInteraction: Interaction = {
      id: '3',
      timestamp: new Date(),
      type: 'audio-generation',
      content: 'Important generation',
      metadata: {
        importance: 0.9,
        category: 'generation'
      }
    };

    mockHistory = [oldInteraction, importantInteraction];

    const result = summarizer.summarizeForLLM(
      mockHistory,
      mockProfile,
      mockPatterns,
      mockState
    );

    const oldIndex = result.indexOf('Old interaction');
    const importantIndex = result.indexOf('Important generation');

    // Important interaction should appear before old interaction in the summary
    expect(importantIndex).toBeLessThan(oldIndex);
  });

  test('should handle system state changes', () => {
    mockState.currentWorkflow = undefined;
    mockState.activePatterns = [];

    const result = summarizer.summarizeForLLM(
      mockHistory,
      mockProfile,
      mockPatterns,
      mockState
    );

    expect(result).toContain('None');
    expect(result).not.toContain('undefined');
  });

  test('should create fallback context when summarization fails', () => {
    // Mock the summarizeHistory method to throw an error
    jest.spyOn(summarizer as any, 'summarizeHistory').mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = summarizer.summarizeForLLM(
      mockHistory,
      mockProfile,
      mockPatterns,
      mockState
    );

    expect(result).toContain('[Minimal Context]');
    expect(result).toBeDefined();
    expect(result).not.toContain('undefined');
  });
});
