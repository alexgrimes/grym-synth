/**
 * Core types for the model orchestration system
 */

export type ModelCapability = 
  | 'code'          // Code generation and analysis
  | 'reasoning'     // Logical reasoning and planning
  | 'vision'        // Image understanding and processing
  | 'context'       // Context management and retention
  | 'analysis'      // Deep analysis and review
  | 'interaction'   // User interaction and dialogue
  | 'specialized';  // Domain-specific capabilities

export interface ModelCapabilityScore {
  score: number;           // 0-1 score indicating capability level
  confidence: number;      // 0-1 confidence in the score
  lastUpdated: Date;       // When this capability was last assessed
  sampleSize: number;      // Number of tests used to determine score
}

export interface ModelCapabilities {
  get(capability: ModelCapability): ModelCapabilityScore;
  set(capability: ModelCapability, score: ModelCapabilityScore): void;
  has(capability: ModelCapability): boolean;
  getAll(): Map<ModelCapability, ModelCapabilityScore>;
}

export interface TaskRequirements {
  primaryCapability: ModelCapability;
  secondaryCapabilities: ModelCapability[];
  minCapabilityScores: Map<ModelCapability, number>;
  contextSize: number;
  priority: 'speed' | 'quality' | 'efficiency';
  resourceConstraints?: {
    maxMemory?: number;    // MB
    maxCpu?: number;       // 0-1
    maxLatency?: number;   // ms
  };
}

export interface Task {
  id: string;
  type: string;
  description: string;
  requirements: TaskRequirements;
  input: any;
  metadata?: Record<string, any>;
}

export type ModelPhase = 'planning' | 'context' | 'execution' | 'review';

export interface ModelMetrics {
  executionTime: number;
  memoryUsed: number;
  tokensUsed: number;
  tokensProcessed?: number;
  totalExecutionTime?: number;
  totalMemoryUsed?: number;
  totalTokensUsed?: number;
  peakMemoryUsage?: number;
  totalProcessingTime?: number;
}

export interface TokenMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  rate?: number;
  cached?: number;
}

export interface ChainMetrics {
  totalExecutionTime: number;
  totalMemoryUsed: number;
  totalTokensUsed: number;
  peakMemoryUsage: number;
  totalProcessingTime: number;
  modelMetrics: Map<string, ModelMetrics>;
}

export interface PhaseResult {
  name: ModelPhase;
  status: 'completed' | 'failed' | 'skipped';
  result?: {
    success: boolean;
    output: any;
    metrics: ModelMetrics;
  };
}

export interface ModelResult {
  success: boolean;
  output: any;
  error?: Error;
  phase: ModelPhase;
  phases: PhaseResult[];
  metrics: ModelMetrics & {
    totalExecutionTime?: number;
    totalMemoryUsed?: number;
    totalTokensUsed?: number;
  };
  metadata?: Record<string, any>;
  usedFallback?: boolean;
}

export interface ModelChain {
  planner: LLMModel;     // High-level task planning
  executor: LLMModel;    // Primary task execution
  reviewer?: LLMModel;   // Result review and validation
  context?: LLMModel;    // Context management
  fallback?: LLMModel[]; // Fallback models for error recovery
}

export interface LLMModel {
  id: string;
  name: string;
  capabilities: ModelCapabilities;
  contextWindow: number;
  
  // Core functionality
  process(input: any): Promise<any>;
  
  // Capability assessment
  testCapability(capability: ModelCapability): Promise<ModelCapabilityScore>;
  
  // Resource management
  getResourceMetrics(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    averageLatency: number;
    tokensProcessed?: number;
    peakMemoryUsage?: number;
    totalProcessingTime?: number;
  }>;

  // Token statistics
  getTokenStats(): Promise<{
    total: number;
    prompt: number;
    completion: number;
    rate?: number;  // tokens per second
    cached?: number;  // number of cached tokens used
  }>;
}

export interface ModelRegistry {
  registerModel(model: LLMModel): Promise<void>;
  unregisterModel(modelId: string): Promise<void>;
  getModel(modelId: string): LLMModel | undefined;
  listModels(): LLMModel[];
  findModels(criteria: {
    capabilities?: ModelCapability[];
    minScores?: Map<ModelCapability, number>;
    contextSize?: number;
  }): LLMModel[];
  getModelChain(requirements: TaskRequirements): Promise<ModelChain>;
}

export interface TaskAnalyzer {
  analyze(task: Task): Promise<TaskRequirements>;
  validateRequirements(requirements: TaskRequirements): boolean;
  suggestModelChain(requirements: TaskRequirements): Promise<ModelChain>;
}

export interface ResultSynthesizer {
  combine(results: ModelResult[]): Promise<Result>;
  validate(result: Result): boolean;
  format(result: Result): FormattedResult;
}

export interface Result {
  success: boolean;
  output: any;
  error?: Error;
  phases: {
    name: string;
    status: 'completed' | 'failed' | 'skipped';
    result?: ModelResult;
  }[];
  metrics: {
    totalExecutionTime: number;
    totalMemoryUsed: number;
    totalTokensUsed: number;
  };
  metadata?: Record<string, any>;
}

export interface FormattedResult {
  data: any;
  format: 'json' | 'text' | 'code' | 'structured';
  schema?: Record<string, any>;
}

export interface ModelMessage {
  type: 'request' | 'response' | 'update' | 'error';
  source: string;
  target: string;
  content: {
    task?: Task;
    context?: any;
    result?: Result;
    error?: Error;
  };
  metadata: {
    timestamp: number;
    phase: string;
    priority: number;
  };
}

export interface Channel {
  id: string;
  source: string;
  target: string;
  send(message: ModelMessage): Promise<void>;
  receive(): Promise<ModelMessage>;
  close(): Promise<void>;
}

export class ModelOrchestratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ModelOrchestratorError';
  }
}