/**
 * Resource Detection Types
 */

export interface SystemResources {
  memory: {
    total: number;
    available: number;
    used: number;
  };
  cpu: {
    cores: number;
    utilization: number;
    loadAverage: number[];
  };
  disk: {
    total: number;
    available: number;
    used: number;
  };
}

export interface ResourceConstraints {
  memory: {
    maxAllocation: number;
    warningThreshold: number;
    criticalThreshold: number;
  };
  cpu: {
    maxUtilization: number;
    warningThreshold: number;
    criticalThreshold: number;
  };
  disk: {
    minAvailable: number;
    warningThreshold: number;
    criticalThreshold: number;
  };
}

export interface ResourceAvailability {
  memory: {
    isAvailable: boolean;
    availableAmount: number;
    utilizationPercent: number;
  };
  cpu: {
    isAvailable: boolean;
    availableCores: number;
    utilizationPercent: number;
  };
  disk: {
    isAvailable: boolean;
    availableSpace: number;
    utilizationPercent: number;
  };
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
}

export interface ResourceThresholds {
  memory: {
    warning: number;
    critical: number;
  };
  cpu: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
}

export interface ResourceDetectionConfig {
  updateIntervalMs: number;
  thresholds: ResourceThresholds;
  constraints: ResourceConstraints;
}

export type ResourceUpdateCallback = (resources: SystemResources) => void;
export type ResourceAlertCallback = (alert: ResourceAlert) => void;

export interface ResourceAlert {
  type: 'memory' | 'cpu' | 'disk';
  severity: 'warning' | 'critical';
  message: string;
  current: number;
  threshold: number;
  timestamp: Date;
}