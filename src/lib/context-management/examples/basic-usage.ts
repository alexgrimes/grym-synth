import { ContextSummarizer, PreferenceTracker, RelevanceScorer } from '../';
import { Interaction, UserProfile, SystemState, InteractionContext } from '../types';
import { Pattern } from '../../feature-memory/types';

/**
 * This example demonstrates basic usage of the Context Management System.
 * It shows how to track preferences, score pattern relevance, and generate
 * context summaries for LLM interactions.
 */

// Create instances of our context management classes
const summarizer = new ContextSummarizer();
const preferenceTracker = new PreferenceTracker();
const relevanceScorer = new RelevanceScorer();

// Initialize a user profile
const userProfile: UserProfile = {
  id: 'user123',
  preferences: new Map(),
  interactionHistory: [],
  favoritePatterns: [],
  workflowHistory: []
};

// Track an explicit preference from a user message
const userMessage = "I prefer ambient sounds with high complexity";
preferenceTracker.extractExplicitPreference(userMessage, userProfile);

// Create an interaction for audio generation
const audioGenerationInteraction: Interaction = {
  id: 'interaction1',
  timestamp: new Date(),
  type: 'audio-generation',
  content: {
    duration: 30,
    complexity: 'high',
    type: 'ambient'
  },
  metadata: {
    importance: 0.8,
    category: 'generation',
    audioProperties: {
      duration: 30,
      sampleRate: 44100,
      channels: 2
    }
  }
};

// Track the interaction to extract implicit preferences
preferenceTracker.trackInteraction(audioGenerationInteraction, userProfile);

// Create some patterns that might be relevant
const patterns: Pattern[] = [
  {
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
  },
  {
    id: 'pattern2',
    features: new Map<string, any>([
      ['type', 'rhythmic'],
      ['complexity', 'medium']
    ]),
    confidence: 0.7,
    timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    metadata: {
      source: 'system',
      category: 'rhythmic',
      frequency: 1,
      lastUpdated: new Date()
    }
  }
];

// Create a system state
const systemState: SystemState = {
  currentWorkflow: 'audio-generation',
  activePatterns: ['pattern1'],
  currentAudioProperties: {
    duration: 30,
    sampleRate: 44100,
    channels: 2
  },
  resourceUsage: {
    memory: 1024 * 1024 * 150, // 150MB
    cpu: 0.3
  }
};

// Create an interaction context for relevance scoring
const interactionContext: InteractionContext = {
  query: 'ambient music with high complexity',
  currentWorkflow: 'audio-generation',
  activePatterns: ['pattern1'],
  audioProperties: {
    duration: 30,
    sampleRate: 44100,
    channels: 2
  }
};

// Score patterns by relevance to the current context
const scoredPatterns = relevanceScorer.scorePatternRelevance(patterns, interactionContext);

console.log('Patterns scored by relevance:');
scoredPatterns.forEach(sp => {
  console.log(`- Pattern ${sp.pattern.id}: score ${sp.score.toFixed(2)}`);
});

// Generate a context summary for the LLM using the most relevant patterns
const contextSummary = summarizer.summarizeForLLM(
  [audioGenerationInteraction],
  userProfile,
  scoredPatterns.map(sp => sp.pattern), // Use all scored patterns, sorted by relevance
  systemState
);

// Log the context summary
console.log('\nGenerated Context Summary:');
console.log(contextSummary);

// Demonstrate preference decay over time
console.log('\nPreferences before decay:');
console.log(userProfile.preferences);

// Simulate passage of time by setting a preference to an older date
if (userProfile.preferences.has('sound_type')) {
  const oldPreference = userProfile.preferences.get('sound_type')!;
  oldPreference.lastUpdated = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  userProfile.preferences.set('sound_type', oldPreference);
}

// Apply confidence decay
preferenceTracker.decayConfidence(userProfile);

console.log('\nPreferences after decay:');
console.log(userProfile.preferences);

// Generate a preference vector for similarity calculations
const preferenceVector = preferenceTracker.getPreferenceVector(userProfile);

console.log('\nPreference Vector:');
console.log(preferenceVector);
