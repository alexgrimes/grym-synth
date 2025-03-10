import { Pattern, FeatureValue, FeatureMemoryMetrics } from "../../interfaces";

export interface FeatureMemoryOptions {
  maxPatterns: number;
  cacheSize: number;
  persistenceEnabled: boolean;
  compressionEnabled?: boolean;
  optimizationInterval?: number;
  healthCheckInterval?: number;
  persistenceBatchSize?: number;
  persistenceInterval?: number;
  persistencePath?: string;
}

export interface SystemConfig extends Required<FeatureMemoryOptions> {
  readonly version: string;
  readonly created: Date;
  readonly lastModified: Date;
}

export type ConfigurationUpdate = Partial<FeatureMemoryOptions> & {
  reason?: string;
  timestamp?: Date;
};

export interface StorageStats {
  patternCount: number;
  patterns: number; // Alias for patternCount for backward compatibility
  cacheSize: number;
  memoryUsage: number;
  compressionRatio: number;
  lastOptimization?: Date;
  lastPersistence?: Date;
  indexSize: number;
}

export interface SearchCriteria {
  features: Map<string, FeatureValue>;
  limit?: number;
  minConfidence?: number;
}

export interface SearchResult {
  success: boolean;
  data: Pattern[];
  confidence?: number;
  metrics: FeatureMemoryMetrics;
  error?: string;
}

export interface PatternMatchResult {
  success: boolean;
  matches: Pattern[];
  confidence: number;
  metrics: FeatureMemoryMetrics;
  systemMetrics: FeatureMemoryMetrics;
  error?: string;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  metrics: {
    memoryUsage: number;
    patternCount: number;
    cacheHitRate: number;
    indexHealth: number;
    errorRate: number;
  };
  lastCheck: Date;
  issues: Array<{
    component: string;
    severity: "warning" | "error";
    message: string;
  }>;
}

export interface TimerHandle {
  id: NodeJS.Timeout;
  clear(): void;
}

export class Timer implements TimerHandle {
  public id: NodeJS.Timeout;

  constructor(callback: () => void, interval: number) {
    this.id = setInterval(callback, interval);
  }

  clear(): void {
    clearInterval(this.id);
  }

  [Symbol.dispose](): void {
    this.clear();
  }
}

export interface ConfigurationChange {
  oldConfig: SystemConfig;
  newConfig: SystemConfig;
  timestamp: Date;
  reason?: string;
}

export type ConfigChangeHandler = (
  change: ConfigurationChange
) => Promise<void>;

export interface PersistenceOptions {
  enabled: boolean;
  path: string;
  batchSize: number;
  interval: number;
  format: "json" | "binary";
}

export interface IndexStats {
  size: number;
  coverage: number;
  efficiency: number;
  lastOptimized?: Date;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  usage: number;
  hitRate: number;
  missRate: number;
  oldestEntryAge: number;
  newestEntryAge: number;
}

// Re-export for backward compatibility
export { FeatureValue, FeatureMemoryMetrics };
