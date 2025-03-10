import { Task, ModelMetrics } from '../types';
import {
  LoadDistribution,
  NodeHealth,
  TaskAllocation,
  BalanceMetrics,
  ResourceUtilization,
  PerformanceMetrics,
  AllocationPriority
} from './types';

/**
 * Load Balancer Configuration
 */
interface LoadBalancerConfig {
  // Distribution settings
  targetLoadVariance: number;
  maxNodeUtilization: number;
  spikeThreshold: number;

  // Health thresholds
  healthyResponseTime: number;
  healthySuccessRate: number;
  maxErrorRate: number;

  // Rebalancing settings
  rebalanceInterval: number;
  minRebalanceImprovement: number;
}

type TaskPriority = 'speed' | 'quality' | 'efficiency';

/**
 * Load Balancer Implementation
 */
export class LoadBalancer {
  private config: LoadBalancerConfig;
  private currentDistribution: LoadDistribution;
  private lastRebalance: number;

  constructor(config: LoadBalancerConfig = defaultConfig) {
    this.config = config;
    this.lastRebalance = Date.now();
    this.currentDistribution = {
      nodeAllocations: new Map(),
      balanceMetrics: this.createInitialBalanceMetrics(),
      healthStatus: []
    };
  }

  /**
   * Distribute tasks across available nodes
   */
  async distributeLoad(tasks: Task[], nodes: NodeHealth[]): Promise<LoadDistribution> {
    // Calculate current load for each node
    const currentLoad = this.calculateNodeLoads(nodes);
    
    // Project task impacts on nodes
    const projectedImpacts = this.calculateTaskImpacts(tasks);
    
    // Create initial distribution
    let distribution = this.createInitialDistribution(nodes);
    
    // Filter healthy nodes
    const healthyNodes = nodes.filter(node => node.status === 'healthy');
    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available for task distribution');
    }
    
    // Sort tasks by priority and resource requirements
    const sortedTasks = [...tasks].sort((a, b) => {
      const aPriority = a.requirements.priority === 'speed' ? 3 :
                       a.requirements.priority === 'quality' ? 2 : 1;
      const bPriority = b.requirements.priority === 'speed' ? 3 :
                       b.requirements.priority === 'quality' ? 2 : 1;
      return bPriority - aPriority;
    });
    
    // Distribute tasks
    for (const task of sortedTasks) {
      const impact = projectedImpacts.find(i => i.taskId === task.id);
      if (impact) {
        // Try to find a suitable node
        let targetNode = this.selectOptimalNode({ ...impact, task }, distribution, healthyNodes);
        
        // If no optimal node found but we have healthy nodes, use the least loaded one
        if (!targetNode && healthyNodes.length > 0) {
          const leastLoadedNode = healthyNodes.reduce((min, node) => {
            const load = this.calculateTotalLoad(distribution.nodeAllocations.get(node.nodeId) || []);
            const minLoad = this.calculateTotalLoad(distribution.nodeAllocations.get(min.nodeId) || []);
            return load < minLoad ? node : min;
          }, healthyNodes[0]);
          
          if (this.meetsNodeConstraints(impact, leastLoadedNode)) {
            targetNode = leastLoadedNode.nodeId;
          }
        }
        
        if (targetNode) {
          this.assignTaskToNode({ ...impact, task }, targetNode, distribution);
        }
      }
    }
    
    // Balance load until variance is acceptable
    while (this.calculateLoadVariance(distribution) > this.config.targetLoadVariance) {
      const improved = await this.improveBalance(distribution, healthyNodes);
      if (!improved) break;
    }
    
    // Update current distribution
    this.currentDistribution = distribution;
    
    return distribution;
  }

  /**
   * Rebalance load based on system metrics
   */
  async rebalance(metrics: SystemMetrics): Promise<LoadAdjustment> {
    if (!this.needsRebalancing(metrics)) {
      return { requiresChange: false };
    }

    const adjustment = await this.calculateLoadAdjustment(metrics);
    if (adjustment.requiresChange) {
      await this.applyLoadAdjustment(adjustment);
    }

    this.lastRebalance = Date.now();
    return adjustment;
  }

  /**
   * Handle traffic spikes
   */
  async handleSpikes(incoming: number): Promise<LoadStrategy> {
    if (incoming > this.config.spikeThreshold) {
      return this.createSpikeStrategy(incoming);
    }
    return { requiresAction: false };
  }

  /**
   * Optimize current distribution
   */
  async optimizeDistribution(): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    
    if (this.needsOptimization(metrics)) {
      await this.performOptimization(metrics);
    }
  }

  private calculateNodeLoads(nodes: NodeHealth[]): Map<string, number> {
    const loads = new Map<string, number>();
    
    for (const node of nodes) {
      const nodeLoad = this.calculateNodeLoad(node);
      loads.set(node.nodeId, nodeLoad);
    }
    
    return loads;
  }

  private calculateNodeLoad(node: NodeHealth): number {
    const resources = node.availableResources;
    
    // Calculate load as a weighted average of resource utilization
    return (
      (resources.memory * 0.4) +
      (resources.cpu * 0.4) +
      (resources.tokens * 0.2)
    );
  }

  private selectOptimalNode(
    impact: TaskImpact,
    distribution: LoadDistribution,
    nodes: NodeHealth[]
  ): string | null {
    // Filter healthy nodes first
    const healthyNodes = nodes.filter(node => node.status === 'healthy');
    if (healthyNodes.length === 0) return null;

    let bestNode = null;
    let lowestLoad = Infinity;
    
    for (const node of healthyNodes) {
      const allocations = distribution.nodeAllocations.get(node.nodeId) || [];
      const currentLoad = this.calculateTotalLoad(allocations);
      const projectedLoad = currentLoad + impact.estimatedLoad;
      
      // Check resource constraints first
      if (!this.meetsNodeConstraints(impact, node)) continue;
      
      // Then check load constraints
      if (projectedLoad >= this.config.maxNodeUtilization) continue;
      
      // Update best node if this one has lower load
      if (projectedLoad < lowestLoad) {
        bestNode = node.nodeId;
        lowestLoad = projectedLoad;
      }
    }
    
    return bestNode;
  }

  private meetsNodeConstraints(impact: TaskImpact, node: NodeHealth): boolean {
    if (!impact.constraints) return true;
    
    const resources = node.availableResources;
    
    return (
      (!impact.constraints.maxMemory || resources.memory >= impact.constraints.maxMemory) &&
      (!impact.constraints.maxCpu || resources.cpu >= impact.constraints.maxCpu)
    );
  }

  private assignTaskToNode(
    impact: TaskImpact,
    nodeId: string,
    distribution: LoadDistribution
  ): void {
    const allocation: TaskAllocation = {
      taskId: impact.taskId,
      resources: {
        memory: impact.constraints?.maxMemory || 512,
        cpu: impact.constraints?.maxCpu || 0.5,
        tokens: 0 // Will be updated during execution
      },
      priority: this.mapPriorityToAllocation(impact.priority),
      startTime: Date.now(),
      expectedDuration: this.estimateTaskDuration(impact)
    };

    const nodeAllocations = distribution.nodeAllocations.get(nodeId) || [];
    nodeAllocations.push(allocation);
    distribution.nodeAllocations.set(nodeId, nodeAllocations);

    // Update balance metrics
    this.updateBalanceMetrics(distribution);
  }

  private estimateTaskDuration(impact: TaskImpact): number {
    // Baseline duration of 1000ms
    const baseDuration = 1000;
    
    // Adjust based on load and constraints
    return baseDuration * (
      1 + impact.estimatedLoad +
      (impact.constraints?.maxLatency ? impact.constraints.maxLatency / 1000 : 0)
    );
  }

  private async improveBalance(
    distribution: LoadDistribution,
    nodes: NodeHealth[]
  ): Promise<boolean> {
    const loads = new Map<string, number>();
    
    // Calculate current loads
    for (const [nodeId, allocations] of distribution.nodeAllocations) {
      loads.set(nodeId, this.calculateTotalLoad(allocations));
    }
    
    // Find most and least loaded nodes
    let maxLoad = -Infinity;
    let minLoad = Infinity;
    let maxNode = '';
    let minNode = '';
    
    for (const [nodeId, load] of loads) {
      if (load > maxLoad) {
        maxLoad = load;
        maxNode = nodeId;
      }
      if (load < minLoad) {
        minLoad = load;
        minNode = nodeId;
      }
    }
    
    // Check if rebalancing is needed
    if (maxLoad - minLoad <= this.config.targetLoadVariance) {
      return false;
    }
    
    // Try to move a task from max to min
    const maxAllocations = distribution.nodeAllocations.get(maxNode) || [];
    
    for (const allocation of maxAllocations) {
      if (this.canMoveAllocation(allocation, minNode, nodes)) {
        this.moveAllocation(allocation, maxNode, minNode, distribution);
        return true;
      }
    }
    
    return false;
  }

  private canMoveAllocation(
    allocation: TaskAllocation,
    targetNodeId: string,
    nodes: NodeHealth[]
  ): boolean {
    const targetNode = nodes.find(n => n.nodeId === targetNodeId);
    if (!targetNode || targetNode.status !== 'healthy') return false;

    // Check if target node has enough resources
    const resources = targetNode.availableResources;
    return (
      resources.memory >= allocation.resources.memory &&
      resources.cpu >= allocation.resources.cpu &&
      resources.tokens >= allocation.resources.tokens
    );
  }

  private moveAllocation(
    allocation: TaskAllocation,
    fromNodeId: string,
    toNodeId: string,
    distribution: LoadDistribution
  ): void {
    const fromAllocations = distribution.nodeAllocations.get(fromNodeId) || [];
    const toAllocations = distribution.nodeAllocations.get(toNodeId) || [];
    
    // Remove from source
    const index = fromAllocations.findIndex(a => a.taskId === allocation.taskId);
    if (index !== -1) {
      fromAllocations.splice(index, 1);
    }
    
    // Add to target
    toAllocations.push(allocation);
    
    // Update distribution
    distribution.nodeAllocations.set(fromNodeId, fromAllocations);
    distribution.nodeAllocations.set(toNodeId, toAllocations);

    // Update metrics
    this.updateBalanceMetrics(distribution);
  }

  private updateBalanceMetrics(distribution: LoadDistribution): void {
    let totalMemory = 0;
    let totalCpu = 0;
    let totalTokens = 0;
    let nodeCount = 0;
    
    for (const [_, allocations] of distribution.nodeAllocations) {
      for (const allocation of allocations) {
        totalMemory += allocation.resources.memory;
        totalCpu += allocation.resources.cpu;
        totalTokens += allocation.resources.tokens;
      }
      nodeCount++;
    }
    
    if (nodeCount > 0) {
      distribution.balanceMetrics.utilization = {
        memoryUtilization: totalMemory / (nodeCount * 1024), // Convert to GB
        cpuUtilization: totalCpu / nodeCount,
        tokenUsageRate: totalTokens / nodeCount
      };
    }
    
    distribution.balanceMetrics.distributionScore =
      1 - this.calculateLoadVariance(distribution);
  }

  private calculateTotalLoad(allocations: TaskAllocation[]): number {
    return allocations.reduce((total, allocation) => {
      const resourceLoad = (
        (allocation.resources.memory / 1024) * 0.4 +
        allocation.resources.cpu * 0.4 +
        (allocation.resources.tokens / 1000) * 0.2
      );
      return total + resourceLoad;
    }, 0);
  }

  private calculateLoadVariance(distribution: LoadDistribution): number {
    const loads = Array.from(distribution.nodeAllocations.values())
      .map(allocations => this.calculateTotalLoad(allocations));
    
    if (loads.length === 0) return 0;
    
    const average = loads.reduce((a, b) => a + b, 0) / loads.length;
    const squaredDiffs = loads.map(load => Math.pow(load - average, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / loads.length;
    
    return Math.sqrt(variance); // Return standard deviation
  }

  private calculateTaskImpacts(tasks: Task[]): TaskImpact[] {
    return tasks.map(task => ({
      taskId: task.id,
      estimatedLoad: this.estimateTaskLoad(task),
      priority: task.requirements.priority as TaskPriority,
      constraints: task.requirements.resourceConstraints,
      task
    }));
  }

  private estimateTaskLoad(task: Task): number {
    const constraints = task.requirements.resourceConstraints;
    if (!constraints) return 1.0; // Default impact
    
    return (
      ((constraints.maxMemory || 512) / 1024) * 0.4 +
      (constraints.maxCpu || 0.5) * 0.4 +
      ((constraints.maxLatency || 500) / 1000) * 0.2
    );
  }

  private createInitialDistribution(nodes: NodeHealth[]): LoadDistribution {
    return {
      nodeAllocations: new Map(nodes.map(node => [node.nodeId, []])),
      balanceMetrics: this.createInitialBalanceMetrics(),
      healthStatus: nodes
    };
  }

  private async calculateLoadAdjustment(metrics: SystemMetrics): Promise<LoadAdjustment> {
    const changes: Array<{ nodeId: string; adjustment: number }> = [];
    
    // Get current loads for all nodes
    const nodeLoads = new Map<string, number>();
    let totalLoad = 0;
    let healthyNodeCount = 0;
    let maxLoad = -Infinity;
    let minLoad = Infinity;
    
    // Calculate loads and find healthy nodes
    for (const [nodeId, allocations] of this.currentDistribution.nodeAllocations) {
      const node = this.currentDistribution.healthStatus.find(n => n.nodeId === nodeId);
      if (node && node.status === 'healthy') {
        const load = this.calculateTotalLoad(allocations);
        nodeLoads.set(nodeId, load);
        totalLoad += load;
        healthyNodeCount++;
        maxLoad = Math.max(maxLoad, load);
        minLoad = Math.min(minLoad, load);
      }
    }
    
    if (healthyNodeCount === 0) return { requiresChange: false };
    
    // Calculate target load per node
    const targetLoad = totalLoad / healthyNodeCount;
    const currentVariance = (maxLoad - minLoad) / targetLoad;
    
    // If variance is high, force rebalancing
    const needsRebalancing = currentVariance > this.config.targetLoadVariance;
    
    if (needsRebalancing) {
      // Sort nodes by load difference from target
      const sortedNodes = Array.from(nodeLoads.entries())
        .sort(([, a], [, b]) => Math.abs(b - targetLoad) - Math.abs(a - targetLoad));
      
      // Calculate adjustments for most imbalanced nodes
      for (const [nodeId, load] of sortedNodes) {
        const deviation = Math.abs(load - targetLoad);
        if (deviation > this.config.targetLoadVariance * targetLoad) {
          const adjustment = targetLoad - load;
          if (Math.abs(adjustment) > this.config.minRebalanceImprovement) {
            changes.push({ nodeId, adjustment });
          }
        }
      }
    }
    
    return {
      requiresChange: changes.length > 0,
      changes
    };
  }

  private async applyLoadAdjustment(adjustment: LoadAdjustment): Promise<void> {
    if (!adjustment.changes) return;
    
    for (const change of adjustment.changes) {
      const allocations = this.currentDistribution.nodeAllocations.get(change.nodeId) || [];
      
      if (change.adjustment < 0) {
        // Need to reduce load - remove some allocations
        const sortedByLoad = [...allocations].sort((a, b) => 
          this.calculateTotalLoad([b]) - this.calculateTotalLoad([a])
        );
        
        let removedLoad = 0;
        const toRemove: TaskAllocation[] = [];
        
        for (const allocation of sortedByLoad) {
          const load = this.calculateTotalLoad([allocation]);
          if (removedLoad + load <= Math.abs(change.adjustment)) {
            toRemove.push(allocation);
            removedLoad += load;
          }
        }
        
        this.currentDistribution.nodeAllocations.set(
          change.nodeId,
          allocations.filter(a => !toRemove.includes(a))
        );
      }
    }
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const loadVariance = this.calculateLoadVariance(this.currentDistribution);
    let maxUtilization = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    let nodeCount = 0;
    
    for (const node of this.currentDistribution.healthStatus) {
      const utilization = 1 - (node.availableResources.cpu);
      maxUtilization = Math.max(maxUtilization, utilization);
      totalResponseTime += node.metrics.responseTime;
      totalErrors += node.metrics.errors;
      nodeCount++;
    }
    
    return {
      loadVariance,
      maxUtilization,
      averageResponseTime: totalResponseTime / (nodeCount || 1),
      errorRate: totalErrors / (nodeCount || 1)
    };
  }

  private needsOptimization(metrics: SystemMetrics): boolean {
    return (
      metrics.loadVariance > this.config.targetLoadVariance ||
      metrics.maxUtilization > this.config.maxNodeUtilization ||
      metrics.averageResponseTime > this.config.healthyResponseTime ||
      metrics.errorRate > this.config.maxErrorRate
    );
  }

  private async performOptimization(metrics: SystemMetrics): Promise<void> {
    // Identify problematic nodes
    const problemNodes = this.currentDistribution.healthStatus
      .filter(node => 
        node.metrics.responseTime > this.config.healthyResponseTime ||
        node.metrics.errors > 0
      );
    
    for (const node of problemNodes) {
      // Gradually reduce load on problematic nodes
      const allocations = this.currentDistribution.nodeAllocations.get(node.nodeId) || [];
      const currentLoad = this.calculateTotalLoad(allocations);
      
      await this.applyLoadAdjustment({
        requiresChange: true,
        changes: [{
          nodeId: node.nodeId,
          adjustment: -(currentLoad * 0.2) // Reduce load by 20%
        }]
      });
    }
  }

  private async createSpikeStrategy(incoming: number): Promise<LoadStrategy> {
    return {
      requiresAction: true,
      recommendations: [
        {
          action: 'scale',
          factor: Math.ceil(incoming / this.config.spikeThreshold),
          priority: 'high'
        },
        {
          action: 'redistribute',
          priority: 'high'
        }
      ]
    };
  }

  private createInitialBalanceMetrics(): BalanceMetrics {
    return {
      distributionScore: 1,
      utilization: {
        memoryUtilization: 0,
        cpuUtilization: 0,
        tokenUsageRate: 0
      },
      performance: {
        responseTime: 0,
        successRate: 1,
        efficiency: 1,
        errors: 0
      }
    };
  }

  private needsRebalancing(metrics: SystemMetrics): boolean {
    // Check rebalance interval
    const timeSinceLastRebalance = Date.now() - this.lastRebalance;
    if (timeSinceLastRebalance < this.config.rebalanceInterval) {
      return false;
    }
    
    // Check if we have healthy nodes
    const healthyNodes = this.currentDistribution.healthStatus
      .filter(node => node.status === 'healthy');
    if (healthyNodes.length === 0) {
      return false;
    }
    
    // Check if any thresholds are exceeded
    const needsRebalance = (
      metrics.loadVariance > this.config.targetLoadVariance ||
      metrics.maxUtilization > this.config.maxNodeUtilization ||
      metrics.averageResponseTime > this.config.healthyResponseTime ||
      metrics.errorRate > this.config.maxErrorRate
    );
    
    // If we have a high load variance (more than 3x target), force rebalancing
    if (metrics.loadVariance > this.config.targetLoadVariance * 3) {
      return true;
    }
    
    // For normal threshold violations, check if we have enough healthy nodes
    return needsRebalance && healthyNodes.length > 1;
  }

  private mapPriorityToAllocation(priority: TaskPriority): AllocationPriority {
    switch (priority) {
      case 'speed': return 'high';
      case 'quality': return 'normal';
      case 'efficiency': return 'low';
    }
  }
}

interface SystemMetrics {
  loadVariance: number;
  maxUtilization: number;
  averageResponseTime: number;
  errorRate: number;
}

interface TaskImpact {
  taskId: string;
  estimatedLoad: number;
  priority: TaskPriority;
  constraints?: {
    maxMemory?: number;
    maxCpu?: number;
    maxLatency?: number;
  };
  task: Task;
}

interface LoadAdjustment {
  requiresChange: boolean;
  changes?: Array<{
    nodeId: string;
    adjustment: number;
  }>;
}

interface LoadStrategy {
  requiresAction: boolean;
  recommendations?: Array<{
    action: 'scale' | 'redistribute' | 'throttle';
    factor?: number;
    priority?: AllocationPriority;
  }>;
}

const defaultConfig: LoadBalancerConfig = {
  targetLoadVariance: 0.1, // 10% variance allowed
  maxNodeUtilization: 0.8, // 80% max utilization
  spikeThreshold: 100,    // requests per second

  healthyResponseTime: 200,  // ms
  healthySuccessRate: 0.95,
  maxErrorRate: 0.05,

  rebalanceInterval: 60000,  // 1 minute
  minRebalanceImprovement: 0.1
};