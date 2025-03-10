/**
 * Core types for the Learning Mechanism services
 */

export interface AudioPattern {
  id: string;
  features: number[];
  metadata: PatternMetadata;
  confidence: number;
  timestamp: number;
}

export interface PatternMetadata {
  type: string;
  duration: number;
  frequency: number[];
  amplitude: number[];
  [key: string]: any;
}

export interface PatternContext {
  sessionId: string;
  userId: string;
  timestamp: number;
  environment: {
    noiseLevel: number;
    sampleRate: number;
    [key: string]: any;
  };
  tags: string[];
  [key: string]: any;
}

export interface PatternFeedback {
  patternId: string;
  userId: string;
  timestamp: number;
  rating: number; // 0-1 scale
  confidence: number;
  tags?: string[];
  notes?: string;
}

export interface LearningMetrics {
  overallAccuracy: number;
  confidenceScore: number;
  patternCount: number;
  feedbackCount: number;
  lastUpdated: number;
  improvements: {
    [key: string]: number;
  };
}

export interface PatternRelationship {
  id: string;
  sourcePatternId: string;
  targetPatternId: string;
  type: RelationshipType;
  confidence: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export enum RelationshipType {
  SIMILAR = 'similar',
  SEQUENTIAL = 'sequential',
  OVERLAPPING = 'overlapping',
  VARIANT = 'variant',
  COMPOSITE = 'composite'
}

export interface MemorySearchParams {
  limit?: number;
  offset?: number;
  sortBy?: 'recency' | 'frequency' | 'confidence';
  order?: 'asc' | 'desc';
  minConfidence?: number;
}

export interface ConfidenceModelParams {
  learningRate: number;
  featureWeights: number[];
  contextWeights: Record<string, number>;
  temporalDecay: number;
  minConfidence: number;
  maxConfidence: number;
}

export interface ServiceConfig {
  learningRate: number;
  batchSize: number;
  memoryLimit: number;
  confidenceThreshold: number;
  temporalDecayRate: number;
  relationshipConfidenceThreshold: number;
}

export class LearningMechanismError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'LearningMechanismError';
  }
}
