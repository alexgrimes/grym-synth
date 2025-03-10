export interface Pattern {
  id: string;
  features: Map<string, any>;
  confidence: number;
  timestamp: Date;
  metadata: {
    source: string;
    category: string;
    frequency: number;
    lastUpdated: Date;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    code: string;
    message: string;
    severity: "critical" | "warning";
  }>;
  warnings: Array<{
    code: string;
    message: string;
  }>;
  metadata: {
    timestamp: Date;
    validationDuration: number;
    validatedItemsCount: number;
  };
}

export interface FeatureMemoryMetrics {
  timestamp: Date;
  durationMs: number;
  patternRecognitionLatency: number;
  storageOperationLatency: number;
  optimizationEffectiveness: number;
  recentLatencies: number[];
  resourceUsage: {
    cpuUsage: number;
    memoryUsage: number;
    storageUsage: number;
    storageLimit: number;
  };
  healthStatus: HealthStatus;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  storageLimit: number;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  indicators: {
    memory: "ok" | "warning" | "critical";
    performance: "ok" | "warning" | "critical";
    errorRate: "ok" | "warning" | "critical";
  };
  lastCheck: Date;
  recommendations: string[];
  metrics: ResourceMetrics;
}

export interface StorageOptions {
  maxPatterns: number;
  optimizationInterval: number;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
  cacheSizeLimit: number;
  persistenceBatchSize: number;
  persistenceInterval: number;
  healthCheckInterval: number;
}

// Re-export from audio interfaces to maintain backwards compatibility
export type {
  SimpleAudioBuffer,
  AudioProcessingOptions,
} from "../../types/audio";
