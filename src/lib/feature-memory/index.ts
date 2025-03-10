export { FeatureMemorySystem } from "./core/feature-memory-system";
export {
  FeatureMemoryOptions,
  ConfigurationUpdate,
  SystemConfig,
  StorageStats,
  SearchResult,
  PatternMatchResult,
  SystemHealth,
  ConfigChangeHandler,
  PersistenceOptions,
  IndexStats,
  CacheStats,
} from "./core/types/system";

export {
  Pattern,
  FeatureValue,
  FeatureMap,
  FeatureExtractionResult,
  AudioFeatureVector,
  AudioFeatureMetadata,
  StorageOperationResult,
  FeatureMemoryMetrics,
} from "./interfaces";

// Export specific types for configuration and events
export type { ConfigurationChange } from "./core/types/system";

// Export utility types
export type { Timer, TimerHandle } from "./core/types/system";
