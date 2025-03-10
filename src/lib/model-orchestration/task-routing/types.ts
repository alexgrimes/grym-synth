import { ModelChain } from '../types';

/** Core Types */

export interface RouteOptions {
  primaryRoute: ModelChain;
  alternativeRoutes: ModelChain[];
  estimatedCosts: ResourceCost[];
  confidenceScores: Map<string, number>;
  constraints: RouteConstraints;
}

export interface ResourceCost {
  memoryUsage: number;
  cpuUtilization: number;
  expectedLatency: number;
  estimatedTokens: number;
}

export interface RouteConstraints {
  maxLatency: number;
  maxMemory: number;
  priority: 'high' | 'medium' | 'low';
  requiredCapabilities: Set<string>;
}

/** Resource Management */

export interface AllocationResult {
  allocated: ResourceMap;
  constraints: ResourceConstraints;
  priority: AllocationPriority;
  timeoutMs: number;
}

export interface ResourceMap {
  memory: number;
  cpu: number;
  gpu?: number;
  tokens: number;
}

export type AllocationPriority = 'critical' | 'high' | 'normal' | 'low';

export interface ResourceConstraints {
  maxMemoryMB: number;
  maxCPU: number;
  maxTokensPerSecond: number;
}

/** Load Balancing */

export interface LoadDistribution {
  nodeAllocations: Map<string, TaskAllocation[]>;
  balanceMetrics: BalanceMetrics;
  healthStatus: NodeHealth[];
}

export interface TaskAllocation {
  taskId: string;
  resources: ResourceMap;
  priority: AllocationPriority;
  startTime: number;
  expectedDuration: number;
}

export interface BalanceMetrics {
  distributionScore: number;
  utilization: ResourceUtilization;
  performance: PerformanceMetrics;
}

export interface ResourceUtilization {
  memoryUtilization: number;
  cpuUtilization: number;
  tokenUsageRate: number;
}

/** Health Monitoring */

export interface NodeHealth {
  nodeId: string;
  status: 'healthy' | 'degraded' | 'failed';
  availableResources: ResourceMap;
  metrics: PerformanceMetrics;
  errorRate: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  successRate: number;
  efficiency: number;
  errors: number;
}

/** Error Handling */

export interface ErrorRecovery {
  type: 'routing' | 'resource' | 'balance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: RecoveryAction;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface RecoveryAction {
  type: 'retry' | 'failover' | 'rebalance' | 'scale';
  params: Record<string, any>;
  probability: number;
}

/** Integration Types */

export interface CapabilityAwareRoute {
  route: RouteOptions;
  requiredCapabilities: Map<string, number>;
  scores: Map<string, number>;
  confidence: number;
}

export interface HealthAwareRoute {
  healthStatus: NodeHealth[];
  degradationResponse: DegradationAction;
  failoverTriggers: FailoverCondition[];
}

export interface DegradationAction {
  type: 'scale' | 'rebalance' | 'failover';
  conditions: DegradationCondition[];
  params: Record<string, any>;
}

export interface FailoverCondition {
  metric: string;
  threshold: number;
  duration: number;
}

export interface DegradationCondition {
  metric: string;
  threshold: number;
  period: number;
}