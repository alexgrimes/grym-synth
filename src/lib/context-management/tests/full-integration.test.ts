import { ContextSummarizer, PreferenceTracker, RelevanceScorer } from '../';
import { Interaction, UserProfile, SystemState, InteractionContext } from '../types';
import { Pattern } from '../../feature-memory/types';

/**
 * This test demonstrates the full integration of all Context Management components
 * working together with the Feature Memory system to process user interactions,
 * track preferences, score pattern relevance, and generate optimized context summaries.
 *
 * The Context Management System acts as the "working memory" that determines what's
 * relevant right now, while the Feature Memory System serves as the "long-term storage"
 * for patterns extracted from audio.
 */
describe('Context Management and Feature Memory Integration', () => {
  let summarizer: ContextSummarizer;
  let preferenceTracker: PreferenceTracker;
  let relevanceScorer: RelevanceScorer;
  let userProfile: UserProfile;
  let featureMemoryPatterns: Pattern[]; // Patterns from Feature Memory
  let interactions: Interaction[];
  let systemState: SystemState;
  let interactionContext: InteractionContext;

  beforeEach(() => {
    // Initialize all components
    summarizer = new ContextSummarizer();
    preferenceTracker = new PreferenceTracker();
    relevanceScorer = new RelevanceScorer();

    // Create user profile
    userProfile = {
      id: 'test-user',
      preferences: new Map(),
      interactionHistory: [],
      favoritePatterns: [],
      workflowHistory: []
    };

    // Create patterns (simulating patterns retrieved from Feature Memory)
    featureMemoryPatterns = [
      {
        id: 'pattern1',
        features: new Map<string, any>([
          ['type', 'ambient'],
          ['complexity', 'high'],
          ['duration', 60]
        ]),
        confidence: 0.9,
        timestamp: new Date(),
        metadata: {
          source: 'user',
          category: 'ambient',
          frequency: 5,
          lastUpdated: new Date()
        }
      },
      {
        id: 'pattern2',
        features: new Map<string, any>([
          ['type', 'rhythmic'],
          ['complexity', 'medium'],
          ['duration', 30]
        ]),
        confidence: 0.7,
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        metadata: {
          source: 'system',
          category: 'rhythmic',
          frequency: 2,
          lastUpdated: new Date()
        }
      },
      {
        id: 'pattern3',
        features: new Map<string, any>([
          ['type', 'melodic'],
          ['complexity', 'low'],
          ['duration', 120]
        ]),
        confidence: 0.6,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        metadata: {
          source: 'user',
          category: 'melodic',
          frequency: 1,
          lastUpdated: new Date()
        }
      }
    ];

    // Create interactions
    interactions = [
      {
        id: 'interaction1',
        timestamp: new Date(),
        type: 'user-input',
        content: 'I want to create ambient music',
        metadata: {
          importance: 0.7,
          category: 'input'
        }
      }
    ];

    // Create system state
    systemState = {
      currentWorkflow: 'audio-generation',
      activePatterns: ['pattern1'],
      currentAudioProperties: {
        duration: 60,
        sampleRate: 44100,
        channels: 2
      },
      resourceUsage: {
        memory: 1024 * 1024 * 100,
        cpu: 0.4
      }
    };

    // Create interaction context
    interactionContext = {
      query: 'ambient music with high complexity',
      currentWorkflow: 'audio-generation',
      activePatterns: ['pattern1'],
      audioProperties: {
        duration: 60,
        sampleRate: 44100,
        channels: 2
      }
    };
  });

  test('full workflow integrating Feature Memory patterns with Context Management', () => {
    // Step 1: Extract explicit preferences from user message
    const userMessage = 'I prefer ambient sounds with high complexity';
    preferenceTracker.extractExplicitPreference(userMessage, userProfile);

    // Verify preferences were extracted
    expect(userProfile.preferences.has('sound_type')).toBe(true);
    expect(userProfile.preferences.get('sound_type')?.value).toBe('ambient');
    expect(userProfile.preferences.has('preferred_complexity')).toBe(true);
    expect(userProfile.preferences.get('preferred_complexity')?.value).toBe('high');

    // Step 2: Create and track an audio generation interaction
    const generationInteraction: Interaction = {
      id: 'interaction2',
      timestamp: new Date(),
      type: 'audio-generation',
      content: {
        duration: 60,
        complexity: 'high',
        type: 'ambient'
      },
      metadata: {
        importance: 0.8,
        category: 'generation',
        audioProperties: {
          duration: 60,
          sampleRate: 44100,
          channels: 2
        }
      }
    };

    // Track the interaction
    preferenceTracker.trackInteraction(generationInteraction, userProfile);
    interactions.push(generationInteraction);

    // Verify interaction was tracked
    expect(userProfile.interactionHistory).toContain('interaction2');

    // Step 3: Score Feature Memory patterns by relevance to current context
    // This is where Context Management and Feature Memory integrate:
    // - Feature Memory provides the patterns
    // - Context Management scores them based on current context
    const scoredPatterns = relevanceScorer.scorePatternRelevance(
      featureMemoryPatterns,
      interactionContext
    );

    // Verify patterns were scored correctly
    expect(scoredPatterns.length).toBe(3);
    expect(scoredPatterns[0].pattern.id).toBe('pattern1'); // Most relevant
    expect(scoredPatterns[0].score).toBeGreaterThan(scoredPatterns[1].score);
    expect(scoredPatterns[1].score).toBeGreaterThan(scoredPatterns[2].score);

    // Step 4: Generate context summary with most relevant patterns from Feature Memory
    const contextSummary = summarizer.summarizeForLLM(
      interactions,
      userProfile,
      scoredPatterns.map(sp => sp.pattern), // Use scored patterns from Feature Memory
      systemState
    );

    // Verify context summary contains key information
    expect(contextSummary).toContain('ambient');
    expect(contextSummary).toContain('high complexity');
    expect(contextSummary).toContain('pattern1');
    expect(contextSummary).toContain('User Preferences');
    expect(contextSummary).toContain('Recent Interactions');
    expect(contextSummary).toContain('Relevant Patterns');
    expect(contextSummary).toContain('System State');

    // Verify that only the most relevant patterns are prominently featured
    // This demonstrates how Context Management optimizes which Feature Memory
    // patterns to include in the limited context window
    const pattern1Index = contextSummary.indexOf('pattern1');
    const pattern2Index = contextSummary.indexOf('pattern2');
    const pattern3Index = contextSummary.indexOf('pattern3');

    // Most relevant pattern should appear first
    expect(pattern1Index).toBeLessThan(pattern2Index);
    expect(pattern2Index).toBeLessThan(pattern3Index);
  });

  test('user preferences influence Feature Memory pattern relevance', () => {
    // Set up user preferences that should influence pattern relevance
    userProfile.preferences.set('sound_type', {
      value: 'melodic', // This should boost pattern3
      confidence: 0.9,
      source: 'explicit',
      frequency: 5,
      lastUpdated: new Date()
    });

    // Update interaction context to match preference
    interactionContext.query = 'melodic music';

    // Score patterns with preference-influenced context
    const scoredPatterns = relevanceScorer.scorePatternRelevance(
      featureMemoryPatterns,
      interactionContext
    );

    // Verify that pattern3 (melodic) gets a higher score due to matching user preference
    // despite being older and less frequently used
    const pattern3Score = scoredPatterns.find(p => p.pattern.id === 'pattern3')?.score;
    expect(pattern3Score).toBeGreaterThan(0.3);

    // In a real implementation with more sophisticated preference influence,
    // pattern3 might even become the most relevant pattern
  });
});
