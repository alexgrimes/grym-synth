import { ModelMetrics } from '../types';
import { 
  AllocationResult, 
  ResourceMap, 
  ResourceConstraints,
  AllocationPriority,
  RouteOptions,
  PerformanceMetrics
} from './types';

interface ResourcePool {
  available: ResourceMap;
  allocated: Map<string, ResourceMap>;
  reservations: Map<string, {
    resources: ResourceMap;
    expiresAt: number;
  }>;
}

/**
 * Resource Allocator Configuration
 */
interface ResourceAllocatorConfig {
  // Maximum resource limits
  maxMemoryMB: number;
  maxCPU: number;
  maxTokensPerSecond: number;

  // Allocation timeouts (ms)
  defaultTimeout: number;
  maxTimeout: number;
  minTimeout: number;

  // Resource thresholds
  highUtilizationThreshold: number;
  criticalUtilizationThreshold: number;
}

/**
 * Resource Allocator Implementation
 */
export class ResourceAllocator {
  private config: ResourceAllocatorConfig;
  private pool: ResourcePool;

  constructor(config: ResourceAllocatorConfig = defaultConfig) {
    this.config = config;
    this.pool = {
      available: {
        memory: config.maxMemoryMB,
        cpu: config.maxCPU,
        tokens: config.maxTokensPerSecond
      },
      allocated: new Map(),
      reservations: new Map()
    };
  }

  /**
   * Allocate resources for a route
   */
  async allocateResources(route: RouteOptions): Promise<AllocationResult> {
    // Calculate resource needs
    const needs = this.calculateResourceNeeds(route);

    // Check availability
    if (!this.hasRequiredResources(needs)) {
      return this.attemptResourceOptimization(needs, route);
    }

    // Reserve resources
    const allocation = await this.reserveResources(needs, route);
    
    // Generate constraints
    const constraints = this.generateConstraints(needs);

    return {
      allocated: allocation,
      constraints,
      priority: this.determinePriority(route),
      timeoutMs: this.calculateTimeout(route)
    };
  }

  /**
   * Monitor resource usage
   */
  async monitorUsage(allocation: AllocationResult): Promise<ModelMetrics> {
    const metrics = await this.collectResourceMetrics(allocation);
    this.updateResourcePool(metrics);
    return metrics;
  }

  /**
   * Adjust resource allocation based on metrics
   */
  async adjustAllocation(metrics: ModelMetrics): Promise<AllocationResult> {
    const adjustments = this.calculateAdjustments(metrics);
    return this.applyAdjustments(adjustments);
  }

  /**
   * Release allocated resources
   */
  async releaseResources(allocation: AllocationResult): Promise<void> {
    // Return resources to pool
    this.returnResourcesToPool(allocation.allocated);
    
    // Clean up reservations
    this.cleanupReservations();
  }

  private calculateResourceNeeds(route: RouteOptions): ResourceMap {
    const costs = route.estimatedCosts[0];
    return {
      memory: costs.memoryUsage,
      cpu: costs.cpuUtilization,
      tokens: costs.estimatedTokens
    };
  }

  private hasRequiredResources(needs: ResourceMap): boolean {
    return (
      needs.memory <= this.pool.available.memory &&
      needs.cpu <= this.pool.available.cpu &&
      needs.tokens <= this.pool.available.tokens
    );
  }

  private async attemptResourceOptimization(
    needs: ResourceMap,
    route: RouteOptions
  ): Promise<AllocationResult> {
    // Find bottlenecks
    const bottlenecks = this.findResourceBottlenecks(needs);
    
    // Apply optimization strategies
    const optimized = await this.optimizeResources(bottlenecks, route);
    
    // Recalculate allocation
    return this.recalculateAllocation(optimized, route);
  }

  private async recalculateAllocation(
    optimizedNeeds: ResourceMap,
    route: RouteOptions
  ): Promise<AllocationResult> {
    // Reserve optimized resources
    const allocation = await this.reserveResources(optimizedNeeds, route);
    
    // Generate new constraints based on optimized allocation
    const constraints = this.generateConstraints(optimizedNeeds);
    
    return {
      allocated: allocation,
      constraints,
      priority: this.determinePriority(route),
      timeoutMs: this.calculateTimeout(route)
    };
  }

  private findResourceBottlenecks(needs: ResourceMap): string[] {
    const bottlenecks: string[] = [];
    
    if (needs.memory > this.pool.available.memory) {
      bottlenecks.push('memory');
    }
    if (needs.cpu > this.pool.available.cpu) {
      bottlenecks.push('cpu');
    }
    if (needs.tokens > this.pool.available.tokens) {
      bottlenecks.push('tokens');
    }
    
    return bottlenecks;
  }

  private async optimizeResources(
    bottlenecks: string[],
    route: RouteOptions
  ): Promise<ResourceMap> {
    const optimized = { ...route.estimatedCosts[0] };
    
    for (const bottleneck of bottlenecks) {
      switch (bottleneck) {
        case 'memory':
          optimized.memoryUsage *= 0.8;
          break;
        case 'cpu':
          optimized.cpuUtilization *= 0.8;
          break;
        case 'tokens':
          optimized.estimatedTokens *= 0.9;
          break;
      }
    }
    
    return {
      memory: optimized.memoryUsage,
      cpu: optimized.cpuUtilization,
      tokens: optimized.estimatedTokens
    };
  }

  private async reserveResources(
    needs: ResourceMap,
    route: RouteOptions
  ): Promise<ResourceMap> {
    const allocation = { ...needs };
    const reservationId = `${route.primaryRoute.executor.id}-${Date.now()}`;
    
    // Update available resources
    this.pool.available.memory -= allocation.memory;
    this.pool.available.cpu -= allocation.cpu;
    this.pool.available.tokens -= allocation.tokens;
    
    // Record allocation
    this.pool.allocated.set(reservationId, allocation);
    
    // Set reservation expiry
    this.pool.reservations.set(reservationId, {
      resources: allocation,
      expiresAt: Date.now() + this.calculateTimeout(route)
    });
    
    return allocation;
  }

  private generateConstraints(needs: ResourceMap): ResourceConstraints {
    return {
      maxMemoryMB: Math.ceil(needs.memory * 1.2), // 20% buffer
      maxCPU: Math.min(1, needs.cpu * 1.2),
      maxTokensPerSecond: Math.ceil(needs.tokens * 1.1) // 10% buffer
    };
  }

  private determinePriority(route: RouteOptions): AllocationPriority {
    const score = route.confidenceScores.get(route.primaryRoute.executor.id) || 0;
    
    if (score > 0.8) return 'critical';
    if (score > 0.6) return 'high';
    if (score > 0.4) return 'normal';
    return 'low';
  }

  private calculateTimeout(route: RouteOptions): number {
    const baseTimeout = this.config.defaultTimeout;
    const costs = route.estimatedCosts[0];
    
    // Adjust timeout based on estimated costs
    const timeoutMultiplier = 1 + (
      (costs.memoryUsage / this.config.maxMemoryMB) +
      costs.cpuUtilization +
      (costs.estimatedTokens / this.config.maxTokensPerSecond)
    ) / 3;
    
    const timeout = baseTimeout * timeoutMultiplier;
    
    // Clamp to configured limits
    return Math.min(
      Math.max(timeout, this.config.minTimeout),
      this.config.maxTimeout
    );
  }

  private async collectResourceMetrics(
    allocation: AllocationResult
  ): Promise<ModelMetrics> {
    // In a real implementation, this would collect actual usage metrics
    // For now, return estimated metrics
    return {
      executionTime: 0,
      memoryUsed: allocation.allocated.memory,
      tokensUsed: allocation.allocated.tokens,
      totalExecutionTime: 0,
      totalMemoryUsed: allocation.allocated.memory,
      totalTokensUsed: allocation.allocated.tokens
    };
  }

  private updateResourcePool(metrics: ModelMetrics): void {
    // Update pool statistics based on actual usage
    // This would be implemented based on specific monitoring requirements
  }

  private calculateAdjustments(metrics: ModelMetrics): ResourceMap {
    // Calculate needed adjustments based on usage patterns
    return {
      memory: metrics.memoryUsed,
      cpu: metrics.executionTime / this.config.defaultTimeout,
      tokens: metrics.tokensUsed
    };
  }

  private async applyAdjustments(adjustments: ResourceMap): Promise<AllocationResult> {
    // Apply calculated adjustments to current allocations
    return {
      allocated: adjustments,
      constraints: this.generateConstraints(adjustments),
      priority: 'normal',
      timeoutMs: this.config.defaultTimeout
    };
  }

  private returnResourcesToPool(resources: ResourceMap): void {
    this.pool.available.memory += resources.memory;
    this.pool.available.cpu += resources.cpu;
    this.pool.available.tokens += resources.tokens;
  }

  private cleanupReservations(): void {
    const now = Date.now();
    
    for (const [id, reservation] of this.pool.reservations.entries()) {
      if (reservation.expiresAt <= now) {
        this.returnResourcesToPool(reservation.resources);
        this.pool.reservations.delete(id);
        this.pool.allocated.delete(id);
      }
    }
  }
}

const defaultConfig: ResourceAllocatorConfig = {
  maxMemoryMB: 1024 * 8, // 8GB
  maxCPU: 1.0,
  maxTokensPerSecond: 1000,
  defaultTimeout: 30000, // 30 seconds
  maxTimeout: 300000,   // 5 minutes
  minTimeout: 1000,     // 1 second
  highUtilizationThreshold: 0.8,
  criticalUtilizationThreshold: 0.9
};