import { ResourcePool, ResourceRequest, Resource, ResourceStatus, PoolMetrics, ResourceType, Priority } from '../types';
import { ResourceDetector } from '../resource-detection';
import { ResourceAvailability } from '../resource-detection/types';
import { PoolCache } from './pool-cache';
import { CircuitBreaker } from './circuit-breaker';
import {
  PoolConfig,
  PooledResource,
  ResourcePoolTier,
  CircuitBreakerConfig,
  ResourcePoolError,
  StateChangeEvent,
  PoolState
} from './types';
import { EventEmitter } from 'events';

/** Get string name for priority level */
function getPriorityName(priority: Priority): string {
  switch (priority) {
    case Priority.Low: return 'low';
    case Priority.Medium: return 'medium';
    case Priority.High: return 'high';
    case Priority.Critical: return 'critical';
    default: return 'unknown';
  }
}

export class ResourcePoolManager extends EventEmitter implements ResourcePool {
  private tiers: Map<number, ResourcePoolTier>;
  private cache: PoolCache;
  private circuitBreaker: CircuitBreaker;
  private config: PoolConfig;
  private detector: ResourceDetector;
  private intervals: Set<NodeJS.Timeout> = new Set();
  private metrics: PoolMetrics;
  private currentState: PoolState = 'healthy';
  private lastAvailability: ResourceAvailability | null = null;
  private stateChangeDebounceTimeout: NodeJS.Timeout | null = null;
  private isDisposed: boolean = false;

  constructor(
    detector: ResourceDetector,
    config: PoolConfig = {
      maxPoolSize: 1000,
      minPoolSize: 10,
      cleanupIntervalMs: 60000,
      resourceTimeoutMs: 30000,
      cacheMaxSize: 100,
      enableCircuitBreaker: true,
      warningThreshold: 0.25,  // 25% utilization triggers warning
      criticalThreshold: 0.75  // 75% utilization triggers critical
    }
  ) {
    super();
    this.detector = detector;
    this.config = config;
    this.tiers = new Map();
    this.cache = new PoolCache(config.cacheMaxSize);
    
    // Initialize circuit breaker
    const breakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenMaxAttempts: 3
    };
    this.circuitBreaker = new CircuitBreaker(breakerConfig);

    // Initialize metrics
    this.metrics = {
      utilizationRate: 0,
      allocationRate: 0,
      releaseRate: 0,
      failureRate: 0,
      averageLatency: 0
    };

    // Initialize pool tiers
    this.initializeTiers();

    if (!this.isDisposed) {
      // Start cleanup process
      const cleanupInterval = setInterval(async () => {
        try {
          await this.runCleanup();
        } catch (error) {
          console.error('Error in cleanup interval:', error);
        }
      }, config.cleanupIntervalMs);
      this.intervals.add(cleanupInterval);

      // Set up resource monitoring
      this.setupResourceMonitoring();
    }
  }

  private generateResourceId(priority: Priority): string {
    const priorityName = getPriorityName(priority);
    return `${priorityName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupResourceMonitoring(): void {
    if (this.isDisposed) return;

    // Initial check
    this.checkAvailability();

    // Set up periodic checks with error handling
    const monitorInterval = setInterval(() => {
      try {
        this.checkAvailability();
      } catch (error) {
        console.error('Error in monitoring interval:', error);
      }
    }, 1000);
    this.intervals.add(monitorInterval);
  }

  protected async checkAvailability(): Promise<void> {
    try {
      const availability = await this.detector.getAvailability();
      this.onResourceUpdate(availability);
    } catch (error) {
      console.error('Error checking resource availability:', error);
      // Don't update state on error to prevent thrashing
    }
  }

  // Public method for forcing state updates (useful for testing)
  public async forceUpdate(): Promise<void> {
    await this.checkAvailability();
  }

  private onResourceUpdate(availability: ResourceAvailability): void {
    // Store availability before calculating state
    this.lastAvailability = {
      ...availability,
      timestamp: new Date()
    };

    // Calculate new state using stored availability
    const newState = this.calculateState(availability);
    
    // Only emit state change if different
    if (this.currentState !== newState) {
      const previousState = this.currentState;
      this.currentState = newState;
      
      const event: StateChangeEvent = {
        from: previousState,
        to: newState,
        metrics: this.lastAvailability
      };
      
      this.emit('stateChange', event);
      
      // Enhanced state transition logging
      console.info('Resource state transition:', {
        previousState,
        newState,
        metrics: {
          memory: `${availability.memory.utilizationPercent.toFixed(1)}%`,
          cpu: `${availability.cpu.utilizationPercent.toFixed(1)}%`,
          pool: `${(this.calculateUtilization() * 100).toFixed(1)}%`
        },
        systemStatus: availability.status,
        reason: availability.status !== 'healthy' ? 'system status' : 'utilization metrics'
      });
    }
  }

  private calculateHealthState(utilization: number): PoolState {
    // Get normalized values and thresholds
    const utilizationPercent = utilization * 100;
    
    // Determine state based on thresholds only
    if (utilization >= this.config.criticalThreshold) {
      return 'critical';
    } else if (utilization >= this.config.warningThreshold) {
      return 'warning';
    }
    return 'healthy';
  }

  private calculateState(availability: ResourceAvailability): PoolState {
    const metrics = {
      memory: availability.memory.utilizationPercent,
      cpu: availability.cpu.utilizationPercent,
      pool: this.calculateUtilization() * 100
    };

    // Calculate state based on metrics
    const maxUtilization = Math.max(metrics.memory, metrics.cpu, metrics.pool);
    let state: PoolState = 'healthy';

    // First check system status
    if (availability.status === 'critical') {
      state = 'critical';
    } else if (availability.status === 'warning') {
      state = 'warning';
    } else {
      // If system status is healthy or not set, use metric thresholds
      if (maxUtilization >= this.config.criticalThreshold * 100) {
        state = 'critical';
      } else if (maxUtilization >= this.config.warningThreshold * 100) {
        state = 'warning';
      }
    }

    // Single consolidated debug log
    console.debug('Health check:', {
      health: state,
      metrics: {
        memory: `${metrics.memory.toFixed(1)}%`,
        cpu: `${metrics.cpu.toFixed(1)}%`,
        pool: `${metrics.pool.toFixed(1)}%`
      },
      maxUtilization: `${maxUtilization.toFixed(1)}%`,
      thresholds: {
        warning: `${(this.config.warningThreshold * 100).toFixed(1)}%`,
        critical: `${(this.config.criticalThreshold * 100).toFixed(1)}%`
      },
      systemStatus: availability.status,
      stateSource: availability.status ? 'system' : 'metrics'
    });

    return state;
  }

  public async allocate(request: ResourceRequest): Promise<Resource> {
    const startTime = Date.now();

    try {
      // Check cache first for fast allocation
      const cachedResource = this.cache.get(request);
      if (cachedResource && this.isResourceValid(cachedResource)) {
        this.updateMetrics(startTime, true);
        return cachedResource;
      }

      // Use circuit breaker for protected allocation
      return await this.circuitBreaker.execute(async () => {
        const resource = await this.allocateFromTiers(request);
        
        // Cache the allocation if successful
        if (resource) {
          this.cache.put(request, resource as PooledResource);
        }
        
        this.updateMetrics(startTime, false);
        return resource;
      });
    } catch (error) {
      this.metrics.failureRate++;
      throw error;
    }
  }

  public async release(resource: Resource): Promise<void> {
    const startTime = Date.now();

    try {
      const pooledResource = resource as PooledResource;
      const tier = this.tiers.get(pooledResource.poolId);

      // First check if resource exists in the pool
      if (!tier) {
        throw new ResourcePoolError('Invalid pool ID', 'INVALID_POOL', pooledResource);
      }

      const resourceExists = tier.resources.some(r => r.id === pooledResource.id);
      if (!resourceExists) {
        throw new ResourcePoolError('Resource is stale', 'RESOURCE_STALE', pooledResource);
      }

      // Then check if it's valid
      if (!this.isResourceValid(pooledResource)) {
        throw new ResourcePoolError('Resource is stale', 'RESOURCE_STALE', pooledResource);
      }

      // Remove from cache
      this.cache.remove({
        id: resource.id,
        type: resource.type,
        priority: tier.priority,
        requirements: {}
      });

      // Update resource status
      pooledResource.isAvailable = true;
      pooledResource.lastUsed = new Date();
      pooledResource.status.utilization = 0;
      pooledResource.status.lastUpdated = new Date();

      // Update tier utilization
      const currentTier = this.tiers.get(pooledResource.poolId);
      if (currentTier) {
        const totalResources = currentTier.resources.length;
        const usedResources = currentTier.resources.filter(r => !r.isAvailable).length;
        currentTier.utilization = usedResources / totalResources;
      }

      // Update overall pool metrics
      this.metrics.releaseRate++;
      const utilization = this.calculateUtilization();
      this.metrics.utilizationRate = utilization;
      this.updateHealth(utilization);
      this.updateMetrics(startTime, false);
    } catch (error) {
      this.metrics.failureRate++;
      throw error;
    }
  }

  public async optimize(metrics: PoolMetrics): Promise<void> {
    // Adjust pool sizes based on metrics
    const totalResources = Array.from(this.tiers.values())
      .reduce((sum, tier) => sum + tier.resources.length, 0);

    if (metrics.utilizationRate > 0.8 && totalResources < this.config.maxPoolSize) {
      await this.growPool();
    } else if (metrics.utilizationRate < 0.3 && totalResources > this.config.minPoolSize) {
      await this.shrinkPool();
    }

    // Update metrics
    this.metrics = { ...this.metrics, ...metrics };
  }

  private calculateUtilization(): number {
    const now = Date.now();
    let totalResources = 0;
    let activeResources = 0;
    let hasValidResources = false;

    // Calculate totals across all tiers
    for (const tier of this.tiers.values()) {
      // Only count non-stale resources
      const validResources = tier.resources.filter(resource => {
        const timeSinceLastUse = now - resource.lastUsed.getTime();
        return timeSinceLastUse <= this.config.resourceTimeoutMs;
      });

      if (validResources.length > 0) {
        hasValidResources = true;
        const busyCount = validResources.filter(r => !r.isAvailable).length;
        activeResources += busyCount;
        totalResources += validResources.length;
        
        // Update tier utilization
        tier.utilization = busyCount / validResources.length;
      } else {
        tier.utilization = 0;
      }
    }

    // Debug logging
    console.debug('Resource utilization:', {
      activeResources,
      totalResources,
      utilization: hasValidResources ? (activeResources / totalResources) : 0
    });

    // Only return non-zero utilization if we have valid resources
    return hasValidResources ? activeResources / totalResources : 0;
  }

  private determineHealthState(utilization: number): PoolState {
    if (utilization >= this.config.criticalThreshold) {
      return 'critical';
    } else if (utilization >= this.config.warningThreshold) {
      return 'warning';
    }
    return 'healthy';
  }

  private updateHealth(utilization: number): void {
    const previousState = this.currentState;
    const newState = this.determineHealthState(utilization);
    
    if (previousState !== newState) {
      // Create comprehensive state change event
      const event: StateChangeEvent = {
        from: previousState,
        to: newState,
        metrics: this.lastAvailability ?? {
          status: 'healthy',
          memory: {
            utilizationPercent: utilization * 100,
            isAvailable: true,
            availableAmount: 0
          },
          cpu: {
            utilizationPercent: 0,
            isAvailable: true,
            availableCores: 0
          },
          disk: {
            utilizationPercent: 0,
            isAvailable: true,
            availableSpace: 0
          },
          timestamp: new Date()
        }
      };

      // Update state and emit event
      this.currentState = newState;
      this.emit('stateChange', event);
      
      // Log state transition with context
      console.info(
        `Resource pool state transition: ${previousState} -> ${newState}`,
        `(utilization: ${(utilization * 100).toFixed(1)}%, ` +
        `allocation rate: ${this.metrics.allocationRate}/s, ` +
        `failure rate: ${this.metrics.failureRate}/s)`
      );
    }
  }

  public monitor(): ResourceStatus {
    // Calculate non-stale resources
    const nonStale = Array.from(this.tiers.values())
      .reduce((sum, tier) => sum + tier.resources.filter(r =>
        Date.now() - r.lastUsed.getTime() <= this.config.resourceTimeoutMs
      ).length, 0);

    // Get latest availability info
    const availability = this.lastAvailability;
    if (!availability) {
      return {
        health: 'healthy',
        utilization: 0,
        nonStaleResourceCount: nonStale,
        lastUpdated: new Date()
      };
    }

    // Calculate health state using current availability
    const health = this.calculateState(availability);

    // Calculate utilization from all sources
    const metrics = {
      memory: availability.memory.utilizationPercent,
      cpu: availability.cpu.utilizationPercent,
      pool: this.calculateUtilization() * 100
    };

    // Use max utilization as effective utilization
    const effectiveUtilization = Math.max(
      metrics.memory / 100,
      metrics.cpu / 100,
      metrics.pool / 100
    );

    // Log state changes with complete context
    if (this.currentState !== health) {
      console.info('Resource status change:', {
        health,
        previousHealth: this.currentState,
        metrics: {
          memory: `${(metrics.memory * 100).toFixed(1)}%`,
          cpu: `${(metrics.cpu * 100).toFixed(1)}%`,
          pool: `${(metrics.pool * 100).toFixed(1)}%`
        },
        effectiveUtilization: `${(effectiveUtilization * 100).toFixed(1)}%`,
        systemStatus: availability.status
      });
      this.currentState = health;
    }

    return {
      health,
      utilization: nonStale === 0 ? 0 : effectiveUtilization,
      nonStaleResourceCount: nonStale,
      lastUpdated: new Date()
    };
  }

  private async allocateFromTiers(request: ResourceRequest): Promise<Resource> {
    // Check system resources first
    const availability = await this.detector.getAvailability();
    if (!this.hasEnoughResources(availability, request)) {
      throw new ResourcePoolError('System resources exhausted', 'RESOURCE_EXHAUSTED');
    }

    // Try to allocate from appropriate tier
    const tier = this.tiers.get(request.priority);
    if (!tier) {
      throw new ResourcePoolError('Invalid priority level', 'INVALID_PRIORITY');
    }

    // Find available resource
    const resource = tier.resources.find(r => 
      r.isAvailable && this.meetsConstraints(r, request)
    );

    if (!resource) {
      // Try to grow pool if no resources available
      if (tier.resources.length < tier.maxSize) {
        const newResource = await this.createResource(request.priority);
        tier.resources.push(newResource);
        return newResource;
      }
      throw new ResourcePoolError('No available resources', 'RESOURCE_EXHAUSTED');
    }

    // Update resource state
    resource.isAvailable = false;
    resource.allocatedAt = new Date();
    resource.lastUsed = new Date();  // Update lastUsed when allocating
    resource.timeoutMs = request.requirements.timeoutMs;

    // Update resource and tier utilization
    resource.status.utilization = 1; // Resource is now fully utilized
    resource.status.lastUpdated = new Date();

    const currentTier = this.tiers.get(request.priority);
    if (currentTier) {
      const totalResources = currentTier.resources.length;
      const usedResources = currentTier.resources.filter(r => !r.isAvailable).length;
      currentTier.utilization = usedResources / totalResources;
    }

    // Update overall pool utilization
    const utilization = this.calculateUtilization();
    this.metrics.utilizationRate = utilization;
    this.updateHealth(utilization);

    return resource;
  }

  private async createResource(priority: Priority): Promise<PooledResource> {
    const systemResources = await this.detector.getCurrentResources();
    const totalMemory = systemResources.memory.total;
    const totalCores = systemResources.cpu.cores;

    return {
      id: this.generateResourceId(priority),
      type: ResourceType.Memory,
      status: {
        health: 'healthy',
        utilization: 0,
        lastUpdated: new Date()
      },
      metrics: {
        memory: {
          total: Math.floor(totalMemory / 20), // 5% of total memory per resource
          used: 0,
          available: Math.floor(totalMemory / 20),
          patterns: 0,
          contexts: 0,
          models: 0
        },
        cpu: {
          utilization: 0,
          loadAverage: 0,
          taskQueue: 0,
          activeThreads: Math.floor(totalCores / 10) // 10% of cores per resource
        },
        cache: {
          hitRate: 0,
          size: 0,
          evictions: 0
        }
      },
      isAvailable: true,
      poolId: priority,
      lastUsed: new Date()
    };
  }

  private async runCleanup(): Promise<void> {
    const now = Date.now();
    const cleanupStats = {
      totalRemoved: 0,
      tierResults: new Map<string, { initial: number, removed: number, remaining: number }>()
    };

    // Single start log for entire cleanup operation
    console.debug('Starting resource pool cleanup');

    for (const tier of this.tiers.values()) {
      const tierName = getPriorityName(tier.priority);
      const initialCount = tier.resources.length;

      // Identify stale resources
      const staleResources = tier.resources.filter(resource => {
        const timeSinceLastUse = now - resource.lastUsed.getTime();
        const timeSinceAllocation = resource.allocatedAt ?
          now - resource.allocatedAt.getTime() : 0;
        
        return timeSinceLastUse > this.config.resourceTimeoutMs ||
          (!resource.isAvailable && resource.timeoutMs &&
           timeSinceAllocation > resource.timeoutMs);
      });

      if (staleResources.length > 0) {
        // Process stale resources in bulk
        tier.resources = tier.resources.filter(resource =>
          !staleResources.find(stale => stale.id === resource.id));

        // Update tier stats
        cleanupStats.totalRemoved += staleResources.length;
        cleanupStats.tierResults.set(tierName, {
          initial: initialCount,
          removed: staleResources.length,
          remaining: tier.resources.length
        });

        // Update tier utilization
        const usedResources = tier.resources.filter(r => !r.isAvailable).length;
        tier.utilization = tier.resources.length ? usedResources / tier.resources.length : 0;
      }
    }

    // Single consolidated cleanup summary
    if (cleanupStats.totalRemoved > 0) {
      console.info('Cleanup summary:', {
        totalRemoved: cleanupStats.totalRemoved,
        tiers: Array.from(cleanupStats.tierResults.entries()).map(([name, stats]) => ({
          name,
          removed: stats.removed,
          remaining: stats.remaining,
          utilization: `${(this.tiers.get(Priority[name as keyof typeof Priority])?.utilization ?? 0 * 100).toFixed(1)}%`
        }))
      });
    }

    // Update metrics and health
    const utilization = this.calculateUtilization();
    this.metrics.utilizationRate = utilization;
    
    const newHealth = this.calculateState(this.lastAvailability ?? {
      status: 'healthy',
      memory: { utilizationPercent: utilization * 100, isAvailable: true, availableAmount: 0 },
      cpu: { utilizationPercent: 0, isAvailable: true, availableCores: 0 },
      disk: { utilizationPercent: 0, isAvailable: true, availableSpace: 0 },
      timestamp: new Date()
    });
    
    if (this.currentState !== newHealth) {
      this.currentState = newHealth;
      this.emit('stateChange', {
        from: this.currentState,
        to: newHealth,
        metrics: this.lastAvailability!
      });
    }
  }

  private initializeTiers(): void {
    // Initialize tiers for each priority level with initial resources
    const systemResources = this.detector.getCurrentResources();
    const totalMemory = systemResources.memory.total;
    const totalCores = systemResources.cpu.cores;

    const createInitialResource = (priority: Priority): PooledResource => ({
      id: this.generateResourceId(priority),
      type: ResourceType.Memory,
      status: {
        health: 'healthy',
        utilization: 0,
        lastUpdated: new Date()
      },
      metrics: {
        memory: {
          total: Math.floor(totalMemory / 20), // 5% of total memory per resource
          used: 0,
          available: Math.floor(totalMemory / 20),
          patterns: 0,
          contexts: 0,
          models: 0
        },
        cpu: {
          utilization: 0,
          loadAverage: 0,
          taskQueue: 0,
          activeThreads: Math.floor(totalCores / 10) // 10% of cores per resource
        },
        cache: {
          hitRate: 0,
          size: 0,
          evictions: 0
        }
      },
      isAvailable: true,
      poolId: priority,
      lastUsed: new Date()
    });

    // Initialize each tier with some initial resources
    this.tiers.set(Priority.Low, {
      priority: Priority.Low,
      resources: Array(5).fill(0).map(() => createInitialResource(Priority.Low)),
      maxSize: 100,
      utilization: 0
    });
    this.tiers.set(Priority.Medium, {
      priority: Priority.Medium,
      resources: Array(10).fill(0).map(() => createInitialResource(Priority.Medium)),
      maxSize: 200,
      utilization: 0
    });
    this.tiers.set(Priority.High, {
      priority: Priority.High,
      resources: Array(15).fill(0).map(() => createInitialResource(Priority.High)),
      maxSize: 500,
      utilization: 0
    });
    this.tiers.set(Priority.Critical, {
      priority: Priority.Critical,
      resources: Array(10).fill(0).map(() => createInitialResource(Priority.Critical)),
      maxSize: 200,
      utilization: 0
    });
  }

  private async growPool(): Promise<void> {
    const systemResources = await this.detector.getCurrentResources();
    for (const [priority, tier] of this.tiers.entries()) {
      if (tier.resources.length < tier.maxSize) {
        const newResource = await this.createResource(priority);
        tier.resources.push(newResource);
      }
    }
  }

  private async shrinkPool(): Promise<void> {
    for (const tier of this.tiers.values()) {
      const unusedResources = tier.resources.filter(
        r => r.isAvailable && 
        Date.now() - r.lastUsed.getTime() > this.config.resourceTimeoutMs
      );

      // Remove up to 10% of unused resources
      const removeCount = Math.min(
        Math.ceil(tier.resources.length * 0.1),
        unusedResources.length
      );

      if (removeCount > 0) {
        const toRemove = unusedResources
          .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime())
          .slice(0, removeCount);

        tier.resources = tier.resources.filter(
          r => !toRemove.find(remove => remove.id === r.id)
        );
      }
    }
  }

  private updateMetrics(startTime: number, fromCache: boolean): void {
    const duration = Date.now() - startTime;
    this.metrics.averageLatency = (this.metrics.averageLatency + duration) / 2;
    
    if (fromCache) {
      this.metrics.allocationRate++;
    } else {
      // Update overall utilization rate
      const utilization = this.calculateUtilization();
      this.metrics.utilizationRate = utilization;
      
      // Update health state based on new utilization
      this.updateHealth(utilization);
    }
    
    // Track allocation rate regardless of cache
    this.metrics.allocationRate++;
  }

  private isResourceValid(resource: PooledResource): boolean {
    const now = Date.now();
    const timeSinceLastUse = now - resource.lastUsed.getTime();

    // Check if resource is stale based on timeout
    if (timeSinceLastUse > this.config.resourceTimeoutMs) {
      return false;
    }

    // For allocated resources, also check allocation timeout
    if (!resource.isAvailable && resource.allocatedAt) {
      const timeSinceAllocation = now - resource.allocatedAt.getTime();
      if (resource.timeoutMs && timeSinceAllocation > resource.timeoutMs) {
        return false;
      }
    }

    return true;
  }

  private meetsConstraints(resource: Resource, request: ResourceRequest): boolean {
    if (!request.constraints) {
      return true;
    }

    const { maxMemory, maxCpu, maxLatency } = request.constraints;
    const metrics = resource.metrics;

    return (
      (!maxMemory || metrics.memory.used <= maxMemory) &&
      (!maxCpu || metrics.cpu.utilization <= maxCpu) &&
      (!maxLatency || this.metrics.averageLatency <= maxLatency)
    );
  }

  private hasEnoughResources(availability: ResourceAvailability, request: ResourceRequest): boolean {
    const requirements = request.requirements;

    // If no specific requirements, consider resources available
    if (!requirements) {
      return true;
    }

    // Check memory requirements
    if (requirements.memory) {
      if (!availability.memory.isAvailable ||
          availability.memory.availableAmount < requirements.memory) {
        return false;
      }
    }

    // Check CPU requirements
    if (requirements.cpu) {
      if (!availability.cpu.isAvailable ||
          availability.cpu.availableCores < Math.ceil(requirements.cpu / 100)) {
        return false;
      }
    }

    return true;
  }

  public dispose(): void {
  this.isDisposed = true;

  // Clear all intervals
  for (const interval of this.intervals) {
    clearInterval(interval);
  }
  this.intervals.clear();

  // Clear state change debounce timeout
  if (this.stateChangeDebounceTimeout) {
    clearTimeout(this.stateChangeDebounceTimeout);
    this.stateChangeDebounceTimeout = null;
  }

  // Clean up event listeners
  this.removeAllListeners();

  // Clear cache
  this.cache.clear();

  // Reset metrics
  this.metrics = {
    utilizationRate: 0,
    allocationRate: 0,
    releaseRate: 0,
    failureRate: 0,
    averageLatency: 0
  };

    // Clean up event listeners
    this.removeAllListeners();

    // Clear cache
    this.cache.clear();

    // Reset metrics
    this.metrics = {
      utilizationRate: 0,
      allocationRate: 0,
      releaseRate: 0,
      failureRate: 0,
      averageLatency: 0
    };
  }
}