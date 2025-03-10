export type ModelSpecialization = 'code' | 'visual' | 'audio' | 'general';

export type MasteryLevel = 'novice' | 'competent' | 'expert';

export interface DomainKnowledge {
  confidence: number;     // 0-1 scale of understanding level
  exposures: number;      // Number of times encountered
  lastAccessed: Date;
  relatedConcepts: Set<string>;
  mastery: MasteryLevel;
}

export interface CrossDomainConnection {
  from: string;
  to: string;
  strength: number;  // 0-1 scale of connection strength
}

export interface ContextPreferences {
  retentionPriority: string[];  // Topics to prioritize keeping in context
  summarizationThreshold: number;  // When to summarize context (token count)
  specializedPrompts: Map<string, string>;  // Domain-specific prompt templates
}

export interface ModelLearningProfile {
  modelId: string;
  specialization: ModelSpecialization;
  learningState: {
    domains: Map<string, DomainKnowledge>;
    crossDomainConnections: Map<string, CrossDomainConnection>;
  };
  contextPreferences: ContextPreferences;
}

export interface LearningInteraction {
  topic: string;
  context: string;
  response: string;
  success: boolean;
  timestamp: Date;
  metadata?: {
    relatedTopics?: string[];
    complexity?: number;
    executionTime?: number;
    tokenUsage?: {
      prompt: number;
      completion: number;
    };
  };
}

export interface ProfileUpdateResult {
  profileId: string;
  updates: {
    domainsModified: string[];
    connectionsFormed: CrossDomainConnection[];
    masteryChanges: Array<{
      domain: string;
      previousLevel: MasteryLevel;
      newLevel: MasteryLevel;
    }>;
  };
  timestamp: Date;
}

export interface LearningProfileStorage {
  saveProfile(profile: ModelLearningProfile): Promise<void>;
  loadProfile(modelId: string): Promise<ModelLearningProfile | null>;
  listProfiles(): Promise<string[]>;
  deleteProfile(modelId: string): Promise<void>;
  saveInteraction(modelId: string, interaction: LearningInteraction): Promise<void>;
  getInteractions(modelId: string, limit?: number): Promise<LearningInteraction[]>;
}

export interface ModelAnalysis {
  domain: string;
  complexity: number;
  requiredCapabilities: string[];
  confidence: number;
}

export interface ProfileVisualization {
  domains: Array<{
    name: string;
    confidence: number;
    mastery: MasteryLevel;
    connections: Array<{
      to: string;
      strength: number;
    }>;
  }>;
  timeline: Array<{
    timestamp: Date;
    domain: string;
    event: 'interaction' | 'mastery_change' | 'connection_formed';
    details: Record<string, unknown>;
  }>;
}