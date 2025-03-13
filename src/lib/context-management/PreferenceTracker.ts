import { Interaction, UserProfile, PreferenceData } from './types';
import { Logger } from '../../utils/logger';

export class PreferenceTracker {
  private static readonly CONFIDENCE_DECAY = 0.99; // Daily confidence decay rate
  private static readonly MIN_CONFIDENCE = 0.1;
  private static readonly EXPLICIT_BASE_CONFIDENCE = 0.9;
  private static readonly IMPLICIT_BASE_CONFIDENCE = 0.6;

  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger({ namespace: 'preference-tracker' });
  }

  public trackInteraction(
    interaction: Interaction,
    profile: UserProfile
  ): void {
    try {
      // Extract implicit preferences from the interaction
      const implicitPreferences = this.extractImplicitPreferences(interaction);

      // Update preferences
      for (const [key, value] of Object.entries(implicitPreferences)) {
        this.updatePreference(
          profile,
          key,
          value,
          'implicit',
          PreferenceTracker.IMPLICIT_BASE_CONFIDENCE
        );
      }

      // Track interaction ID in history
      profile.interactionHistory.push(interaction.id);

      // Trim history if needed
      if (profile.interactionHistory.length > 1000) {
        profile.interactionHistory = profile.interactionHistory.slice(-1000);
      }
    } catch (error) {
      this.logger.error('Error tracking interaction', { error, interactionId: interaction.id });
    }
  }

  public extractExplicitPreference(
    message: string,
    profile: UserProfile
  ): void {
    try {
      const preferences = this.parsePreferenceStatement(message);

      for (const [key, value] of Object.entries(preferences)) {
        this.updatePreference(
          profile,
          key,
          value,
          'explicit',
          PreferenceTracker.EXPLICIT_BASE_CONFIDENCE
        );
      }
    } catch (error) {
      this.logger.error('Error extracting explicit preference', { error, message });
    }
  }

  public getPreferenceVector(profile: UserProfile): Map<string, number> {
    const vector = new Map<string, number>();

    for (const [key, data] of profile.preferences.entries()) {
      // Normalize preference values to numbers between 0 and 1
      const normalizedValue = this.normalizePreferenceValue(data.value);

      // Weight by confidence and frequency
      const weight = data.confidence * Math.min(1, data.frequency / 10);

      vector.set(key, normalizedValue * weight);
    }

    return vector;
  }

  public decayConfidence(profile: UserProfile): void {
    const now = new Date();

    for (const [key, data] of profile.preferences.entries()) {
      const daysSinceUpdate = (now.getTime() - data.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate >= 1) {
        const newConfidence = Math.max(
          PreferenceTracker.MIN_CONFIDENCE,
          data.confidence * Math.pow(PreferenceTracker.CONFIDENCE_DECAY, daysSinceUpdate)
        );

        profile.preferences.set(key, {
          ...data,
          confidence: newConfidence
        });
      }
    }
  }

  private extractImplicitPreferences(interaction: Interaction): Record<string, any> {
    const preferences: Record<string, any> = {};

    switch (interaction.type) {
      case 'audio-generation':
        // Extract preferences from generation parameters
        if (typeof interaction.content === 'object') {
          if (interaction.content.duration) {
            preferences.preferred_duration = interaction.content.duration;
          }
          if (interaction.content.complexity) {
            preferences.preferred_complexity = interaction.content.complexity;
          }
        }
        break;

      case 'pattern-recognition':
        // Track which patterns the user finds interesting
        if (interaction.metadata.relatedPatterns?.length) {
          preferences.pattern_interests = interaction.metadata.relatedPatterns;
        }
        break;
    }

    return preferences;
  }

  private parsePreferenceStatement(message: string): Record<string, any> {
    const preferences: Record<string, any> = {};

    // Simple keyword-based preference extraction
    // In a production system, this would use more sophisticated NLP
    const preferencePatterns = [
      {
        regex: /prefer\s+(\w+)\s+sounds?/i,
        key: 'sound_type'
      },
      {
        regex: /like\s+(\w+)\s+duration/i,
        key: 'preferred_duration'
      },
      {
        regex: /want\s+(\w+)\s+complexity/i,
        key: 'preferred_complexity'
      }
    ];

    for (const pattern of preferencePatterns) {
      const match = message.match(pattern.regex);
      if (match) {
        preferences[pattern.key] = match[1].toLowerCase();
      }
    }

    return preferences;
  }

  private updatePreference(
    profile: UserProfile,
    key: string,
    value: any,
    source: 'explicit' | 'implicit',
    baseConfidence: number
  ): void {
    const existing = profile.preferences.get(key);

    if (existing) {
      // If value matches, increase confidence and frequency
      if (existing.value === value) {
        profile.preferences.set(key, {
          ...existing,
          confidence: Math.min(1, existing.confidence + 0.1),
          frequency: existing.frequency + 1,
          lastUpdated: new Date()
        });
      } else if (source === 'explicit' || existing.source === 'implicit') {
        // Update value if new source is explicit or existing was implicit
        profile.preferences.set(key, {
          value,
          confidence: baseConfidence,
          source,
          frequency: 1,
          lastUpdated: new Date()
        });
      }
    } else {
      // Create new preference
      profile.preferences.set(key, {
        value,
        confidence: baseConfidence,
        source,
        frequency: 1,
        lastUpdated: new Date()
      });
    }
  }

  private normalizePreferenceValue(value: any): number {
    if (typeof value === 'number') {
      return Math.min(1, Math.max(0, value));
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (typeof value === 'string') {
      // Map common value patterns to numbers
      const lowValue = value.toLowerCase();
      if (['low', 'small', 'simple'].includes(lowValue)) return 0.25;
      if (['medium', 'moderate', 'normal'].includes(lowValue)) return 0.5;
      if (['high', 'large', 'complex'].includes(lowValue)) return 0.75;
      if (['very high', 'very large', 'very complex'].includes(lowValue)) return 1;
    }
    return 0.5; // Default for unknown values
  }
}
