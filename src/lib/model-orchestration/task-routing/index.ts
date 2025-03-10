export * from './types';
export * from './routing-engine';
export * from './resource-allocator';
export * from './load-balancer';

/**
 * Task Routing System
 * 
 * This module provides a comprehensive task routing system for the model orchestration framework.
 * It includes:
 * 
 * - Route Selection: Intelligent routing based on runtime capabilities, performance scoring,
 *   and adaptive routing with score decay over time.
 * 
 * - Resource Management: Dynamic allocation, usage monitoring, automatic scaling,
 *   and efficient resource reclamation.
 * 
 * - Load Balancing: Task distribution, node health monitoring, spike handling,
 *   and automatic rebalancing.
 * 
 * Performance Targets:
 * - Route calculation: <10ms
 * - Resource allocation: <5ms
 * - Load balancing: <15ms
 * - Memory overhead: <100MB
 * - CPU utilization: <70%
 * - Cache hit rate: >80%
 * 
 * Integration Points:
 * - ModelOrchestrator: For high-level task management
 * - CapabilityScorer: For runtime capability assessment
 * - HealthMonitor: For system health tracking
 * - MetricsCollector: For performance metrics gathering
 * 
 * @example
 * ```typescript
 * import { RoutingEngine, ResourceAllocator, LoadBalancer } from './task-routing';
 * 
 * // Initialize components
 * const routingEngine = new RoutingEngine();
 * const resourceAllocator = new ResourceAllocator();
 * const loadBalancer = new LoadBalancer();
 * 
 * // Use in model orchestrator
 * class ModelOrchestrator {
 *   constructor(
 *     private routingEngine: RoutingEngine,
 *     private resourceAllocator: ResourceAllocator,
 *     private loadBalancer: LoadBalancer
 *   ) {}
 * 
 *   async processTask(task: Task): Promise<void> {
 *     // Get optimal route
 *     const route = await this.routingEngine.calculateRoutes(task, availableModels);
 * 
 *     // Allocate resources
 *     const allocation = await this.resourceAllocator.allocateResources(route);
 * 
 *     // Balance load
 *     await this.loadBalancer.distributeLoad([task], healthyNodes);
 *   }
 * }
 * ```
 */