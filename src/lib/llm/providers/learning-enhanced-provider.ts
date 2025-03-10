import { LLMProvider, ChatOptions, ChatResponse, ModelCapabilities } from '../types';
import {
  initializeProfile,
  recordInteraction,
  ModelSpecialization
} from '../../learning-profiles';

/**
 * Wraps an LLM provider with learning profile capabilities
 */
export function createLearningEnhancedProvider(
  provider: LLMProvider,
  modelId: string,
  specialization: ModelSpecialization
): LLMProvider {
  let isInitialized = false;

  const ensureProfile = async () => {
    if (!isInitialized) {
      try {
        await initializeProfile(modelId, specialization);
      } catch (error) {
        // Profile might already exist, which is fine
      }
      isInitialized = true;
    }
  };

  const analyzeDomainFromPrompt = (prompt: string): string => {
    // Simple domain extraction - in practice, you might want more sophisticated analysis
    const domains = [
      'code', 'audio', 'visual', 'math', 'science', 'history',
      'literature', 'philosophy', 'technology'
    ];

    const domainMatches = domains.filter(domain => 
      prompt.toLowerCase().includes(domain.toLowerCase())
    );

    return domainMatches[0] || 'general';
  };

  const analyzeSuccess = (response: ChatResponse): boolean => {
    // Simple success analysis - could be more sophisticated
    const errorIndicators = [
      "i'm not sure",
      "i don't know",
      "cannot help",
      "unable to",
      "error",
      "invalid",
      "failed"
    ];

    return !errorIndicators.some(indicator => 
      response.content.toLowerCase().includes(indicator)
    );
  };

  return {
    name: provider.name,
    endpoint: provider.endpoint,
    contextLimit: provider.contextLimit,

    async chat(options: ChatOptions): Promise<ChatResponse> {
      await ensureProfile();

      const startTime = Date.now();
      const response = await provider.chat(options);
      const executionTime = Date.now() - startTime;

      const lastMessage = options.messages[options.messages.length - 1];
      const domain = analyzeDomainFromPrompt(lastMessage.content);
      const success = analyzeSuccess(response);

      await recordInteraction(modelId, {
        topic: domain,
        context: lastMessage.content,
        response: response.content,
        success,
        metadata: {
          executionTime,
          complexity: options.messages.reduce((acc, msg) => acc + msg.content.length, 0) / 1000,
          tokenUsage: options.maxTokens ? {
            prompt: options.messages.reduce((acc, msg) => acc + msg.content.length, 0) / 4,
            completion: response.content.length / 4
          } : undefined
        }
      });

      return response;
    },

    async healthCheck(): Promise<boolean> {
      return provider.healthCheck();
    },

    async getCapabilities(): Promise<ModelCapabilities> {
      return provider.getCapabilities();
    }
  };
}

/**
 * Helper to create a learning-enhanced Ollama provider
 */
export function createLearningEnhancedOllamaProvider(
  modelName: string,
  specialization: ModelSpecialization = 'general'
) {
  const { createOllamaProvider } = require('./ollama-provider');
  const baseProvider = createOllamaProvider(modelName);
  return createLearningEnhancedProvider(
    baseProvider,
    `ollama-${modelName}`,
    specialization
  );
}

/**
 * Helper to create a learning-enhanced LM Studio provider
 */
export function createLearningEnhancedLMStudioProvider(
  modelName: string,
  specialization: ModelSpecialization = 'general'
) {
  const { createLMStudioProvider } = require('./lm-studio-provider');
  const baseProvider = createLMStudioProvider(modelName);
  return createLearningEnhancedProvider(
    baseProvider,
    `lmstudio-${modelName}`,
    specialization
  );
}