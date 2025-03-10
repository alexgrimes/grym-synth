/**
 * Resource Detection Implementation
 */

import os from 'node:os';
import {
  SystemResources,
  ResourceConstraints,
  ResourceAvailability,
  ResourceThresholds,
  ResourceDetectionConfig,
  ResourceUpdateCallback,
  ResourceAlertCallback,
  ResourceAlert
} from './types';

export class ResourceDetector {
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private lastUpdate: Date = new Date();
  private currentResources: SystemResources | null = null;

  constructor(
    protected readonly config: ResourceDetectionConfig,
    private onUpdate?: ResourceUpdateCallback,
    private onAlert?: ResourceAlertCallback
  ) {}

  /**
   * Start resource monitoring
   */
  public start(): void {
    this.updateInterval = setInterval(
      () => this.detectResources(),
      this.config.updateIntervalMs
    );
    // Initial detection
    this.detectResources();
  }

  /**
   * Stop resource monitoring
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get current resource availability
   */
  public getAvailability(): ResourceAvailability {
    const resources = this.currentResources || this.detectResources();
    const status = this.calculateHealthStatus(resources);

    return {
      memory: {
        isAvailable: status.memory !== 'critical',
        availableAmount: resources.memory.available,
        utilizationPercent: (resources.memory.used / resources.memory.total) * 100
      },
      cpu: {
        isAvailable: status.cpu !== 'critical',
        availableCores: os.cpus().length,
        utilizationPercent: resources.cpu.utilization
      },
      disk: {
        isAvailable: status.disk !== 'critical',
        availableSpace: resources.disk.available,
        utilizationPercent: (resources.disk.used / resources.disk.total) * 100
      },
      status: this.getOverallStatus(status),
      timestamp: new Date()
    };
  }

  /**
   * Get current system resources
   */
  public getCurrentResources(): SystemResources {
    return this.currentResources || this.detectResources();
  }

  /**
   * Detect current system resources
   */
  protected detectResources(): SystemResources {
    const resources: SystemResources = {
      memory: this.detectMemoryResources(),
      cpu: this.detectCpuResources(),
      disk: this.detectDiskResources()
    };

    this.currentResources = resources;
    this.lastUpdate = new Date();
    this.checkThresholds(resources);
    
    if (this.onUpdate) {
      this.onUpdate(resources);
    }

    return resources;
  }

  /**
   * Detect memory resources
   */
  protected detectMemoryResources() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      total: totalMemory,
      available: freeMemory,
      used: usedMemory
    };
  }

  /**
   * Detect CPU resources
   */
  protected detectCpuResources() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate CPU utilization
    const utilization = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    return {
      cores: cpus.length,
      utilization,
      loadAverage: loadAvg
    };
  }

  /**
   * Detect disk resources
   */
  protected detectDiskResources() {
    // Default implementation
    return {
      total: 1000000000000, // 1TB
      available: 500000000000, // 500GB
      used: 500000000000 // 500GB
    };
  }

  /**
   * Check resource thresholds and emit alerts
   */
  private checkThresholds(resources: SystemResources): void {
    const { thresholds } = this.config;

    // Check memory
    const memoryUtilization = (resources.memory.used / resources.memory.total) * 100;
    this.checkThreshold('memory', memoryUtilization, thresholds.memory);

    // Check CPU
    this.checkThreshold('cpu', resources.cpu.utilization, thresholds.cpu);

    // Check disk
    const diskUtilization = (resources.disk.used / resources.disk.total) * 100;
    this.checkThreshold('disk', diskUtilization, thresholds.disk);
  }

  /**
   * Check a specific threshold and emit alert if needed
   */
  private checkThreshold(
    type: 'memory' | 'cpu' | 'disk',
    current: number,
    threshold: { warning: number; critical: number }
  ): void {
    if (!this.onAlert) return;

    if (current >= threshold.critical) {
      this.emitAlert({
        type,
        severity: 'critical',
        message: `${type} usage exceeded critical threshold`,
        current,
        threshold: threshold.critical,
        timestamp: new Date()
      });
    } else if (current >= threshold.warning) {
      this.emitAlert({
        type,
        severity: 'warning',
        message: `${type} usage exceeded warning threshold`,
        current,
        threshold: threshold.warning,
        timestamp: new Date()
      });
    }
  }

  /**
   * Emit resource alert
   */
  private emitAlert(alert: ResourceAlert): void {
    if (this.onAlert) {
      this.onAlert(alert);
    }
  }

  /**
   * Calculate health status for each resource type
   */
  private calculateHealthStatus(resources: SystemResources): {
    memory: 'healthy' | 'warning' | 'critical';
    cpu: 'healthy' | 'warning' | 'critical';
    disk: 'healthy' | 'warning' | 'critical';
  } {
    const { thresholds } = this.config;
    
    return {
      memory: this.getStatusForUtilization(
        (resources.memory.used / resources.memory.total) * 100,
        thresholds.memory
      ),
      cpu: this.getStatusForUtilization(
        resources.cpu.utilization,
        thresholds.cpu
      ),
      disk: this.getStatusForUtilization(
        (resources.disk.used / resources.disk.total) * 100,
        thresholds.disk
      )
    };
  }

  /**
   * Get status based on utilization and thresholds
   */
  private getStatusForUtilization(
    utilization: number,
    threshold: { warning: number; critical: number }
  ): 'healthy' | 'warning' | 'critical' {
    if (utilization >= threshold.critical) return 'critical';
    if (utilization >= threshold.warning) return 'warning';
    return 'healthy';
  }

  /**
   * Get overall system status based on individual resource statuses
   */
  private getOverallStatus(status: {
    memory: 'healthy' | 'warning' | 'critical';
    cpu: 'healthy' | 'warning' | 'critical';
    disk: 'healthy' | 'warning' | 'critical';
  }): 'healthy' | 'warning' | 'critical' {
    if (status.memory === 'critical' || status.cpu === 'critical' || status.disk === 'critical') {
      return 'critical';
    }
    if (status.memory === 'warning' || status.cpu === 'warning' || status.disk === 'warning') {
      return 'warning';
    }
    return 'healthy';
  }
}