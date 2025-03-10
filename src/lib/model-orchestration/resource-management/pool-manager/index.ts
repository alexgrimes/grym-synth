import type {
  PoolConfig,
  PooledResource,
  ResourcePoolTier,
  CircuitBreakerConfig,
  PoolState,
  PoolAllocationResult,
  ResourcePoolError
} from './types';

export { ResourcePoolManager } from './pool-manager';
export { PoolCache } from './pool-cache';
export { CircuitBreaker } from './circuit-breaker';

// Re-export types with 'export type'
export type {
  PoolConfig,
  PooledResource,
  ResourcePoolTier,
  CircuitBreakerConfig,
  PoolState,
  PoolAllocationResult,
  ResourcePoolError
};

// Default configurations
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxPoolSize: 1000,
  minPoolSize: 10,
  cleanupIntervalMs: 60000,
  resourceTimeoutMs: 30000,
  cacheMaxSize: 100,
  enableCircuitBreaker: true,
  warningThreshold: 0.7,    // 70% utilization triggers warning
  criticalThreshold: 0.9    // 90% utilization triggers critical
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 3
};