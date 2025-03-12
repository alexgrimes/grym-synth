/**
 * Types for performance configuration
 */

export interface TimingConfig {
  targetFrameTime: number;
  maxFrameTime: number;
  maxUpdateTime: number;
  maxPhysicsTime: number;
  maxRenderTime: number;
}

export interface MemoryConfig {
  maxHeapSize: number;
  warningHeapSize: number;
  gcTriggerSize: number;
}

export interface PhysicsConfig {
  maxFields: number;
  maxParameters: number;
  maxFieldStrength: number;
  minFieldRadius: number;
  maxFieldRadius: number;
  defaultFieldDecay: number;
}

export interface UpdateConfig {
  visualizationRefreshRate: number;
  parameterUpdateRate: number;
  minimumUpdateInterval: number;
  batchSize: number;
}

export interface WasmConfig {
  initialMemoryPages: number;
  maximumMemoryPages: number;
  stackSize: number;
  tableSize: number;
}

export interface MonitoringConfig {
  sampleSize: number;
  warningThreshold: number;
  errorThreshold: number;
  metricHistory: number;
  aggregationInterval: number;
}

export interface DebugConfig {
  enablePerformanceLogging: boolean;
  logLevel: 'verbose' | 'info' | 'warning' | 'error';
  showVisualization: boolean;
  profileFields: boolean;
  profileParameters: boolean;
  traceMalloc: boolean;
}

export interface ResourceConfig {
  maxWorkers: number;
  maxWebGLContexts: number;
  maxAnimationFrames: number;
  maxSimultaneousTransitions: number;
}

export interface PerformanceConfig {
  timing: TimingConfig;
  memory: MemoryConfig;
  physics: PhysicsConfig;
  updates: UpdateConfig;
  wasm: WasmConfig;
  monitoring: MonitoringConfig;
  debug: DebugConfig;
  resources: ResourceConfig;
}

export interface PerformanceConstants {
  MIN_UPDATE_INTERVAL: number;
  MAX_UPDATES_PER_SECOND: number;
  UPDATE_BUFFER_SIZE: number;
  MAX_FIELD_RADIUS: number;
}

/**
 * Device capabilities interface
 */
export interface DeviceCapabilities {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  hardwareConcurrency: number;
  isWebGLAvailable: boolean;
  maxTextureSize?: number;
  isWebAssemblyAvailable: boolean;
  devicePixelRatio: number;
  touchPoints: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  frameTime: number;
  updateTime: number;
  physicsTime: number;
  renderTime: number;
  memoryUsage: number;
  frameDropRate: number;
  stallTime: number;
}

/**
 * Performance metrics data structure
 */
export interface PerformanceMetrics {
  timestamp: number;
  frameTime: number;
  updateTime: number;
  physicsTime: number;
  renderTime: number;
  memoryUsage: number;
  frameDrops: number;
  stalledFrames: number;
  parameters: {
    count: number;
    updateTime: number;
  };
  fields: {
    count: number;
    updateTime: number;
  };
}

/**
 * Performance warning levels
 */
export enum PerformanceWarningLevel {
  NONE = 0,
  WARNING = 1,
  ERROR = 2,
  CRITICAL = 3
}

/**
 * Performance optimization hint
 */
export interface PerformanceHint {
  level: PerformanceWarningLevel;
  message: string;
  metric: keyof PerformanceMetrics;
  threshold: number;
  currentValue: number;
  timestamp: number;
  suggestions: string[];
}
