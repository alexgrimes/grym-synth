/**
 * Performance configuration for the gravitational parameter interface
 */

export const PERFORMANCE_CONFIG = {
  // Frame timing thresholds (in milliseconds)
  timing: {
    targetFrameTime: 16.67, // 60fps
    maxFrameTime: 33.33,   // 30fps minimum
    maxUpdateTime: 8,      // Half of target frame time
    maxPhysicsTime: 4,     // Quarter of target frame time
    maxRenderTime: 4       // Quarter of target frame time
  },

  // Memory thresholds (in bytes)
  memory: {
    maxHeapSize: 100 * 1024 * 1024,    // 100MB
    warningHeapSize: 80 * 1024 * 1024,  // 80MB
    gcTriggerSize: 90 * 1024 * 1024     // 90MB
  },

  // Physics system limits
  physics: {
    maxFields: 100,              // Maximum number of gravitational fields
    maxParameters: 1000,         // Maximum number of tracked parameters
    maxFieldStrength: 10.0,      // Maximum field strength multiplier
    minFieldRadius: 0.1,         // Minimum field radius
    maxFieldRadius: 2.0,         // Maximum field radius
    defaultFieldDecay: 0.95      // Default field strength decay rate
  },

  // Parameter update rates
  updates: {
    visualizationRefreshRate: 1000 / 60,  // 60fps
    parameterUpdateRate: 1000 / 120,      // 120hz parameter updates
    minimumUpdateInterval: 8,             // Minimum 8ms between updates
    batchSize: 64                         // Parameter update batch size
  },

  // WebAssembly configuration
  wasm: {
    initialMemoryPages: 256,     // 16MB initial memory (64KB per page)
    maximumMemoryPages: 2048,    // 128MB maximum memory
    stackSize: 64 * 1024,        // 64KB stack size
    tableSize: 1024              // Initial table size for function references
  },

  // Performance monitoring
  monitoring: {
    sampleSize: 600,            // 10 seconds at 60fps
    warningThreshold: 0.8,      // Warn at 80% of any threshold
    errorThreshold: 0.95,       // Error at 95% of any threshold
    metricHistory: 3600,        // Keep 1 hour of metrics (at 60fps)
    aggregationInterval: 1000    // Aggregate metrics every second
  },

  // Debug settings
  debug: {
    enablePerformanceLogging: process.env.NODE_ENV === 'development',
    logLevel: process.env.NODE_ENV === 'development' ? 'verbose' : 'error',
    showVisualization: process.env.NODE_ENV === 'development',
    profileFields: false,
    profileParameters: false,
    traceMalloc: false
  },

  // Resource limits
  resources: {
    maxWorkers: Math.max(1, navigator.hardwareConcurrency - 1),
    maxWebGLContexts: 2,
    maxAnimationFrames: 2,
    maxSimultaneousTransitions: 4
  }
} as const;

// Derived constants
export const PERFORMANCE_CONSTANTS = {
  /**
   * Minimum time between parameter updates to maintain target frame rate
   */
  MIN_UPDATE_INTERVAL: Math.max(
    PERFORMANCE_CONFIG.timing.targetFrameTime / 2,
    PERFORMANCE_CONFIG.updates.minimumUpdateInterval
  ),

  /**
   * Maximum sustainable updates per second
   */
  MAX_UPDATES_PER_SECOND: Math.floor(
    1000 / PERFORMANCE_CONFIG.updates.minimumUpdateInterval
  ),

  /**
   * Buffer size for parameter updates
   */
  UPDATE_BUFFER_SIZE: PERFORMANCE_CONFIG.updates.batchSize * 2,

  /**
   * Maximum field influence radius in normalized space
   */
  MAX_FIELD_RADIUS: Math.min(
    PERFORMANCE_CONFIG.physics.maxFieldRadius,
    Math.sqrt(2)  // Diagonal of normalized space
  )
} as const;

/**
 * Get performance thresholds adjusted for device capabilities
 */
export function getDeviceAdjustedThresholds() {
  const memory = performance?.memory;
  const hardwareConcurrency = navigator.hardwareConcurrency || 1;

  return {
    ...PERFORMANCE_CONFIG,
    memory: {
      ...PERFORMANCE_CONFIG.memory,
      maxHeapSize: memory?.jsHeapSizeLimit
        ? Math.min(memory.jsHeapSizeLimit * 0.8, PERFORMANCE_CONFIG.memory.maxHeapSize)
        : PERFORMANCE_CONFIG.memory.maxHeapSize
    },
    resources: {
      ...PERFORMANCE_CONFIG.resources,
      maxWorkers: Math.max(1, hardwareConcurrency - 1)
    }
  };
}
