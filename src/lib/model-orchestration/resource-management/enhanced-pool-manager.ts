import EventEmitter from 'events';
import os from 'os';

export enum DegradationLevel {
  None = 0,
  Light = 1,
  Moderate = 2,
  Heavy = 3,
  Critical = 4
}

export enum Priority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3
}

export interface ResourcePoolOptions {
  memoryThreshold: number;       // Percentage of total memory
  criticalThreshold: number;     // Percentage of total memory for critical state
  monitoringInterval: number;    // Milliseconds between checks
}

export interface ResourceAllocation {
  id: string;
  priority: Priority;
  memoryUsage: number;
  active: boolean;
}

export class EnhancedResourcePool extends EventEmitter {
  private poolManager: Map<string, ResourceAllocation>;
  private memoryThreshold: number;
  private criticalMemoryThreshold: number;
  private monitoringInterval: number;
  private currentDegradation: DegradationLevel = DegradationLevel.None;
  private monitoringTimer: ReturnType<typeof setInterval> | null = null;
  private totalSystemMemory: number;

  constructor(options: ResourcePoolOptions) {
    super();
    this.poolManager = new Map();
    this.memoryThreshold = options.memoryThreshold;
    this.criticalMemoryThreshold = options.criticalThreshold;
    this.monitoringInterval = options.monitoringInterval;
    this.totalSystemMemory = os.totalmem();

    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.monitoringTimer = setInterval(() => {
      this.checkResourceUsage();
    }, this.monitoringInterval);
  }

  private async checkResourceUsage(): Promise<void> {
    const freeMemory = os.freemem();
    const usedMemoryPercent = ((this.totalSystemMemory - freeMemory) / this.totalSystemMemory) * 100;

    let newDegradationLevel: DegradationLevel;

    if (usedMemoryPercent >= this.criticalMemoryThreshold) {
      newDegradationLevel = DegradationLevel.Critical;
    } else if (usedMemoryPercent >= this.memoryThreshold + 15) {
      newDegradationLevel = DegradationLevel.Heavy;
    } else if (usedMemoryPercent >= this.memoryThreshold + 10) {
      newDegradationLevel = DegradationLevel.Moderate;
    } else if (usedMemoryPercent >= this.memoryThreshold) {
      newDegradationLevel = DegradationLevel.Light;
    } else {
      newDegradationLevel = DegradationLevel.None;
    }

    if (newDegradationLevel !== this.currentDegradation) {
      await this.applyDegradation(newDegradationLevel);
      this.currentDegradation = newDegradationLevel;
      this.emit('degradationChange', {
        level: this.currentDegradation,
        memoryUsage: usedMemoryPercent
      });
    }
  }

  private async applyDegradation(level: DegradationLevel): Promise<void> {
    console.log(`Applying degradation level: ${DegradationLevel[level]}`);

    switch (level) {
      case DegradationLevel.None:
        // Normal operation - no restrictions
        break;

      case DegradationLevel.Light:
        // Light degradation - release low-priority resources
        await this.releaseResourcesByPriority([Priority.Low]);
        break;

      case DegradationLevel.Moderate:
        // Moderate degradation - release low and some medium priority resources
        await this.releaseResourcesByPriority([Priority.Low, Priority.Medium]);
        break;

      case DegradationLevel.Heavy:
        // Heavy degradation - release all except high priority resources
        await this.releaseResourcesByPriority([Priority.Low, Priority.Medium]);
        // Also limit new allocations
        break;

      case DegradationLevel.Critical:
        // Critical degradation - release all non-critical resources
        await this.releaseResourcesByPriority([Priority.Low, Priority.Medium, Priority.High]);
        // Only allow critical operations
        break;
    }
  }

  private async releaseResourcesByPriority(priorities: Priority[]): Promise<void> {
    const releasedResources: string[] = [];

    for (const [id, allocation] of this.poolManager.entries()) {
      if (priorities.includes(allocation.priority) && allocation.active) {
        allocation.active = false;
        releasedResources.push(id);
      }
    }

    if (releasedResources.length > 0) {
      this.emit('resourcesReleased', {
        count: releasedResources.length,
        resources: releasedResources
      });
    }
  }

  async allocateResource(
    id: string,
    options: {
      priority: Priority;
      memoryUsage: number;
    }
  ): Promise<boolean> {
    // Check if system can handle the allocation
    if (this.currentDegradation === DegradationLevel.Critical &&
        options.priority !== Priority.Critical) {
      return false;
    }

    if (this.currentDegradation === DegradationLevel.Heavy &&
        options.priority < Priority.High) {
      return false;
    }

    const allocation: ResourceAllocation = {
      id,
      priority: options.priority,
      memoryUsage: options.memoryUsage,
      active: true
    };

    this.poolManager.set(id, allocation);
    this.emit('resourceAllocated', allocation);

    return true;
  }

  releaseResource(id: string): void {
    const allocation = this.poolManager.get(id);
    if (allocation) {
      allocation.active = false;
      this.poolManager.delete(id);
      this.emit('resourceReleased', { id });
    }
  }

  getCurrentDegradation(): DegradationLevel {
    return this.currentDegradation;
  }

  getActiveResources(): ResourceAllocation[] {
    return Array.from(this.poolManager.values())
      .filter(allocation => allocation.active);
  }

  async shutdown(): Promise<void> {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    // Release all resources
    await this.releaseResourcesByPriority([
      Priority.Low,
      Priority.Medium,
      Priority.High,
      Priority.Critical
    ]);

    this.poolManager.clear();
  }
}
