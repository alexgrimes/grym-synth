import { LLMProvider, ChatOptions, ModelCapabilities, Message as BaseMessage } from '../../../types';
import { Message, ModelContextState, ModelResourceMetrics, ResourceError, BufferConfig } from '../types';

type MessageRole = 'user' | 'assistant' | 'system';

const isValidChatOptions = (options: ChatOptions | undefined): options is Required<ChatOptions> & { messages: BaseMessage[] } => {
  return options !== undefined && Array.isArray(options.messages) && options.messages.length > 0;
};

const isValidMessage = (msg: BaseMessage): msg is Required<BaseMessage> => {
  return typeof msg.content === 'string' && typeof msg.role === 'string';
};

const createDefaultBufferConfig = (): Required<BufferConfig> => ({
  input: { initial: 0, max: 1000 },
  output: { initial: 0, max: 1000 },
  context: { initial: 0, max: 1000 },
  working: { initial: 0, max: 1000 },
  model: { initial: 0, max: 1000 }
});

export class MockLLMProvider implements LLMProvider {
  private messages: Message[] = [];
  private resourceMetrics: Required<ModelResourceMetrics>;
  private contextState: ModelContextState;
  private errorRate: number = 0;
  private failureCount: number = 0;
  private maxTokens: number;
  private memoryThreshold: number;
  private failOnPurpose: boolean;
  private resourceManager: any | null = null;
  private maxMemoryUsage: number;

  constructor(
    public name: string,
    public endpoint: string = `mock://${name}`,
    public contextLimit: number = 4096,
    public specialization: 'audio-specialist' | 'composition-specialist' = 'audio-specialist',
    private config: {
      errorRate?: number;
      resourceUsage?: Partial<ModelResourceMetrics>;
      maxTokens?: number;
      memoryThreshold?: number;
      failOnPurpose?: boolean;
    } = {}
  ) {
    this.errorRate = config.errorRate || 0;
    this.maxTokens = config.maxTokens || contextLimit;
    this.memoryThreshold = config.memoryThreshold || 0.8;
    this.failOnPurpose = config.failOnPurpose || false;
    this.maxMemoryUsage = config.resourceUsage?.memoryUsage || Infinity;
    
    this.resourceMetrics = {
      modelId: name,
      memoryUsage: 0,
      cpuUsage: 0,
      tokenCount: 0,
      messageCount: 0,
      timestamp: Date.now(),
      status: 'ready',
      loadTime: 0,
      lastUsed: Date.now(),
      contextSize: 0,
      activeRequests: 0,
      platform: 'test',
      contextState: null,
      buffers: createDefaultBufferConfig(),
      ...(config.resourceUsage || {})
    };

    this.contextState = {
      modelId: name,
      messages: [],
      tokenCount: 0,
      tokens: 0,
      constraints: {
        maxTokens: this.maxTokens,
        contextWindow: contextLimit,
        truncateMessages: true
      },
      metadata: {
        lastAccess: Date.now(),
        createdAt: Date.now(),
        priority: 1,
        lastUpdated: Date.now(),
        importance: 1
      }
    };
  }

  setResourceManager(manager: any) {
    this.resourceManager = manager;
  }

  async chat(options: ChatOptions): Promise<{ content: string; role: 'assistant' }> {
    if (!isValidChatOptions(options)) {
      throw new ResourceError('INVALID_REQUEST', 'Valid messages array is required');
    }

    if (this.failOnPurpose) {
      throw new ResourceError('PROVIDER_ERROR', 'Intentional failure for testing');
    }

    // Simulate error based on error rate
    if (Math.random() < this.errorRate) {
      this.failureCount++;
      const error = new ResourceError('PROVIDER_ERROR', `Mock provider error (failure #${this.failureCount})`);
      this.resourceMetrics.status = 'error';
      throw error;
    }

    // Reset error status if successful
    this.resourceMetrics.status = 'ready';

    // Convert incoming messages to internal format with guaranteed string content
    const messages: Message[] = options.messages.map(msg => {
      if (!isValidMessage(msg)) {
        throw new ResourceError('INVALID_MESSAGE', 'Invalid message format');
      }
      return {
        role: this.validateRole(msg.role),
        content: this.validateContent(msg.content),
        timestamp: Date.now()
      };
    });

    // Check token limits
    const newTokenCount = this.estimateTokenCount(messages);
    if (this.contextState.tokenCount + newTokenCount > this.maxTokens) {
      throw new ResourceError('TOKEN_LIMIT_EXCEEDED', 'Token limit exceeded');
    }

    // Update resource metrics
    const messageCount = messages.length;
    const tokenCount = newTokenCount;
    
    this.resourceMetrics.messageCount = messageCount;
    this.resourceMetrics.tokenCount = tokenCount;
    
    // Calculate new memory usage with safe defaults
    const newMemoryUsage = this.resourceMetrics.memoryUsage + tokenCount * 2;
    this.resourceMetrics.memoryUsage = Math.min(newMemoryUsage, this.maxMemoryUsage);
    this.resourceMetrics.timestamp = Date.now();

    // Update context state by appending messages
    this.contextState.messages = [...this.contextState.messages, ...messages];
    this.contextState.tokenCount += tokenCount;
    this.contextState.metadata.lastAccess = Date.now();
    this.contextState.metadata.lastUpdated = Date.now();

    // Generate mock response based on specialization
    const response = this.generateSpecializedResponse(messages);

    // Add response to context
    const responseMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };
    this.contextState.messages.push(responseMessage);
    this.contextState.tokenCount += this.estimateTokenCount([responseMessage]);
    this.resourceMetrics.messageCount += 1;

    return {
      content: response,
      role: 'assistant'
    };
  }

  async simulateResponse(message: Partial<BaseMessage>): Promise<void> {
    const validMessage: Message = {
      role: this.validateRole(message.role || 'assistant'),
      content: this.validateContent(message.content || ''),
      timestamp: Date.now()
    };
    
    this.contextState.messages.push(validMessage);
    this.contextState.tokenCount += this.estimateTokenCount([validMessage]);
    this.resourceMetrics.messageCount += 1;
    this.resourceMetrics.timestamp = Date.now();
  }

  async simulateMemoryPressure(pressure: number = 0.9): Promise<void> {
    this.resourceMetrics.memoryUsage = this.maxTokens * pressure;
    this.resourceMetrics.timestamp = Date.now();

    if (this.resourceManager && pressure >= this.memoryThreshold) {
      this.resourceManager.emit('resourcePressure', {
        type: 'resourcePressure',
        timestamp: Date.now(),
        data: {
          providerId: this.name,
          pressure,
          threshold: this.memoryThreshold,
          source: 'memory'
        }
      });
    }
  }

  async healthCheck(): Promise<boolean> {
    const healthy = this.failureCount < 3; // Simulate health degradation after multiple failures
    this.resourceMetrics.status = healthy ? 'ready' : 'error';
    return healthy;
  }

  async getCapabilities(): Promise<ModelCapabilities> {
    return {
      contextWindow: this.contextLimit,
      streamingSupport: false,
      specialTokens: {
        'START_AUDIO': '<|audio|>',
        'END_AUDIO': '</|audio|>',
        'START_COMPOSITION': '<|composition|>',
        'END_COMPOSITION': '</|composition|>'
      },
      modelType: 'chat'
    };
  }

  getResourceMetrics(): ModelResourceMetrics {
    return { ...this.resourceMetrics };
  }

  getContextState(): ModelContextState {
    return {
      ...this.contextState,
      messages: [...this.contextState.messages] // Deep copy messages
    };
  }

  setContextState(newState: ModelContextState): void {
    this.contextState = {
      ...newState,
      messages: [...newState.messages], // Deep copy messages
      metadata: {
        ...newState.metadata,
        lastAccess: Date.now(),
        lastUpdated: Date.now()
      }
    };

    // Update resource metrics to match new state
    this.resourceMetrics = {
      ...this.resourceMetrics,
      tokenCount: newState.tokenCount,
      messageCount: newState.messages.length,
      timestamp: Date.now()
    };
  }

  setErrorRate(rate: number): void {
    this.errorRate = Math.max(0, Math.min(1, rate));
  }

  resetFailureCount(): void {
    this.failureCount = 0;
    this.resourceMetrics.status = 'ready';
  }

  private validateRole(role: string | undefined): MessageRole {
    if (role === 'user' || role === 'assistant' || role === 'system') {
      return role;
    }
    return 'user'; // Default to user if invalid role
  }

  private validateContent(content: string | undefined): string {
    if (content === undefined || content === null) {
      return '';
    }
    return String(content);
  }

  private generateSpecializedResponse(messages: Message[]): string {
    if (messages.length === 0) {
      return `${this.specialization === 'audio-specialist' ? '[Audio Analysis]' : '[Composition Analysis]'} No input message`;
    }
    
    const lastMessage = messages[messages.length - 1];
    const prefix = this.specialization === 'audio-specialist' ? '[Audio Analysis] ' : '[Composition Analysis] ';
    
    return `${prefix}Mock response to: ${lastMessage.content.substring(0, 50)}...`;
  }

  private estimateTokenCount(messages: Message[]): number {
    // Simple estimation: ~4 characters per token
    return messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0);
  }
}

// Helper function to create specialized providers
export const createAudioSpecialist = (name: string = 'audio-specialist', config = {}) => {
  return new MockLLMProvider(name, `mock://${name}`, 4096, 'audio-specialist', {
    maxTokens: 1000, // Lower token limit for testing
    ...config
  });
};

export const createCompositionSpecialist = (name: string = 'composition-specialist', config = {}) => {
  return new MockLLMProvider(name, `mock://${name}`, 4096, 'composition-specialist', {
    maxTokens: 1000, // Lower token limit for testing
    ...config
  });
};