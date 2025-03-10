import { LLMProvider, LLMConfig, ChatMessage } from './types';
import { OllamaProvider } from './providers/ollama-provider';
import { LMStudioProvider } from './providers/lm-studio-provider';

export class SequentialChat {
  private providers: Map<string, LLMProvider> = new Map();
  private activeProvider: LLMProvider | null = null;
  private conversationHistory: ChatMessage[] = [];

  constructor(providers: { [key: string]: LLMProvider }) {
    Object.entries(providers).forEach(([key, provider]) => {
      this.providers.set(key, provider);
    });
    // Set first provider as active by default
    this.activeProvider = Object.values(providers)[0];
  }

  setActiveProvider(providerKey: string) {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new Error(`Provider ${providerKey} not found`);
    }
    this.activeProvider = provider;
  }

  async getResponse(message: string, config: LLMConfig = {}): Promise<string> {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      provider: this.activeProvider.name
    });

    try {
      const response = await this.activeProvider.getResponse(message);

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        provider: this.activeProvider.name
      });

      return response;
    } catch (error) {
      console.error(`Error from ${this.activeProvider.name}:`, error);
      throw error;
    }
  }

  async *streamResponse(message: string, config: LLMConfig = {}) {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }

    if (!this.activeProvider.streamResponse) {
      throw new Error(`${this.activeProvider.name} does not support streaming`);
    }

    this.conversationHistory.push({
      role: 'user',
      content: message,
      provider: this.activeProvider.name
    });

    let fullResponse = '';

    try {
      for await (const chunk of this.activeProvider.streamResponse(message)) {
        if (chunk.response) {
          fullResponse += chunk.response;
          yield chunk;
        }
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
        provider: this.activeProvider.name
      });
    } catch (error) {
      console.error(`Streaming error from ${this.activeProvider.name}:`, error);
      throw error;
    }
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
    // Clear context for providers that support it
    this.providers.forEach(provider => {
      if (provider instanceof OllamaProvider) {
        provider.clearContext();
      }
    });
  }
}

// Example usage:
/*
const chat = new SequentialChat({
  ollama: new OllamaProvider('deepseek-r1:14b'),
  lmStudio: new LMStudioProvider('qwen2.5-coder')
});

// Start with Ollama
chat.setActiveProvider('ollama');
const ollamaResponse = await chat.getResponse('What is TypeScript?');
console.log('Ollama:', ollamaResponse);

// Switch to LM Studio for implementation details
chat.setActiveProvider('lmStudio');
const lmStudioResponse = await chat.getResponse('How would you implement this in Python?');
console.log('LM Studio:', lmStudioResponse);

// Switch back to Ollama for architecture discussion
chat.setActiveProvider('ollama');
const architectureResponse = await chat.getResponse('What are the architectural implications?');
console.log('Ollama:', architectureResponse);
*/