export interface Message {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
}

export interface ModelConstraints {
  maxTokens: number;
  contextWindow: number;
  truncateMessages?: boolean;
  systemTokenReserve?: number;
  userTokenRatio?: number;
  responseTokens?: number;
}

export interface ModelContextState {
  modelId: string;
  messages: Message[];
  tokenCount: number;
  constraints: ModelConstraints;
  tokens: number;
  contextWindow?: number;
  metadata: {
    lastAccess: number;
    createdAt: number;
    priority: number;
    lastUpdated: number;
    importance: number;
  };
}

export interface SystemResources {
  memory?: number;
  cpu?: number;
  totalMemory?: number;
  allocatedMemory?: number;
  availableMemory?: number;
  peakMemory?: number;
  memoryPressure?: number;
  modelConstraints?: ModelConstraints | ModelConstraints[];
  timestamp: number;
  availableCores?: number;
  gpuMemory?: number;
  buffers?: {
    memory?: number;
    tokens?: number;
    messages?: number;
    context?: number;
    working?: number;
  };
  status?: {
    loadTime?: number;
    lastUsed?: number;
    activeRequests?: number;
  };
  [key: string]: any;
}

export interface ModelMetrics {
  modelId: string;
  tokenCount: number;
  messageCount: number;
  averageTokensPerMessage: number;
  peakTokenCount: number;
  totalProcessingTime: number;
  averageLatency: number;
  errorCount: number;
  lastError: Error | null;
  timestamp: number;
}

export interface BufferThresholds {
  initial?: number;
  max?: number;
  optimizationThreshold?: number;
  compressionThreshold?: number;
}

export interface BufferConfig {
  input?: number | BufferThresholds;
  output?: number | BufferThresholds;
  context?: number | BufferThresholds;
  working?: number | BufferThresholds;
  model?: number | BufferThresholds;
  [key: string]: number | BufferThresholds | undefined;
}

export interface ModelResourceMetrics {
  modelId: string;
  memoryUsage?: number;
  cpuUsage?: number;
  tokenCount?: number;
  messageCount?: number;
  timestamp?: number;
  loadTime?: number;
  status?: string;
  buffers?: BufferConfig;
  lastUsed?: number;
  contextSize?: number;
  activeRequests?: number;
  platform?: string;
  contextState?: any;
  [key: string]: any;
}

export interface ResourceLimits {
  maxModels?: number;
  maxTokensPerModel?: number;
  maxTotalTokens?: number;
  maxModelsLoaded?: number;
  memoryThreshold?: number;
  inactivityTimeout?: number;
  [key: string]: any;
}

export interface BufferLimits {
  memory?: number | BufferThresholds;
  tokens?: number | BufferThresholds;
  messages?: number | BufferThresholds;
  context?: number | BufferThresholds;
  working?: number | BufferThresholds;
  [key: string]: number | BufferThresholds | undefined;
}

export interface MemoryPressureConfig {
  warning?: number;
  critical?: number;
  action?: string;
}

export type PreservationStrategy = 'lru' | 'priority' | 'hybrid' | 'selective';

export interface ContextPreservationConfig {
  enabled: boolean;
  maxSize?: number;
  priority?: number;
  preservationStrategy?: PreservationStrategy;
  [key: string]: any;
}

export interface ResourceManagerConfig {
  maxMemoryUsage?: number;
  maxCpuUsage?: number;
  optimizationThreshold?: number;
  cleanupInterval?: number;
  limits?: ResourceLimits;
  modelSizes?: {
    [key: string]: number;
  };
  buffers?: BufferLimits;
  memoryPressure?: number | MemoryPressureConfig;
  contextPreservation?: ContextPreservationConfig;
  debug?: boolean;
  [key: string]: any;
}

export interface MemoryOptimizationOptions {
  aggressive: boolean;
  targetUsage: number;
  preserveRecent: boolean;
  strategy?: 'lru' | 'priority' | 'hybrid';
  threshold?: number;
}

export type ResourceManagerEventType = 
  | 'error'
  | 'memory_optimized'
  | 'resources_freed'
  | 'model_unloaded'
  | 'context_preserved'
  | 'contextPreserved'
  | 'modelLoaded'
  | 'memoryOptimized';

export interface ResourceManagerEvent {
  type: ResourceManagerEventType;
  timestamp: number;
  modelId?: string;
  data?: any;
}

export interface ErrorEventData {
  error: Error & { code?: string };
  modelId?: string;
  context?: any;
  type?: string;
  data?: any;
}

export interface MemoryOptimizedEventData {
  bytesFreed: number;
  modelsOptimized: string[];
  data?: any;
}

export interface ResourcesFreedEventData {
  bytesFreed: number;
  modelsAffected: string[];
  data?: any;
}

export interface ModelUnloadedEventData {
  modelId: string;
  reason: string;
  data?: any;
}

export interface ContextPreservedEventData {
  modelId: string;
  messageCount: number;
  tokenCount: number;
  data?: any;
}

export interface MetricsEventData {
  metrics: any;
  data?: any;
}

export type ResourceManagerEventData =
  | ErrorEventData
  | MemoryOptimizedEventData
  | ResourcesFreedEventData
  | ModelUnloadedEventData
  | ContextPreservedEventData
  | MetricsEventData
  | { [key: string]: any };

export type ResourceManagerEventHandler = (event: ResourceManagerEvent) => void;

export class ResourceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ResourceError';
    this.code = code;
  }
}

export type ResourceEvent = {
  type: string;
  modelId: string;
  timestamp: number;
  data?: any;
};

export type ResourceOptimizationEvent = ResourceEvent & {
  type: 'resourceOptimized';
  data: {
    bytesFreed: number;
    messageCount: number;
  };
};

export type ResourceExhaustionEvent = ResourceEvent & {
  type: 'resourceExhausted';
  data: {
    reason: string;
    threshold: number;
    current: number;
  };
};

export type ResourcePressureEvent = ResourceEvent & {
  type: 'resourcePressure';
  data: {
    pressure: number;
    threshold: number;
  };
};

export type ResourceCleanupEvent = ResourceEvent & {
  type: 'resourceCleanup';
  data: {
    bytesFreed: number;
    messageCount: number;
  };
};

// Type guards and helper functions
export const isBufferThresholds = (value: any): value is BufferThresholds => {
  return typeof value === 'object' && value !== null && (
    'initial' in value ||
    'max' in value ||
    'optimizationThreshold' in value ||
    'compressionThreshold' in value
  );
};

export const isNumber = (value: any): value is number => {
  return typeof value === 'number';
};

export const isMemoryPressureConfig = (value: any): value is MemoryPressureConfig => {
  return typeof value === 'object' && value !== null && (
    'warning' in value ||
    'critical' in value ||
    'action' in value
  );
};

export const getMemoryUsage = (metrics: ModelResourceMetrics): number => {
  return metrics.memoryUsage || 0;
};

export const getBufferValue = (value: number | BufferThresholds | undefined): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return value.initial || value.max || 0;
};

export const getContextWindow = (context: ModelContextState): number => {
  return context.contextWindow || context.constraints.contextWindow;
};

export const isModelConstraintsArray = (value: ModelConstraints | ModelConstraints[] | undefined): value is ModelConstraints[] => {
  return Array.isArray(value);
};

export const getModelConstraints = (resources: SystemResources): ModelConstraints => {
  const constraints = resources.modelConstraints;
  if (!constraints) {
    return {
      maxTokens: 0,
      contextWindow: 0
    };
  }
  if (isModelConstraintsArray(constraints)) {
    return constraints[0] || { maxTokens: 0, contextWindow: 0 };
  }
  return constraints;
};

export const getContextWindowFromResources = (resources: SystemResources): number => {
  const constraints = getModelConstraints(resources);
  return constraints.contextWindow;
};

export const getMemoryUsageFromResources = (resources: SystemResources): number => {
  return resources.memory || 0;
};

export const getCpuUsageFromResources = (resources: SystemResources): number => {
  return resources.cpu || 0;
};

export const getBufferValueFromResources = (resources: SystemResources, key: keyof Required<SystemResources>['buffers']): number => {
  return resources.buffers?.[key] || 0;
};

export const createDefaultSystemResources = (): SystemResources => ({
  memory: 0,
  cpu: 0,
  totalMemory: 0,
  allocatedMemory: 0,
  availableMemory: 0,
  peakMemory: 0,
  memoryPressure: 0,
  modelConstraints: { maxTokens: 0, contextWindow: 0 },
  timestamp: Date.now()
});