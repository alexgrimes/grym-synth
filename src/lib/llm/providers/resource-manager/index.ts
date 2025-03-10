import { ResourceManager } from './resource-manager';
import { ContextManager } from './context-manager';
import type {
  ResourceManagerConfig,
  ModelContextState,
  Message,
  ModelConstraints,
  ResourceManagerEvent,
  ResourceManagerEventHandler,
  ResourceError,
  SystemResources,
  ModelResourceMetrics,
  MemoryOptimizationOptions,
  ContextPreservationConfig
} from './types';

// Export classes
export { ResourceManager, ContextManager };

// Export types
export type {
  ResourceManagerConfig,
  ModelContextState,
  Message,
  ModelConstraints,
  ResourceManagerEvent,
  ResourceManagerEventHandler,
  ResourceError,
  SystemResources,
  ModelResourceMetrics,
  MemoryOptimizationOptions,
  ContextPreservationConfig
};

// Re-export utility functions
export * from './test-helpers';