import { PreferenceTracker } from '../PreferenceTracker';
import { Interaction, UserProfile } from '../types';

describe('PreferenceTracker', () => {
  let tracker: PreferenceTracker;
  let mockProfile: UserProfile;

  beforeEach(() => {
    tracker = new PreferenceTracker();
    mockProfile = {
      id: 'user1',
      preferences: new Map(),
      interactionHistory: [],
      favoritePatterns: [],
      workflowHistory: []
    };
  });

  test('should track implicit preferences from audio generation', () => {
    const interaction: Interaction = {
      id: '1',
      timestamp: new Date(),
      type: 'audio-generation',
      content: {
        duration: 5,
        complexity: 'high'
      },
      metadata: {
        importance: 0.8,
        category: 'generation'
      }
    };

    tracker.trackInteraction(interaction, mockProfile);

    expect(mockProfile.preferences.has('preferred_duration')).toBe(true);
    expect(mockProfile.preferences.has('preferred_complexity')).toBe(true);
    expect(mockProfile.interactionHistory).toContain('1');
  });

  test('should extract explicit preferences from message', () => {
    const message = 'I prefer ambient sounds with high complexity';

    tracker.extractExplicitPreference(message, mockProfile);

    const soundPreference = mockProfile.preferences.get('sound_type');
    expect(soundPreference).toBeDefined();
    expect(soundPreference?.value).toBe('ambient');
    expect(soundPreference?.source).toBe('explicit');
    expect(soundPreference?.confidence).toBeGreaterThan(0.8);
  });

  test('should decay preference confidence over time', () => {
    // Add a preference from 10 days ago
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    mockProfile.preferences.set('old_preference', {
      value: 'test',
      confidence: 0.9,
      source: 'explicit',
      frequency: 1,
      lastUpdated: oldDate
    });

    tracker.decayConfidence(mockProfile);

    const decayedPreference = mockProfile.preferences.get('old_preference');
    expect(decayedPreference?.confidence).toBeLessThan(0.9);
    expect(decayedPreference?.confidence).toBeGreaterThan(0.1); // Shouldn't decay below minimum
  });

  test('should generate preference vector', () => {
    mockProfile.preferences.set('complexity', {
      value: 'high',
      confidence: 0.8,
      source: 'explicit',
      frequency: 5,
      lastUpdated: new Date()
    });

    const vector = tracker.getPreferenceVector(mockProfile);

    expect(vector.has('complexity')).toBe(true);
    expect(vector.get('complexity')).toBeGreaterThan(0);
    expect(vector.get('complexity')).toBeLessThanOrEqual(1);
  });

  test('should handle contradictory preferences', () => {
    // First set an implicit preference
    mockProfile.preferences.set('sound_type', {
      value: 'ambient',
      confidence: 0.6,
      source: 'implicit',
      frequency: 1,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    });

    // Then set an explicit preference that contradicts it
    const message = 'I prefer rhythmic sounds';
    tracker.extractExplicitPreference(message, mockProfile);

    const updatedPreference = mockProfile.preferences.get('sound_type');
    expect(updatedPreference?.value).toBe('rhythmic');
    expect(updatedPreference?.source).toBe('explicit');
  });

  test('should increase confidence for repeated preferences', () => {
    // Set initial preference
    mockProfile.preferences.set('preferred_duration', {
      value: 'short',
      confidence: 0.6,
      source: 'implicit',
      frequency: 1,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    });

    // Track another interaction with the same preference
    const interaction: Interaction = {
      id: '2',
      timestamp: new Date(),
      type: 'audio-generation',
      content: {
        duration: 'short'
      },
      metadata: {
        importance: 0.5,
        category: 'generation'
      }
    };

    tracker.trackInteraction(interaction, mockProfile);

    const updatedPreference = mockProfile.preferences.get('preferred_duration');
    expect(updatedPreference?.confidence).toBeGreaterThan(0.6);
    expect(updatedPreference?.frequency).toBe(2);
  });

  test('should normalize preference values', () => {
    // Test with different value types
    mockProfile.preferences.set('numeric', {
      value: 0.5,
      confidence: 0.8,
      source: 'explicit',
      frequency: 1,
      lastUpdated: new Date()
    });

    mockProfile.preferences.set('boolean', {
      value: true,
      confidence: 0.8,
      source: 'explicit',
      frequency: 1,
      lastUpdated: new Date()
    });

    mockProfile.preferences.set('string_low', {
      value: 'low',
      confidence: 0.8,
      source: 'explicit',
      frequency: 1,
      lastUpdated: new Date()
    });

    mockProfile.preferences.set('string_high', {
      value: 'high',
      confidence: 0.8,
      source: 'explicit',
      frequency: 1,
      lastUpdated: new Date()
    });

    const vector = tracker.getPreferenceVector(mockProfile);

    expect(vector.get('numeric')).toBeCloseTo(0.5 * 0.8, 2); // value * confidence
    expect(vector.get('boolean')).toBeCloseTo(1 * 0.8, 2);   // true = 1
    expect(vector.get('string_low')).toBeCloseTo(0.25 * 0.8, 2); // 'low' = 0.25
    expect(vector.get('string_high')).toBeCloseTo(0.75 * 0.8, 2); // 'high' = 0.75
  });
});
