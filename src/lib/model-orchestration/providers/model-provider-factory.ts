import { LLMModel } from '../types';
import { OllamaProvider } from './ollama-provider';
import { LMStudioProvider } from './lm-studio-provider';

export interface ModelProviderConfig {
  type: 'ollama' | 'lm-studio';
  id: string;
  name: string;
  modelName: string;
  endpoint: string;
  contextWindow: number;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

/**
 * Factory for creating model providers with appropriate configurations
 */
export class ModelProviderFactory {
  /**
   * Create a model provider instance
   */
  static createProvider(config: ModelProviderConfig): LLMModel {
    switch (config.type) {
      case 'ollama':
        return new OllamaProvider(
          config.id,
          config.name,
          config.contextWindow,
          {
            modelName: config.modelName,
            endpoint: config.endpoint,
            contextWindow: config.contextWindow,
            temperature: config.temperature,
            topP: config.topP,
            maxTokens: config.maxTokens
          }
        );

      case 'lm-studio':
        return new LMStudioProvider(
          config.id,
          config.name,
          config.contextWindow,
          {
            modelName: config.modelName,
            endpoint: config.endpoint,
            contextWindow: config.contextWindow,
            temperature: config.temperature,
            topP: config.topP,
            maxTokens: config.maxTokens
          }
        );

      default:
        throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }

  /**
   * Create multiple providers from configurations
   */
  static createProviders(configs: ModelProviderConfig[]): LLMModel[] {
    return configs.map(config => this.createProvider(config));
  }

  /**
   * Get default configuration for a provider type
   */
  static getDefaultConfig(type: 'ollama' | 'lm-studio'): Partial<ModelProviderConfig> {
    switch (type) {
      case 'ollama':
        return {
          type: 'ollama',
          endpoint: 'http://localhost:11434',
          contextWindow: 32768,
          temperature: 0.7,
          topP: 0.9
        };

      case 'lm-studio':
        return {
          type: 'lm-studio',
          endpoint: 'http://localhost:1234',
          contextWindow: 32768,
          temperature: 0.7,
          topP: 0.9
        };

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Create a provider with default configuration
   */
  static createDefaultProvider(
    type: 'ollama' | 'lm-studio',
    id: string,
    name: string,
    modelName: string
  ): LLMModel {
    const defaultConfig = this.getDefaultConfig(type);
    return this.createProvider({
      ...defaultConfig,
      id,
      name,
      modelName
    } as ModelProviderConfig);
  }

  /**
   * Create common model combinations
   */
  static createModelChain(): {
    planner: LLMModel;
    executor: LLMModel;
    reviewer?: LLMModel;
    context?: LLMModel;
  } {
    return {
      // DeepSeek for planning due to strong reasoning
      planner: this.createDefaultProvider(
        'ollama',
        'deepseek-r1',
        'DeepSeek R-1',
        'deepseek-1b'
      ),
      // DeepSeek Coder for code generation
      executor: this.createDefaultProvider(
        'ollama',
        'deepseek-coder',
        'DeepSeek Coder',
        'deepseek-coder'
      ),
      // Mistral for code review
      reviewer: this.createDefaultProvider(
        'lm-studio',
        'mistral',
        'Mistral',
        'mistral'
      ),
      // Qwen for context management
      context: this.createDefaultProvider(
        'ollama',
        'qwen-context',
        'Qwen Context',
        'qwen-1b'
      )
    };
  }

  /**
   * Create a specialized model combination for a specific task type
   */
  static createSpecializedChain(
    taskType: 'code' | 'planning' | 'analysis'
  ): {
    planner: LLMModel;
    executor: LLMModel;
    reviewer?: LLMModel;
    context?: LLMModel;
  } {
    switch (taskType) {
      case 'code':
        return {
          planner: this.createDefaultProvider(
            'ollama',
            'deepseek-r1',
            'DeepSeek R-1',
            'deepseek-1b'
          ),
          executor: this.createDefaultProvider(
            'ollama',
            'codellama',
            'CodeLlama',
            'codellama'
          ),
          reviewer: this.createDefaultProvider(
            'lm-studio',
            'wizardcoder',
            'WizardCoder',
            'wizardcoder'
          )
        };

      case 'planning':
        return {
          planner: this.createDefaultProvider(
            'lm-studio',
            'neural-chat',
            'Neural Chat',
            'neural-chat'
          ),
          executor: this.createDefaultProvider(
            'ollama',
            'deepseek-r1',
            'DeepSeek R-1',
            'deepseek-1b'
          ),
          context: this.createDefaultProvider(
            'ollama',
            'qwen-context',
            'Qwen Context',
            'qwen-1b'
          )
        };

      case 'analysis':
        return {
          planner: this.createDefaultProvider(
            'ollama',
            'deepseek-r1',
            'DeepSeek R-1',
            'deepseek-1b'
          ),
          executor: this.createDefaultProvider(
            'lm-studio',
            'mistral',
            'Mistral',
            'mistral'
          ),
          reviewer: this.createDefaultProvider(
            'ollama',
            'qwen-analysis',
            'Qwen Analysis',
            'qwen-1b'
          )
        };

      default:
        return this.createModelChain();
    }
  }
}