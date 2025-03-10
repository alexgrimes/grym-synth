export interface MessageImportance {
  scores: {
    recency: number;     // Time-based relevance
    relevance: number;   // Semantic context match
    interaction: number; // User engagement metrics
    complexity: number;  // Information density
    theme: number;      // Thematic alignment
    keyTerms: number;   // Domain terminology
  };
  finalScore: number;
  mlScore?: number;     // ML-based importance score
  confidence?: number;  // ML model confidence
}

export interface ImportanceScorerConfig {
  weights: {
    recency: number;
    relevance: number;
    interaction: number;
    complexity: number;
    theme: number;
    keyTerms: number;
  };
  llmService?: any; // LLM service for semantic analysis
  themeDetector?: any; // Theme detection service
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  references?: string[]; // IDs of referenced messages
  hasResponse?: boolean;
  participantCount?: number;
}

// New interfaces for hybrid scoring system

export interface MLModel {
  predict(features: number[]): Promise<number>;
  update(params: {
    features: number[];
    label: number;
    learningRate: number;
  }): Promise<void>;
  getConfidence(): Promise<number>;
}

export interface LearningMetrics {
  userActions: {
    messageViews: number;    // View count
    timeSpent: number;       // Time viewing message
    references: number;      // Reference count
    reactions: number;       // User reactions
  };
  contextualMetrics: {
    followupRate: number;    // Rate of follow-up messages
    influenceScore: number;  // Impact on conversation
    themeAlignment: number;  // Theme consistency
  };
}

export interface HybridImportanceScorerConfig extends ImportanceScorerConfig {
  mlModel: MLModel;
  learningProfile: LearningProfile;
  initialMLWeight?: number;  // Initial weight for ML score (default: 0.3)
  adaptationRate?: number;   // Rate of weight adaptation (default: 0.1)
  minConfidence?: number;    // Minimum confidence threshold (default: 0.4)
}

export interface LearningProfile {
  updateFromFeedback(feedback: {
    prediction: number;
    actual: number;
    features: number[];
  }): Promise<void>;
  
  getPerformanceMetrics(): Promise<{
    accuracy: number;
    confidence: number;
    learningRate: number;
  }>;
}

export interface HybridScoreVisualizerProps {
  message: Message;
  userScore: number;
  mlScore: number;
  confidence: number;
  weight: number;
}

export interface WeightConfiguratorProps {
  weights: ImportanceScorerConfig['weights'];
  onWeightChange: (key: keyof ImportanceScorerConfig['weights'], value: number) => void;
  mlWeight: number;
  onMLWeightChange: (value: number) => void;
}

export interface MLInsightsPanelProps {
  performanceMetrics: {
    accuracy: number;
    confidence: number;
    learningRate: number;
  };
  recentPredictions: Array<{
    predicted: number;
    actual: number;
    timestamp: Date;
  }>;
}