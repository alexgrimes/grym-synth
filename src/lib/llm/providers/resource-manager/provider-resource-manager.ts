import { ResourceManager } from './resource-manager';
import { LLMProvider } from '../../types';
import { Message, ModelConstraints, ResourceError, ModelContextState } from './types';

export class ProviderResourceManager extends ResourceManager {
  private providers: Map<string, LLMProvider> = new Map();
  private maxTokensPerModel: number;

  constructor(config: any) {
    super(config);
    this.maxTokensPerModel = config.limits?.maxTokensPerModel || 8192;
  }

  async registerProvider(id: string, provider: LLMProvider): Promise<void> {
    if (this.providers.has(id)) {
      throw new ResourceError('PROVIDER_EXISTS', `Provider ${id} already registered`);
    }

    const capabilities = await provider.getCapabilities();
    await this.initializeContext(id, {
      maxTokens: Math.min(provider.contextLimit, this.maxTokensPerModel),
      contextWindow: capabilities.contextWindow,
      truncateMessages: true
    });

    this.providers.set(id, provider);
  }

  async processMessage(providerId: string, message: Message): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new ResourceError('PROVIDER_NOT_FOUND', `Provider ${providerId} not found`);
    }

    const context = await this.getContext(providerId);
    if (!context) {
      throw new ResourceError('CONTEXT_NOT_FOUND', `Context for provider ${providerId} not found`);
    }

    // Check token limits before processing
    const messageTokens = this.estimateTokenCount(message.content);
    const totalTokens = context.tokenCount + messageTokens;
    
    if (totalTokens > this.maxTokensPerModel) {
      throw new ResourceError('TOKEN_LIMIT_EXCEEDED', 'Token limit exceeded');
    }

    try {
      // Add message to context
      await this.addMessage(providerId, {
        ...message,
        timestamp: Date.now() // Ensure consistent timestamp
      });

      // Get updated context after adding message
      const updatedContext = await this.getContext(providerId);
      if (!updatedContext) {
        throw new ResourceError('CONTEXT_NOT_FOUND', `Context for provider ${providerId} not found`);
      }

      const response = await provider.chat({
        messages: updatedContext.messages,
        temperature: 0.7,
        maxTokens: updatedContext.constraints.maxTokens
      });

      // Add response to context
      const responseMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now()
      };
      await this.addMessage(providerId, responseMessage);

      return response.content;
    } catch (error: any) {
      if (error instanceof ResourceError) {
        throw error;
      }
      throw new ResourceError('PROVIDER_ERROR', error?.message || 'Unknown provider error');
    }
  }

  async switchProvider(fromId: string, toId: string): Promise<void> {
    const fromProvider = this.providers.get(fromId);
    const toProvider = this.providers.get(toId);

    if (!fromProvider || !toProvider) {
      throw new ResourceError('PROVIDER_NOT_FOUND', 'One or both providers not found');
    }

    const fromContext = await this.getContext(fromId);
    if (!fromContext) {
      throw new ResourceError('CONTEXT_NOT_FOUND', `Context for provider ${fromId} not found`);
    }

    // Initialize target provider if needed
    let toContext = await this.getContext(toId);
    if (!toContext) {
      const capabilities = await toProvider.getCapabilities();
      const constraints: ModelConstraints = {
        maxTokens: Math.min(toProvider.contextLimit, this.maxTokensPerModel),
        contextWindow: capabilities.contextWindow,
        truncateMessages: true
      };
      await this.initializeContext(toId, constraints);
      toContext = await this.getContext(toId);
    }

    if (!toContext) {
      throw new ResourceError('CONTEXT_NOT_FOUND', `Failed to initialize context for provider ${toId}`);
    }

    // Create new context state with preserved messages and metadata
    const updatedContext: ModelContextState = {
      ...toContext,
      messages: [...fromContext.messages], // Copy all messages
      tokenCount: fromContext.tokenCount,
      tokens: fromContext.tokens,
      metadata: {
        ...toContext.metadata,
        importance: fromContext.metadata.importance,
        priority: fromContext.metadata.priority,
        lastAccess: Date.now(),
        lastUpdated: Date.now()
      }
    };

    // Update both resource manager and provider state
    this.contexts.set(toId, updatedContext);
    await this.saveToCache(toId, updatedContext);
    toProvider.setContextState(updatedContext);

    // Verify transfer
    const finalContext = await this.getContext(toId);
    if (!finalContext || finalContext.messages.length === 0) {
      throw new ResourceError('CONTEXT_TRANSFER_FAILED', 'Failed to transfer context between providers');
    }

    // Verify provider state
    const providerState = toProvider.getContextState();
    if (providerState.messages.length !== fromContext.messages.length) {
      throw new ResourceError('PROVIDER_STATE_MISMATCH', 'Provider state does not match transferred context');
    }
  }

  async cleanup(): Promise<void> {
    // Reset provider states
    for (const [id, provider] of this.providers.entries()) {
      const metrics = provider.getResourceMetrics();
      metrics.status = 'ready';
    }
    this.providers.clear();
    await super.cleanup();
  }

  private estimateTokenCount(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}