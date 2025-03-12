export interface OllamaConfig {
  models: Record<string, {
    gpu_layers?: number;
    seed?: number;
    quantization?: string;
    steps?: number;
  }>;
  system: {
    cuda_enabled: boolean;
    max_memory_percent: number;
    model_cache_path: string;
  };
}

export const defaultOllamaConfig: OllamaConfig = {
  models: {
    'deepseek-r1:14b': {
      gpu_layers: -1,  // Use all available GPU layers
      seed: 42        // Consistent results across runs
    },
    'audioldm': {
      quantization: '8-bit',
      steps: 30,      // Optimized step count
      gpu_layers: -1
    }
  },
  system: {
    cuda_enabled: true,
    max_memory_percent: 70,  // Reduced from 80% to leave more headroom
    model_cache_path: '/models'  // Persistent storage for models
  }
};

export function validateConfig(config: OllamaConfig): void {
  if (!config.models || typeof config.models !== 'object') {
    throw new Error('Invalid config: models must be an object');
  }

  if (!config.system || typeof config.system !== 'object') {
    throw new Error('Invalid config: system must be an object');
  }

  if (typeof config.system.cuda_enabled !== 'boolean') {
    throw new Error('Invalid config: system.cuda_enabled must be a boolean');
  }

  if (typeof config.system.max_memory_percent !== 'number' ||
      config.system.max_memory_percent < 0 ||
      config.system.max_memory_percent > 100) {
    throw new Error('Invalid config: system.max_memory_percent must be a number between 0 and 100');
  }

  if (typeof config.system.model_cache_path !== 'string') {
    throw new Error('Invalid config: system.model_cache_path must be a string');
  }

  // Validate each model configuration
  Object.entries(config.models).forEach(([modelName, modelConfig]) => {
    if (modelConfig.gpu_layers !== undefined &&
        (typeof modelConfig.gpu_layers !== 'number' || modelConfig.gpu_layers < -1)) {
      throw new Error(`Invalid config for model ${modelName}: gpu_layers must be a number >= -1`);
    }

    if (modelConfig.seed !== undefined && typeof modelConfig.seed !== 'number') {
      throw new Error(`Invalid config for model ${modelName}: seed must be a number`);
    }

    if (modelConfig.quantization !== undefined &&
        !['8-bit', '4-bit'].includes(modelConfig.quantization)) {
      throw new Error(`Invalid config for model ${modelName}: quantization must be '8-bit' or '4-bit'`);
    }

    if (modelConfig.steps !== undefined &&
        (typeof modelConfig.steps !== 'number' || modelConfig.steps <= 0)) {
      throw new Error(`Invalid config for model ${modelName}: steps must be a positive number`);
    }
  });
}

export function mergeConfigs(base: OllamaConfig, override: Partial<OllamaConfig>): OllamaConfig {
  return {
    models: {
      ...base.models,
      ...(override.models || {})
    },
    system: {
      ...base.system,
      ...(override.system || {})
    }
  };
}
