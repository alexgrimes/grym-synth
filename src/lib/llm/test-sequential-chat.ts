interface Provider {
  name: string;
  endpoint: string;
  model: string;
  context?: number[] | null;
  messages?: Array<{ role: string; content: string }>;
}

interface ChatHistory {
  provider: string;
  message: string;
  response: string;
  timestamp: string;
}

export class SequentialChat {
  private ollamaProvider: Provider;
  private lmStudioProvider: Provider;
  private currentProvider: Provider | null;
  private history: ChatHistory[];

  constructor() {
    this.ollamaProvider = {
      name: 'Ollama',
      endpoint: 'http://127.0.0.1:11434',
      model: 'deepseek-r1:14b',
      context: null
    };
    
    this.lmStudioProvider = {
      name: 'LM Studio',
      endpoint: 'http://127.0.0.1:1234/v1',
      model: 'qwen2.5-vl-7b-instruct',
      messages: []
    };
    
    this.currentProvider = null;
    this.history = [];
  }

  async switchProvider(providerName: 'ollama' | 'lmstudio'): Promise<void> {
    let newProvider: Provider;
    if (providerName === 'ollama') {
      newProvider = this.ollamaProvider;
    } else if (providerName === 'lmstudio') {
      newProvider = this.lmStudioProvider;
    } else {
      throw new Error('Invalid provider name');
    }

    // Check if the provider is available
    const isAvailable = await this.checkAvailability(newProvider);
    if (!isAvailable) {
      throw new Error(`${newProvider.name} is not available`);
    }

    this.currentProvider = newProvider;
    console.log(`Switched to ${this.currentProvider.name} provider`);
  }

  private async checkAvailability(provider: Provider): Promise<boolean> {
    try {
      if (provider.name === 'Ollama') {
        const response = await fetch(`${provider.endpoint}/api/version`);
        const data = await response.json();
        return !!data.version;
      } else {
        const response = await fetch(`${provider.endpoint}/models`);
        const data = await response.json();
        return Array.isArray(data.data) && data.data.length > 0;
      }
    } catch (error) {
      console.error(`${provider.name} availability check failed:`, error);
      return false;
    }
  }

  async chat(message: string): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('No provider selected');
    }

    console.log(`\nUser: ${message}`);

    try {
      let response: string;
      if (this.currentProvider.name === 'Ollama') {
        response = await this.ollamaChat(message);
      } else {
        response = await this.lmStudioChat(message);
      }

      console.log(`${this.currentProvider.name}: ${response}\n`);

      this.history.push({
        provider: this.currentProvider.name,
        message,
        response,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      console.error(`Error from ${this.currentProvider.name}:`, error);
      throw error;
    }
  }

  private async ollamaChat(message: string): Promise<string> {
    const response = await fetch(`${this.ollamaProvider.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaProvider.model,
        prompt: message,
        stream: false,
        context: this.ollamaProvider.context,
        options: {
          temperature: 0.7,
          num_predict: 1024,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1,
        }
      })
    });

    const data = await response.json();
    if (data.context) {
      this.ollamaProvider.context = data.context;
    }
    return data.response;
  }

  private async lmStudioChat(message: string): Promise<string> {
    this.lmStudioProvider.messages?.push({ role: 'user', content: message });

    const response = await fetch(`${this.lmStudioProvider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.lmStudioProvider.model,
        messages: this.lmStudioProvider.messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      })
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    this.lmStudioProvider.messages?.push(assistantMessage);
    return assistantMessage.content;
  }

  clearContext(): void {
    this.ollamaProvider.context = null;
    this.lmStudioProvider.messages = [];
    this.history = [];
    console.log('Context cleared for both providers');
  }

  getHistory(): { messages: ChatHistory[]; summary: { totalMessages: number; byProvider: Record<string, number> } } {
    return {
      messages: this.history,
      summary: {
        totalMessages: this.history.length,
        byProvider: this.history.reduce((acc: Record<string, number>, msg) => {
          acc[msg.provider] = (acc[msg.provider] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }
}

// Test function defined at module level
export async function runTest(): Promise<void> {
  console.log('Starting sequential chat test...\n');
  const chat = new SequentialChat();

  try {
    // Test Ollama
    console.log('Testing Ollama provider...');
    await chat.switchProvider('ollama');
    await chat.chat('What is quantum computing?');

    // Test LM Studio
    console.log('\nTesting LM Studio provider...');
    await chat.switchProvider('lmstudio');
    await chat.chat('Can you elaborate on quantum entanglement?');

    // Switch back to Ollama
    console.log('\nSwitching back to Ollama provider...');
    await chat.switchProvider('ollama');
    await chat.chat('How does quantum cryptography work?');

    // Get conversation history
    const history = chat.getHistory();
    console.log('\nTest completed successfully');
    console.log('\nChat history summary:');
    console.log(JSON.stringify(history.summary, null, 2));
    console.log('\nDetailed chat history:');
    console.log(JSON.stringify(history.messages, null, 2));
  } catch (error: any) {
    console.error('\nTest failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    chat.clearContext();
  }
}

// Run test if this is the main module
if (require.main === module) {
  runTest().catch(console.error);
}