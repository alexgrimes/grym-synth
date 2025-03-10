import { ResourceManagerConfig, SummarizationConfig } from '../types';

export const TEST_MODEL_IDS = {
  MODEL_1: 'test-model-1',
  MODEL_2: 'test-model-2',
  MODEL_3: 'test-model-3',
  DEFAULT: 'test-model'
} as const;

const defaultSummarizationConfig: SummarizationConfig = {
  maxTokens: 1000,
  method: 'extractive',
  preserveRecentMessages: 5,
  compressionRatio: 0.5,
  minPreservedQuality: 0.7
};

export const mockConfig: ResourceManagerConfig = {
  limits: {
    maxModelsLoaded: 2,
    memoryThreshold: 0.8,
    inactivityTimeout: 1000
  },
  buffers: {
    context: {
      initial: 1000,
      max: 2000,
      compressionThreshold: 0.8,
      optimizationThreshold: 0.9
    },
    working: {
      initial: 500,
      max: 1000,
      optimizationThreshold: 0.9
    }
  },
  modelSizes: {
    [TEST_MODEL_IDS.DEFAULT]: 5000,
    [TEST_MODEL_IDS.MODEL_1]: 5000,
    [TEST_MODEL_IDS.MODEL_2]: 5000,
    [TEST_MODEL_IDS.MODEL_3]: 5000
  },
  memoryPressure: {
    warning: 0.7,
    critical: 0.9,
    action: 'compress'
  },
  contextPreservation: {
    enabled: true,
    preservationStrategy: 'selective',
    maxPreservedContexts: 5,
    preservationThreshold: 0.6,
    summarizationConfig: defaultSummarizationConfig
  },
  debug: true
};

const mergeSummarizationConfig = (
  base: SummarizationConfig,
  override: Partial<SummarizationConfig> | undefined
): SummarizationConfig => ({
  maxTokens: override?.maxTokens ?? base.maxTokens,
  method: override?.method ?? base.method,
  preserveRecentMessages: override?.preserveRecentMessages ?? base.preserveRecentMessages,
  compressionRatio: override?.compressionRatio ?? base.compressionRatio,
  minPreservedQuality: override?.minPreservedQuality ?? base.minPreservedQuality
});

export const createTestConfig = (overrides: Partial<ResourceManagerConfig> = {}): ResourceManagerConfig => {
  const baseConfig = { ...mockConfig };

  if (overrides.contextPreservation) {
    baseConfig.contextPreservation = {
      ...mockConfig.contextPreservation,
      ...overrides.contextPreservation,
      summarizationConfig: mergeSummarizationConfig(
        defaultSummarizationConfig,
        overrides.contextPreservation.summarizationConfig
      )
    };
  }

  return {
    ...baseConfig,
    ...overrides,
    limits: {
      ...mockConfig.limits,
      ...(overrides.limits || {})
    },
    buffers: {
      context: {
        ...mockConfig.buffers.context,
        ...(overrides.buffers?.context || {})
      },
      working: {
        ...mockConfig.buffers.working,
        ...(overrides.buffers?.working || {})
      }
    },
    modelSizes: {
      ...mockConfig.modelSizes,
      ...(overrides.modelSizes || {})
    },
    memoryPressure: {
      ...mockConfig.memoryPressure,
      ...(overrides.memoryPressure || {})
    }
  };
};