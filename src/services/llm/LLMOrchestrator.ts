import { nanoid } from 'nanoid';

export type LLMType = 'reasoning' | 'audio' | 'visual' | 'parameter';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  targetLLM?: LLMType;
}

export interface LLMResponse {
  id: string;
  content: string;
  llmType: LLMType;
  confidence: number;
  relatedParameters?: string[];
  suggestedParameters?: Record<string, number>;
  processingTime: number;
  timestamp: number;
}

export interface LLMClientOptions {
  apiUrl: string;
  apiKey?: string;
  modelName: string;
}

export class LLMClient {
  private type: LLMType;
  private options: LLMClientOptions;

  constructor(type: LLMType, options: LLMClientOptions) {
    this.type = type;
    this.options = options;
  }

  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    const startTime = performance.now();

    try {
      const response = await this.simulateResponse(request);

      const processingTime = performance.now() - startTime;

      return {
        id: nanoid(),
        content: response.content,
        llmType: this.type,
        confidence: response.confidence,
        relatedParameters: response.relatedParameters,
        suggestedParameters: response.suggestedParameters,
        processingTime,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error in ${this.type} LLM:`, error);
      throw error;
    }
  }

  private async simulateResponse(request: LLMRequest): Promise<{
    content: string;
    confidence: number;
    relatedParameters?: string[];
    suggestedParameters?: Record<string, number>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const lastUserMessage = request.messages
      .filter(m => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return {
        content: "I didn't receive any message to process.",
        confidence: 0.5
      };
    }

    const userMessage = lastUserMessage.content.toLowerCase();

    switch (this.type) {
      case 'reasoning':
        return this.simulateReasoningResponse(userMessage);
      case 'audio':
        return this.simulateAudioResponse(userMessage);
      case 'parameter':
        return this.simulateParameterResponse(userMessage);
      case 'visual':
        return this.simulateVisualResponse(userMessage);
      default:
        return {
          content: "I'm not sure how to process that request.",
          confidence: 0.3
        };
    }
  }

  private simulateReasoningResponse(message: string): any {
    if (message.includes('generate') || message.includes('create sound') ||
        message.includes('make a sound')) {
      return {
        content: "I'll help you create a sound. Let me delegate this to our audio generation system.",
        confidence: 0.9,
        relatedParameters: ['granular-density', 'spectral-filter']
      };
    } else if (message.includes('analyze') || message.includes('pattern')) {
      return {
        content: "I can analyze this audio pattern for you. Let me process that.",
        confidence: 0.85,
        relatedParameters: ['stochastic-density', 'markov-transition']
      };
    } else if (message.includes('parameter') || message.includes('adjust')) {
      return {
        content: "I'll help you adjust those parameters. Let me suggest some values.",
        confidence: 0.8,
        relatedParameters: ['grain-size', 'spectral-spread']
      };
    } else {
      return {
        content: "I'm here to help with sound creation and analysis. Would you like to generate a sound, analyze a pattern, or adjust parameters?",
        confidence: 0.7
      };
    }
  }

  private simulateAudioResponse(message: string): any {
    return {
      content: "I've generated audio based on your request. You can play it using the controls below.",
      confidence: 0.85,
      suggestedParameters: {
        'grain-size': 0.7,
        'grain-density': 0.8,
        'spectral-spread': 0.4,
        'stochastic-density': 0.6
      }
    };
  }

  private simulateParameterResponse(message: string): any {
    return {
      content: "Based on your request, I've adjusted the parameters to achieve the sound you described.",
      confidence: 0.9,
      suggestedParameters: {
        'grain-size': 0.3,
        'grain-density': 0.5,
        'spectral-spread': 0.7,
        'stochastic-density': 0.4
      }
    };
  }

  private simulateVisualResponse(message: string): any {
    return {
      content: "I've analyzed the visual elements and translated them into sound parameters.",
      confidence: 0.75,
      relatedParameters: ['temporal-evolution', 'rhythmic-structure']
    };
  }
}

export class LLMOrchestrator {
  private clients: Map<LLMType, LLMClient> = new Map();
  private chatHistory: LLMMessage[] = [];

  constructor() {
    // Initialize LLM clients
    this.clients.set('reasoning', new LLMClient('reasoning', {
      apiUrl: 'http://localhost:11434/api/chat',
      modelName: 'deepseek-r1:14b'
    }));

    this.clients.set('audio', new LLMClient('audio', {
      apiUrl: 'http://localhost:11434/api/generate',
      modelName: 'audioldm'
    }));

    this.clients.set('parameter', new LLMClient('parameter', {
      apiUrl: 'http://localhost:11434/api/chat',
      modelName: 'xenakis-parameter-llm'
    }));

    this.clients.set('visual', new LLMClient('visual', {
      apiUrl: 'http://localhost:11434/api/chat',
      modelName: 'qwen2.5-coder'
    }));
  }

  async processUserMessage(message: string, targetLLM?: LLMType): Promise<LLMResponse> {
    // Add message to chat history
    this.chatHistory.push({
      role: 'user',
      content: message
    });

    try {
      // If a specific LLM is targeted, use it directly
      if (targetLLM && this.clients.has(targetLLM)) {
        return await this.processWith(targetLLM, message);
      }

      // Otherwise, use the reasoning LLM to determine which LLM to use
      const reasoningResponse = await this.processWith('reasoning', message);

      // Add reasoning response to chat history
      this.chatHistory.push({
        role: 'assistant',
        content: reasoningResponse.content
      });

      // Check if we need to delegate to another LLM
      if (this.shouldDelegate(reasoningResponse)) {
        const targetType = this.determineTargetLLM(reasoningResponse);

        if (targetType && targetType !== 'reasoning') {
          // Process with the specialized LLM
          const specializedResponse = await this.processWith(targetType, message);

          // Add specialized response to chat history
          this.chatHistory.push({
            role: 'assistant',
            content: specializedResponse.content
          });

          return specializedResponse;
        }
      }

      return reasoningResponse;

    } catch (error) {
      console.error('Error in LLM orchestration:', error);

      // Fallback response
      return {
        id: nanoid(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        llmType: 'reasoning',
        confidence: 0.1,
        processingTime: 0,
        timestamp: Date.now()
      };
    }
  }

  private async processWith(llmType: LLMType, message: string): Promise<LLMResponse> {
    const client = this.clients.get(llmType);

    if (!client) {
      throw new Error(`LLM client for type ${llmType} not found`);
    }

    return await client.processRequest({
      messages: [
        ...this.chatHistory.slice(-10), // Include recent chat history for context
        { role: 'user', content: message }
      ]
    });
  }

  private shouldDelegate(response: LLMResponse): boolean {
    // Decide whether to delegate based on content and confidence
    return (
      response.confidence > 0.7 &&
      (response.content.includes('delegate') ||
       response.content.includes('generate') ||
       response.content.includes('analyze'))
    );
  }

  private determineTargetLLM(response: LLMResponse): LLMType | null {
    const content = response.content.toLowerCase();

    if (content.includes('generate') || content.includes('audio')) {
      return 'audio';
    } else if (content.includes('parameter') || content.includes('adjust')) {
      return 'parameter';
    } else if (content.includes('visual') || content.includes('analyze')) {
      return 'visual';
    }

    return null;
  }

  // Add a method to clear chat history
  clearHistory(): void {
    this.chatHistory = [];
  }
}
