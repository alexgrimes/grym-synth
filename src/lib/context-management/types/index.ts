import { Pattern } from '../../feature-memory/types';

export interface Interaction {
  id: string;
  timestamp: Date;
  type: 'user-input' | 'system-output' | 'audio-generation' | 'pattern-recognition';
  content: any;
  metadata: {
    importance: number;
    category: string;
    relatedPatterns?: string[];
    audioProperties?: {
      duration: number;
      sampleRate: number;
      channels: number;
    };
  };
}

export interface UserProfile {
  id: string;
  preferences: Map<string, PreferenceData>;
  interactionHistory: string[]; // IDs of interactions
  favoritePatterns: string[];
  workflowHistory: string[];
}

export interface PreferenceData {
  value: any;
  confidence: number;
  lastUpdated: Date;
  source: 'explicit' | 'implicit';
  frequency: number;
}

export interface SystemState {
  currentWorkflow?: string;
  activePatterns: string[];
  currentAudioProperties?: {
    duration: number;
    sampleRate: number;
    channels: number;
  };
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

export interface TokenBudgets {
  recentInteractions: number;
  userPreferences: number;
  patternMatches: number;
  systemState: number;
}

export interface InteractionContext {
  query: string;
  currentWorkflow?: string;
  activePatterns: string[];
  audioProperties?: {
    duration: number;
    sampleRate: number;
    channels: number;
  };
}

export interface ScoredPattern {
  pattern: Pattern;
  score: number;
}
