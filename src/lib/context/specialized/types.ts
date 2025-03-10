import { Message } from '../../storage/types';

/**
 * Represents a model's specialization and capabilities
 */
export interface ModelSpecialization {
  model: string;
  platform: 'ollama' | 'lmstudio';
  strengths: {
    domains: string[];      // e.g., ['code', 'audio', 'visuals']
    contextSize: number;    // e.g., 1M for Qwen
    specialFeatures: string[];  // e.g., ['visual', 'long-context']
  };
  contextManager: {
    priorityTopics: string[];  // What this model should focus on
    contextWindow: string[];   // Current active context
    summarizationStrategy: 'aggressive' | 'minimal' | 'selective';
  };
}

/**
 * Represents the context state for a specific model
 */
export interface ModelContextState {
  activeThemes: Set<string>;
  relevantContext: string[];
  specialization: ModelSpecialization;
  lastUsed: number;
}

/**
 * Configuration for context routing
 */
export interface ContextRoutingConfig {
  defaultModel: string;
  fallbackModel: string;
  themeWeights: Record<string, number>;
  minRelevanceScore: number;
}

/**
 * Result of routing a query to a model
 */
export interface RoutingResult {
  model: ModelSpecialization;
  context: string[];
  suggestedFollowups: string[];
  relevanceScore: number;
}

/**
 * Parameters for preparing specialized context
 */
export interface ContextPreparationParams {
  model: ModelSpecialization;
  baseContext: string[];
  query: string;
  themes?: Set<string>;
}

/**
 * Result of context preparation
 */
export interface PreparedContext {
  context: string[];
  themes: Set<string>;
  tokens: number;
  summary?: string;
}

/**
 * Options for context summarization
 */
export interface SummarizationOptions {
  strategy: 'aggressive' | 'minimal' | 'selective';
  maxTokens: number;
  preserveThemes: Set<string>;
  priorityTopics: string[];
}

/**
 * Storage schema for model contexts
 */
export interface ModelContextStorage {
  modelId: string;
  platform: string;
  activeThemes: string[];
  relevantContext: string[];
  specialization: ModelSpecialization;
  lastUsed: number;
  version: number;
}

/**
 * Error types specific to specialized context management
 */
export enum ContextError {
  ROUTING_FAILED = 'ROUTING_FAILED',
  CONTEXT_PREPARATION_FAILED = 'CONTEXT_PREPARATION_FAILED',
  SUMMARIZATION_FAILED = 'SUMMARIZATION_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  INVALID_MODEL = 'INVALID_MODEL',
}

/**
 * Events emitted by the specialized context manager
 */
export enum ContextEvent {
  MODEL_SWITCHED = 'MODEL_SWITCHED',
  CONTEXT_UPDATED = 'CONTEXT_UPDATED',
  THEMES_CHANGED = 'THEMES_CHANGED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
}