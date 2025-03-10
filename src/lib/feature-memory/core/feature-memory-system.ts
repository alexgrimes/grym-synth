import { FeatureValue, Pattern } from "../interfaces";
import {
  FeatureMemoryOptions,
  ConfigurationUpdate,
  SystemConfig,
  StorageStats,
  SearchResult,
  PatternMatchResult,
  Timer,
  ConfigChangeHandler,
  CacheStats,
} from "./types/system";
import { MetricsCollector } from "./metrics-collector";
import { HealthMonitor } from "./health-monitor";
import { PatternStorage, PatternStorageOptions } from "./pattern-storage";
import { LRUCache } from "./lru-cache";

const DEFAULT_OPTIONS: Required<FeatureMemoryOptions> = {
  maxPatterns: 10000,
  cacheSize: 1000,
  persistenceEnabled: false,
  compressionEnabled: false,
  optimizationInterval: 3600000, // 1 hour
  healthCheckInterval: 60000, // 1 minute
  persistenceBatchSize: 100,
  persistenceInterval: 1000, // 1 second
  persistencePath: "./data",
};

export class FeatureMemorySystem {
  private config: SystemConfig;
  private storage: PatternStorage;
  private metrics: MetricsCollector;
  private healthMonitor: HealthMonitor;
  private cache: LRUCache<string, Pattern>;
  private optimizationTimer?: Timer;
  private healthCheckTimer?: Timer;
  private configChangeHandlers: ConfigChangeHandler[] = [];

  constructor(options: Partial<FeatureMemoryOptions> = {}) {
    this.config = {
      ...DEFAULT_OPTIONS,
      ...options,
      version: "1.0.0",
      created: new Date(),
      lastModified: new Date(),
    };

    const storageOptions: PatternStorageOptions = {
      maxSize: this.config.maxPatterns,
      compressionEnabled: this.config.compressionEnabled,
      persistenceEnabled: this.config.persistenceEnabled,
      persistencePath: this.config.persistencePath,
      batchSize: this.config.persistenceBatchSize,
      persistenceInterval: this.config.persistenceInterval,
    };

    this.storage = new PatternStorage(storageOptions);
    this.metrics = new MetricsCollector();
    this.healthMonitor = new HealthMonitor(this.metrics);
    this.cache = new LRUCache(this.config.cacheSize);

    this.initializeSystem();
  }

  private async initializeSystem(): Promise<void> {
    await this.storage.init();
    this.setupHealthChecks();
    this.setupOptimization();
  }

  private setupHealthChecks(): void {
    if (this.healthCheckTimer) {
      this.healthCheckTimer.clear();
    }
    this.healthCheckTimer = new Timer(
      () => this.healthMonitor.checkHealth(),
      this.config.healthCheckInterval
    );
  }

  private setupOptimization(): void {
    if (this.optimizationTimer) {
      this.optimizationTimer.clear();
    }
    if (this.config.optimizationInterval > 0) {
      this.optimizationTimer = new Timer(
        () => this.storage.runOptimization(),
        this.config.optimizationInterval
      );
    }
  }

  public async storePattern(pattern: Pattern): Promise<SearchResult> {
    this.metrics.startOperation("storePattern");
    try {
      const result = await this.storage.store(pattern);
      this.cache.set(pattern.id, pattern);
      return result;
    } finally {
      this.metrics.endOperation("storePattern");
    }
  }

  public async searchPatterns(criteria: {
    features: Map<string, FeatureValue>;
  }): Promise<SearchResult> {
    this.metrics.startOperation("searchPatterns");
    try {
      return await this.storage.search(criteria);
    } finally {
      this.metrics.endOperation("searchPatterns");
    }
  }

  public async recognizePattern(
    features: Map<string, FeatureValue>
  ): Promise<PatternMatchResult> {
    this.metrics.startOperation("recognizePattern");
    try {
      return await this.storage.recognize(features);
    } finally {
      this.metrics.endOperation("recognizePattern");
    }
  }

  public async updateConfiguration(update: ConfigurationUpdate): Promise<void> {
    const oldConfig = { ...this.config };
    const newConfig: SystemConfig = {
      ...this.config,
      ...update,
      lastModified: new Date(),
    };

    // Validate configuration changes
    this.validateConfigurationUpdate(oldConfig, newConfig);

    // Apply changes
    await this.applyConfigurationChanges(oldConfig, newConfig);

    // Update stored config
    this.config = newConfig;

    // Notify handlers
    const change = {
      oldConfig,
      newConfig,
      timestamp: new Date(),
      reason: update.reason,
    };

    await Promise.all(
      this.configChangeHandlers.map((handler) => handler(change))
    );
  }

  private validateConfigurationUpdate(
    oldConfig: SystemConfig,
    newConfig: SystemConfig
  ): void {
    const storageStats = this.storage.getStats();
    if (newConfig.maxPatterns < storageStats.patternCount) {
      throw new Error("Cannot reduce maxPatterns below current pattern count");
    }

    if (newConfig.cacheSize < oldConfig.cacheSize) {
      this.cache.resize(newConfig.cacheSize);
    }
  }

  private async applyConfigurationChanges(
    oldConfig: SystemConfig,
    newConfig: SystemConfig
  ): Promise<void> {
    const storageOptions: Partial<PatternStorageOptions> = {
      maxSize: newConfig.maxPatterns,
      compressionEnabled: newConfig.compressionEnabled,
      persistenceEnabled: newConfig.persistenceEnabled,
      persistencePath: newConfig.persistencePath,
      batchSize: newConfig.persistenceBatchSize,
      persistenceInterval: newConfig.persistenceInterval,
    };

    await this.storage.updateConfig(storageOptions);

    if (oldConfig.optimizationInterval !== newConfig.optimizationInterval) {
      this.setupOptimization();
    }

    if (oldConfig.healthCheckInterval !== newConfig.healthCheckInterval) {
      this.setupHealthChecks();
    }
  }

  public onConfigurationChange(handler: ConfigChangeHandler): void {
    this.configChangeHandlers.push(handler);
  }

  public getConfiguration(): SystemConfig {
    return { ...this.config };
  }

  public getStats(): StorageStats {
    const storageStats = this.storage.getStats();
    const cacheStats = this.cache.getStats();
    return {
      patternCount: storageStats.patternCount,
      patterns: storageStats.patternCount, // Alias for backward compatibility
      cacheSize: cacheStats.size,
      memoryUsage: process.memoryUsage().heapUsed,
      compressionRatio: storageStats.compressionRatio,
      lastOptimization: storageStats.lastOptimization,
      lastPersistence: storageStats.lastPersistence,
      indexSize: storageStats.indexSize,
    };
  }

  public async dispose(): Promise<void> {
    if (this.optimizationTimer) {
      this.optimizationTimer.clear();
    }
    if (this.healthCheckTimer) {
      this.healthCheckTimer.clear();
    }
    await this.storage.dispose();
    this.cache.clear();
  }
}
