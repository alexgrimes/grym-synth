/**
 * Resource Management System
 * Provides centralized resource management for the model orchestration framework
 */

import { DEFAULT_RESOURCE_DETECTION_CONFIG } from './resource-detection';
import type { SystemResources, ResourceAlert } from './resource-detection';

export * from './types';
export * from './resource-detection';

// Re-export commonly used configurations
export { DEFAULT_RESOURCE_DETECTION_CONFIG as DefaultResourceConfig } from './resource-detection';

/**
 * Initialize the resource management system
 * This will be expanded as we implement additional components
 */
export async function initializeResourceManagement(
  config = DEFAULT_RESOURCE_DETECTION_CONFIG,
  onResourceUpdate?: (resources: SystemResources) => void,
  onResourceAlert?: (alert: ResourceAlert) => void
) {
  const { createResourceDetector } = await import('./resource-detection');
  
  // Initialize resource detection
  const detector = createResourceDetector(config, onResourceUpdate, onResourceAlert);
  detector.start();

  // TODO: Initialize pool management when implemented
  // TODO: Initialize memory management when implemented
  // TODO: Initialize CPU management when implemented

  return {
    detector,
    // Will add additional components as they are implemented:
    // poolManager: null,
    // memoryManager: null,
    // cpuManager: null,
    
    /**
     * Stop all resource management systems
     */
    shutdown: async () => {
      detector.stop();
      // Will add cleanup for other components as they are implemented
    }
  };
}

/**
 * Create a preconfigured resource management system with recommended settings
 * for model orchestration workloads
 */
export async function createModelResourceManager(
  maxMemoryGB = 4,
  maxCpuUtilization = 80,
  minDiskSpaceGB = 20
) {
  const config = {
    ...DEFAULT_RESOURCE_DETECTION_CONFIG,
    constraints: {
      memory: {
        maxAllocation: maxMemoryGB * 1024 * 1024 * 1024,
        warningThreshold: maxMemoryGB * 0.8 * 1024 * 1024 * 1024,
        criticalThreshold: maxMemoryGB * 0.9 * 1024 * 1024 * 1024
      },
      cpu: {
        maxUtilization: maxCpuUtilization,
        warningThreshold: maxCpuUtilization * 0.8,
        criticalThreshold: maxCpuUtilization * 0.9
      },
      disk: {
        minAvailable: minDiskSpaceGB * 1024 * 1024 * 1024,
        warningThreshold: minDiskSpaceGB * 2 * 1024 * 1024 * 1024,
        criticalThreshold: minDiskSpaceGB * 1024 * 1024 * 1024
      }
    }
  };

  return initializeResourceManagement(config);
}

// Export version for tracking
export const VERSION = '0.1.0';