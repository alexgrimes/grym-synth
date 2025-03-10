/**
 * Health state of the system
 */
export type HealthState = 'healthy' | 'warning' | 'error';

/**
 * Resource pool metrics
 */
export interface ResourceMetrics {
  poolSize: number;
  available: number;
  lastError: Error | null;
}

/**
 * Model types supported by the system
 */
export type ModelType = 
  | 'classifier'
  | 'encoder'
  | 'decoder'
  | 'transformer';

/**
 * Task types that can be processed
 */
export type TaskType =
  | 'classification'
  | 'encoding'
  | 'decoding'
  | 'transformation';

/**
 * System component status
 */
export interface ComponentStatus {
  id: string;
  state: HealthState;
  lastError?: Error;
  metrics?: Record<string, unknown>;
}

/**
 * Resource allocation result
 */
export interface AllocationResult {
  resourceId: string;
  modelType: ModelType;
  status: 'allocated' | 'failed';
  error?: Error;
}

/**
 * Resource cleanup result 
 */
export interface CleanupResult {
  resourceId: string;
  status: 'cleaned' | 'failed';
  error?: Error;
}
