/**
 * Core resource management type definitions
 */

// Resource Types
export enum ResourceType {
  Memory = 'memory',
  CPU = 'cpu',
  Storage = 'storage'
}

export enum Priority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3
}

// Core Resource Interfaces
export interface ResourceRequest {
  id: string;
  type: ResourceType;
  priority: Priority;
  requirements: {
    memory?: number;
    cpu?: number;
    timeoutMs?: number;
  };
  constraints?: {
    maxMemory: number;
    maxCpu: number;
    maxLatency: number;
  };
}

export interface Resource {
  id: string;
  type: ResourceType;
  status: ResourceStatus;
  metrics: ResourceMetrics;
  isAvailable: boolean;
}

export interface ResourceStatus {
  health: 'healthy' | 'warning' | 'critical';
  utilization: number;
  lastUpdated: Date;
  nonStaleResourceCount?: number;
}

// Pool Management Types
export interface ResourcePool {
  allocate(request: ResourceRequest): Promise<Resource>;
  release(resource: Resource): Promise<void>;
  optimize(metrics: PoolMetrics): Promise<void>;
  monitor(): ResourceStatus;
}

export interface PoolMetrics {
  utilizationRate: number;
  allocationRate: number;
  releaseRate: number;
  failureRate: number;
  averageLatency: number;
}

// Monitoring Types
export interface ResourceMetrics {
  memory: {
    total: number;
    used: number;
    available: number;
    patterns: number;
    contexts: number;
    models: number;
  };
  cpu: {
    utilization: number;
    loadAverage: number;
    taskQueue: number;
    activeThreads: number;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
}

export interface HealthIndicator {
  status: 'healthy' | 'warning' | 'critical';
  message?: string;
  timestamp: Date;
  metrics: ResourceMetrics;
}

// Resource Manager Types
export interface ResourceManager {
  getAvailableResources(): Promise<Resource[]>;
  requestResource(request: ResourceRequest): Promise<Resource>;
  releaseResource(resourceId: string): Promise<void>;
  getResourceMetrics(): ResourceMetrics;
  getHealth(): HealthIndicator;
}

// Error Types
export class ResourceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly resource?: Resource
  ) {
    super(message);
    this.name = 'ResourceError';
  }
}

export class ResourceExhaustionError extends ResourceError {
  constructor(resource?: Resource) {
    super(
      'Resource allocation failed due to exhaustion',
      'RESOURCE_EXHAUSTED',
      resource
    );
    this.name = 'ResourceExhaustionError';
  }
}

export class ResourceConstraintError extends ResourceError {
  constructor(constraint: string, resource?: Resource) {
    super(
      `Resource constraint violation: ${constraint}`,
      'CONSTRAINT_VIOLATION',
      resource
    );
    this.name = 'ResourceConstraintError';
  }
}