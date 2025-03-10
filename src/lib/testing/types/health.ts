export type HealthStatusType = 'healthy' | 'degraded' | 'error' | 'unavailable';

export interface HealthMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  totalOperations: number;
  latency?: number;
}

export interface ErrorMetrics {
  errorCount: number;
  lastError?: Error;
  errorTypes: Map<string, number>;
}

export interface HealthState {
  status: HealthStatusType;
  health: {
    cpu: number;
    memory: number;
    errorRate: number;
  };
  errorCount: number;
  metrics: HealthMetrics;
  errors?: ErrorMetrics;
  timestamp: Date;
  recommendations?: string[];
}

export interface HealthConfig {
  checkInterval: number;
  errorThreshold: number;
  warningThreshold: number;
  metricsWindow: number;
}

export interface HealthResponse {
  state: HealthState;
  config: HealthConfig;
  history: HealthState[];
}

export function createDefaultHealthState(): HealthState {
  return {
    status: 'healthy',
    health: {
      cpu: 0,
      memory: 0,
      errorRate: 0
    },
    errorCount: 0,
    metrics: {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      totalOperations: 0
    },
    timestamp: new Date()
  };
}

export function createErrorHealthState(error: Error): HealthState {
  return {
    status: 'error',
    health: {
      cpu: 0,
      memory: 0,
      errorRate: 1
    },
    errorCount: 1,
    metrics: {
      responseTime: 0,
      throughput: 0,
      errorRate: 1,
      totalOperations: 0
    },
    errors: {
      errorCount: 1,
      lastError: error,
      errorTypes: new Map([[error.name, 1]])
    },
    timestamp: new Date()
  };
}

export function isHealthy(state: HealthState): boolean {
  return state.status === 'healthy' && state.health.errorRate === 0;
}

export function hasErrors(state: HealthState): boolean {
  return state.errorCount > 0 || state.health.errorRate > 0;
}

export function shouldRetry(state: HealthState): boolean {
  return state.status !== 'unavailable' && state.errorCount < 3;
}