/**
 * Resource Detection Module
 * Provides system resource monitoring and management capabilities
 */

export * from './types';
export * from './resource-detector';

// Default configuration that can be used as a starting point
export const DEFAULT_RESOURCE_DETECTION_CONFIG = {
  updateIntervalMs: 5000, // 5 second update interval
  thresholds: {
    memory: {
      warning: 80,  // 80% utilization
      critical: 90  // 90% utilization
    },
    cpu: {
      warning: 70,  // 70% utilization
      critical: 85  // 85% utilization
    },
    disk: {
      warning: 85,  // 85% utilization
      critical: 95  // 95% utilization
    }
  },
  constraints: {
    memory: {
      maxAllocation: 1024 * 1024 * 1024 * 2, // 2GB
      warningThreshold: 1024 * 1024 * 1024 * 1.6, // 1.6GB
      criticalThreshold: 1024 * 1024 * 1024 * 1.8 // 1.8GB
    },
    cpu: {
      maxUtilization: 85,
      warningThreshold: 70,
      criticalThreshold: 80
    },
    disk: {
      minAvailable: 1024 * 1024 * 1024 * 10, // 10GB
      warningThreshold: 1024 * 1024 * 1024 * 20, // 20GB
      criticalThreshold: 1024 * 1024 * 1024 * 10 // 10GB
    }
  }
};

// Helper function to create a resource detector with default config
export function createResourceDetector(
  config = DEFAULT_RESOURCE_DETECTION_CONFIG,
  onUpdate?: (resources: import('./types').SystemResources) => void,
  onAlert?: (alert: import('./types').ResourceAlert) => void
) {
  return new (require('./resource-detector').ResourceDetector)(
    config,
    onUpdate,
    onAlert
  );
}