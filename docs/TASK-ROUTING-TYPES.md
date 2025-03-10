# Task Routing - Type Definitions

## Core Types

### Route Options
```typescript
interface RouteOptions {
  // Primary execution path
  primaryRoute: ModelChain;
  
  // Alternative execution paths for fallback
  alternativeRoutes: ModelChain[];
  
  // Estimated resource costs for each route
  estimatedCosts: ResourceCost[];
  
  // Confidence scores for route success
  confidenceScores: Map<string, number>;
  
  // Route constraints and requirements
  constraints: RouteConstraints;
}

interface ResourceCost {
  // Estimated memory usage in MB
  memoryUsage: number;
  
  // Estimated CPU utilization (0-1)
  cpuUtilization: number;
  
  // Expected latency in ms
  expectedLatency: number;
  
  // Token usage estimates
  estimatedTokens: number;
}

interface RouteConstraints {
  // Maximum allowed latency
  maxLatency: number;
  
  // Maximum memory allocation
  maxMemory: number;
  
  // Priority level
  priority: 'high' | 'medium' | 'low';
  
  // Required capabilities
  requiredCapabilities: Set<string>;
}
```

### Resource Management

```typescript
interface AllocationResult {
  // Allocated resources
  allocated: ResourceMap;
  
  // Resource constraints
  constraints: ResourceConstraints;
  
  // Allocation priority
  priority: AllocationPriority;
  
  // Timeout in milliseconds
  timeoutMs: number;
}

interface ResourceMap {
  // Memory allocation in MB
  memory: number;
  
  // CPU cores/threads
  cpu: number;
  
  // GPU resources if available
  gpu?: number;
  
  // Token quota
  tokens: number;
}

type AllocationPriority = 'critical' | 'high' | 'normal' | 'low';

interface ResourceConstraints {
  // Memory limits
  maxMemoryMB: number;
  
  // CPU limits
  maxCPU: number;
  
  // Token rate limits
  maxTokensPerSecond: number;
}
```

### Load Balancing

```typescript
interface LoadDistribution {
  // Task allocations per node
  nodeAllocations: Map<string, TaskAllocation[]>;
  
  // Load balancing metrics
  balanceMetrics: BalanceMetrics;
  
  // Node health status
  healthStatus: NodeHealth[];
}

interface TaskAllocation {
  // Task identifier
  taskId: string;
  
  // Allocated resources
  resources: ResourceMap;
  
  // Priority level
  priority: AllocationPriority;
  
  // Start time
  startTime: number;
  
  // Expected duration
  expectedDuration: number;
}

interface BalanceMetrics {
  // Load distribution score (0-1)
  distributionScore: number;
  
  // Resource utilization
  utilization: ResourceUtilization;
  
  // Performance metrics
  performance: PerformanceMetrics;
}

interface ResourceUtilization {
  // Memory usage percentage
  memoryUtilization: number;
  
  // CPU usage percentage
  cpuUtilization: number;
  
  // Token usage rate
  tokenUsageRate: number;
}
```

### Health Monitoring

```typescript
interface NodeHealth {
  // Node identifier
  nodeId: string;
  
  // Health status
  status: 'healthy' | 'degraded' | 'failed';
  
  // Available resources
  availableResources: ResourceMap;
  
  // Performance metrics
  metrics: PerformanceMetrics;
  
  // Error rate
  errorRate: number;
}

interface PerformanceMetrics {
  // Response time in ms
  responseTime: number;
  
  // Request success rate
  successRate: number;
  
  // Resource efficiency
  efficiency: number;
  
  // Error count
  errors: number;
}
```

### Error Handling

```typescript
interface ErrorRecovery {
  // Error type
  type: 'routing' | 'resource' | 'balance';
  
  // Error severity
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Recovery action
  action: RecoveryAction;
  
  // Recovery status
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface RecoveryAction {
  // Action type
  type: 'retry' | 'failover' | 'rebalance' | 'scale';
  
  // Action parameters
  params: Record<string, any>;
  
  // Success probability
  probability: number;
}
```

## Integration Points

### Capability Scoring Integration

```typescript
interface CapabilityAwareRoute {
  // Route options
  route: RouteOptions;
  
  // Capability requirements
  requiredCapabilities: Map<string, number>;
  
  // Capability scores
  scores: Map<string, number>;
  
  // Confidence level
  confidence: number;
}
```

### Health Monitoring Integration

```typescript
interface HealthAwareRoute {
  // Health checks
  healthStatus: NodeHealth[];
  
  // Degradation handling
  degradationResponse: DegradationAction;
  
  // Failover triggers
  failoverTriggers: FailoverCondition[];
}

interface DegradationAction {
  // Action type
  type: 'scale' | 'rebalance' | 'failover';
  
  // Trigger conditions
  conditions: DegradationCondition[];
  
  // Action parameters
  params: Record<string, any>;
}
```

These type definitions provide the foundation for implementing the task routing system, ensuring type safety and clear interfaces between components.
