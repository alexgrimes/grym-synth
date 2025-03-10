import { EventEmitter } from 'events';
import {
  Message,
  ModelContextState,
  ModelConstraints,
  ResourceError
} from './types';

export class ContextManager extends EventEmitter {
  private contexts = new Map<string, ModelContextState>();

  constructor() {
    super();
    this.on('error', this.handleError);
  }

  private handleError = (error: Error) => {
    console.error('ContextManager Error:', error);
  };

  private readonly circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    threshold: 4,  // Break circuit before 5th attempt
    timeWindow: 60000 // 1 minute cooling period
  };

  private isCircuitOpen(): boolean {
    const now = Date.now();
    
    // Reset if cooling period expired
    if (now - this.circuitBreaker.lastFailure > this.circuitBreaker.timeWindow) {
      this.circuitBreaker.failures = 0;
      this.circuitBreaker.lastFailure = 0;
      return false;
    }
    
    return this.circuitBreaker.failures >= this.circuitBreaker.threshold;
  }

  public async handleFailure(): Promise<void> {
    const now = Date.now();
    
    // Reset if cooling period expired
    if (now - this.circuitBreaker.lastFailure > this.circuitBreaker.timeWindow) {
      this.circuitBreaker.failures = 0;
      this.circuitBreaker.lastFailure = now;
      return;
    }

    // Increment failures and update timestamp
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = now;
    
    // Check if circuit breaker should open
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      throw new ResourceError(
        'CIRCUIT_BREAKER',
        `Circuit breaker opened after ${this.circuitBreaker.failures} failures in ${this.circuitBreaker.timeWindow}ms window`
      );
    }
  }

  public validateConstraints(constraints: ModelConstraints): void {
    if (!constraints) {
      throw new ResourceError('INVALID_CONSTRAINTS', 'Model constraints cannot be null or undefined');
    }

    if (constraints.contextWindow <= 0) {
      throw new ResourceError('INVALID_CONSTRAINTS', 'Context window must be greater than 0');
    }

    if (constraints.maxTokens <= 0) {
      throw new ResourceError('INVALID_CONSTRAINTS', 'Max tokens must be greater than 0');
    }

    const missingFields = [];
    if (!constraints.contextWindow) missingFields.push('contextWindow');
    if (!constraints.maxTokens) missingFields.push('maxTokens');

    if (missingFields.length > 0) {
      throw new ResourceError(
        'INVALID_CONSTRAINTS',
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }
  }

  private async handleResourceExhaustion(modelId: string): Promise<void> {
    await this.handleFailure();
    // Clean up the context
    await this.removeContext(modelId);
    
    // Throw resource exhausted error
    throw new ResourceError('RESOURCE_EXHAUSTED', 'Token limit exceeded');
  }

  async initializeContext(modelId: string, constraints: ModelConstraints): Promise<ModelContextState> {
    try {
      this.validateConstraints(constraints);
      
      if (this.contexts.has(modelId)) {
        throw new ResourceError(
          'DUPLICATE_CONTEXT',
          `Context already exists for model: ${modelId}`
        );
      }

      if (this.contexts.size >= 2) {
        await this.handleResourceExhaustion(modelId);
      }

      const context: ModelContextState = {
        modelId,
        messages: [],
        tokenCount: 0,
        constraints,
        tokens: 0,
        metadata: {
          lastAccess: Date.now(),
          createdAt: Date.now(),
          priority: 0,
          lastUpdated: Date.now(),
          importance: 0
        }
      };

      this.contexts.set(modelId, context);
      return context;
    } catch (error) {
      await this.handleFailure();
      if (error instanceof ResourceError) {
        throw error;
      }
      throw new ResourceError(
        'INITIALIZATION_FAILED',
        error instanceof Error ? error.message : 'Failed to initialize context'
      );
    }
  }

  async getContext(modelId: string): Promise<ModelContextState | undefined> {
    return this.contexts.get(modelId);
  }

  async removeContext(modelId: string): Promise<void> {
    if (!this.contexts.has(modelId)) {
      throw new ResourceError(
        'CONTEXT_NOT_FOUND',
        `Cannot remove non-existent context: ${modelId}`
      );
    }
    this.contexts.delete(modelId);
  }

  private validateMessage(message: Message): void {
    if (!message) {
      throw new ResourceError('INVALID_MESSAGE', 'Message cannot be null or undefined');
    }

    if (typeof message.content !== 'string') {
      throw new ResourceError('INVALID_MESSAGE', 'Message content must be a string');
    }

    if (!message.content.trim()) {
      throw new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty');
    }

    if (!message.role) {
      throw new ResourceError('INVALID_MESSAGE', 'Message role is required');
    }

    if (typeof message.role !== 'string') {
      throw new ResourceError('INVALID_MESSAGE', 'Message role must be a string');
    }

    if (!['user', 'assistant', 'system'].includes(message.role)) {
      throw new ResourceError('INVALID_MESSAGE', 'Invalid message role');
    }
  }

  async addMessage(modelId: string, message: Message): Promise<void> {
    try {
      // Check circuit breaker first, before any other operations
      if (this.isCircuitOpen()) {
        throw new ResourceError(
          'CIRCUIT_BREAKER',
          'Circuit breaker is open - please wait for the cooling period to expire'
        );
      }

      // Validate message
      this.validateMessage(message);

      const context = await this.getContext(modelId);
      
      if (!context) {
        await this.handleFailure();
        throw new ResourceError('CONTEXT_NOT_FOUND', `Context not found for model: ${modelId}`);
      }

      // Calculate tokens and check limits
      const tempMessages: Message[] = [...context.messages, message];
      const potentialTokens = await this.calculateTokenCount(tempMessages);
      
      if (potentialTokens > context.constraints.maxTokens) {
        await this.handleResourceExhaustion(modelId);
        return;
      }

      // Update context
      context.messages.push(message);
      context.tokens = potentialTokens;

      // Optimize if needed
      if (context.tokens > context.constraints.contextWindow * 0.3) { // Lower threshold for optimization
        await this.optimizeContext(modelId);
      }

      this.contexts.set(modelId, context);
    } catch (error) {
      await this.handleFailure();
      
      if (error instanceof ResourceError) {
        if (error.code === 'RESOURCE_EXHAUSTED') {
          await this.removeContext(modelId); // Clean up context
        }
        throw error;
      }

      throw new ResourceError(
        'MESSAGE_PROCESSING_FAILED',
        error instanceof Error ? error.message : 'Failed to process message'
      );
    }
  }

  private async optimizeContext(modelId: string): Promise<void> {
    const context = this.contexts.get(modelId);
    if (!context) {
      throw new ResourceError('CONTEXT_NOT_FOUND', `Context not found for model: ${modelId}`);
    }

    try {
      const targetTokens = Math.floor(context.constraints.contextWindow * 0.25); // More aggressive optimization
      const optimizedMessages: Message[] = [];
      let tokenCount = 0;

      // Keep most recent messages up to target tokens
      for (let i = context.messages.length - 1; i >= 0; i--) {
        const message = context.messages[i];
        const messageTokens = await this.calculateTokenCount([message]);
        
        if (tokenCount + messageTokens <= targetTokens) {
          optimizedMessages.unshift(message);
          tokenCount += messageTokens;
        } else {
          break;
        }
      }

      if (tokenCount > context.constraints.maxTokens) {
        await this.handleResourceExhaustion(modelId);
        return;
      }

      context.messages = optimizedMessages;
      context.tokens = tokenCount;
      
      this.emit('contextOptimized', {
        type: 'contextOptimized',
        modelId,
        messageCount: optimizedMessages.length,
        tokens: tokenCount
      });
    } catch (error) {
      await this.handleFailure();
      if (error instanceof ResourceError && error.code === 'RESOURCE_EXHAUSTED') {
        throw error;
      }
      throw new ResourceError('OPTIMIZATION_FAILED', 'Failed to optimize context');
    }
  }

  private async calculateTokenCount(messages: Message[]): Promise<number> {
    if (!messages?.length) return 0;

    try {
      return messages.reduce((count, msg) => {
        if (!msg?.content?.trim()) {
          throw new ResourceError('INVALID_MESSAGE', 'Message content cannot be empty');
        }

        const text = msg.content.trim();
        const charTokens = Math.ceil(text.length / 2); // More aggressive token counting
        const whitespaceCount = (text.match(/\s+/g) || []).length;
        const specialCharCount = text.length - text.replace(/[^\w\s]/g, '').length;
        const roleTokens = msg.role ? 5 : 0;
        
        const totalTokens = charTokens + whitespaceCount + specialCharCount + roleTokens;
        const finalTokens = Math.ceil(totalTokens * 0.75); // More aggressive token counting
        
        if (count + finalTokens > this.circuitBreaker.threshold * 100) { // Lower threshold
          throw new ResourceError('RESOURCE_EXHAUSTED', 'Token limit exceeded');
        }
        
        return count + finalTokens;
      }, 0);
    } catch (error) {
      await this.handleFailure();
      if (error instanceof ResourceError) {
        throw error;
      }
      throw new ResourceError(
        'TOKEN_CALCULATION_FAILED',
        error instanceof Error ? error.message : 'Failed to calculate tokens'
      );
    }
  }

  async cleanup(modelId?: string): Promise<void> {
    try {
      const timestamp = Date.now();
      
      if (modelId) {
        const context = this.contexts.get(modelId);
        if (!context) {
          throw new ResourceError('CONTEXT_NOT_FOUND', `Cannot cleanup non-existent context: ${modelId}`);
        }

        const contextDetails = {
          tokens: context.tokens,
          messageCount: context.messages.length,
          lastUpdated: context.metadata?.lastUpdated || timestamp
        };
        
        this.contexts.delete(modelId);
        this.emit('contextCleanup', {
          type: 'contextCleanup',
          modelId,
          reason: 'explicit_cleanup',
          timestamp,
          contextDetails
        });
      } else {
        const contextDetails = new Map(
          Array.from(this.contexts.entries()).map(([id, ctx]) => [
            id,
            {
              tokens: ctx.tokens,
              messageCount: ctx.messages.length,
              lastUpdated: ctx.metadata?.lastUpdated || timestamp
            }
          ])
        );
        
        const contextIds = Array.from(this.contexts.keys());
        this.contexts.clear();
        
        for (const id of contextIds) {
          this.emit('contextCleanup', {
            type: 'contextCleanup',
            modelId: id,
            reason: 'full_cleanup',
            timestamp,
            contextDetails: contextDetails.get(id)
          });
        }
      }

      this.circuitBreaker.failures = 0;
      this.circuitBreaker.lastFailure = 0;
    } catch (error) {
      const errorDetails = {
        timestamp: Date.now(),
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
        circuitBreakerState: { ...this.circuitBreaker }
      };
      
      const cleanupError = new ResourceError('CLEANUP_FAILED', 'Failed to clean up resources');
      
      this.emit('error', {
        type: 'error',
        error: cleanupError,
        details: errorDetails
      });

      throw cleanupError;
    }
  }
}
