import { HealthMonitor } from './health-monitor';
import { MetricsCollector } from './metrics-collector';
import { HealthConfig } from './types';

interface ModelMetrics {
  resources: {
    memoryAvailable: number;
    cpuAvailable: number;
    activeModels: number;
  };
  orchestration: {
    activeHandoffs: number;
    queueDepth: number;
  };
}

interface ModelHealth {
  resources: ModelMetrics['resources'];
  orchestration: {
    status: 'available' | 'degraded' | 'unavailable';
    activeHandoffs: number;
    queueDepth: number;
  };
  canAcceptTasks: boolean;
}

interface ModelConfig {
  minAvailableMemory: number;
  maxActiveModels: number;
  maxQueueDepth: number;
  handoffTimeoutMs: number;
}

/**
 * Focused health monitor for model orchestration, tracking only
 * essential metrics needed for model handoffs and task management.
 */
export class ModelHealthMonitor extends HealthMonitor {
  private readonly modelConfig: ModelConfig;

  constructor(
    metrics: MetricsCollector,
    config?: Partial<HealthConfig>,
    modelConfig?: Partial<ModelConfig>
  ) {
    super(metrics, config);
    this.modelConfig = {
      minAvailableMemory: modelConfig?.minAvailableMemory ?? 512 * 1024 * 1024,
      maxActiveModels: modelConfig?.maxActiveModels ?? 5,
      maxQueueDepth: modelConfig?.maxQueueDepth ?? 10,
      handoffTimeoutMs: modelConfig?.handoffTimeoutMs ?? 5000
    };
  }

  /**
   * Check model orchestration health metrics
   */
  public async checkModelHealth(): Promise<ModelHealth> {
    const metrics = await this.getModelMetrics();
    
    return {
      resources: metrics.resources,
      orchestration: {
        status: this.determineStatus(metrics),
        activeHandoffs: metrics.orchestration.activeHandoffs,
        queueDepth: metrics.orchestration.queueDepth
      },
      canAcceptTasks: this.evaluateCapacity(metrics)
    };
  }

  /**
   * Get current model-specific metrics
   */
  protected async getModelMetrics(): Promise<ModelMetrics> {
    const baseMetrics = this.getRawMetrics();
    const metrics = this.getMetricsCollector();
    
    const heapUsed = process.memoryUsage().heapUsed;
    const heapTotal = process.memoryUsage().heapTotal;

    return {
      resources: {
        memoryAvailable: heapTotal - heapUsed,
        cpuAvailable: 100 - baseMetrics.resourceUsage.cpuUsage,
        activeModels: baseMetrics.resourceUsage.storageUsage
      },
      orchestration: {
        activeHandoffs: this.getActiveHandoffs(),
        queueDepth: this.getTaskQueueDepth()
      }
    };
  }

  /**
   * Get current number of active model handoffs
   */
  private getActiveHandoffs(): number {
    const metrics = this.getMetricsCollector();
    return metrics.getTotalOperations() - metrics.getRecentErrorCount(this.modelConfig.handoffTimeoutMs);
  }

  /**
   * Get current task queue depth
   */
  private getTaskQueueDepth(): number {
    const metrics = this.getRawMetrics();
    const now = Date.now();
    
    return metrics.recentLatencies.filter(
      (_: number, idx: number) => 
        now - metrics.recentLatencyTimestamps[idx] <= this.modelConfig.handoffTimeoutMs
    ).length;
  }

  /**
   * Evaluate if system can accept more tasks
   */
  private evaluateCapacity(metrics: ModelMetrics): boolean {
    return (
      metrics.resources.memoryAvailable >= this.modelConfig.minAvailableMemory &&
      metrics.resources.activeModels < this.modelConfig.maxActiveModels &&
      metrics.orchestration.queueDepth < this.modelConfig.maxQueueDepth
    );
  }

  /**
   * Determine orchestration status
   */
  private determineStatus(metrics: ModelMetrics): 'available' | 'degraded' | 'unavailable' {
    // Check for critical conditions
    if (
      metrics.resources.memoryAvailable < this.modelConfig.minAvailableMemory * 0.5 ||
      metrics.orchestration.queueDepth >= this.modelConfig.maxQueueDepth
    ) {
      return 'unavailable';
    }

    // Check for warning conditions
    if (
      metrics.resources.memoryAvailable < this.modelConfig.minAvailableMemory * 0.7 ||
      metrics.orchestration.queueDepth >= this.modelConfig.maxQueueDepth * 0.8 ||
      metrics.resources.activeModels >= this.modelConfig.maxActiveModels * 0.8
    ) {
      return 'degraded';
    }

    return 'available';
  }
}