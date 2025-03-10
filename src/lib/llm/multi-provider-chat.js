const { OllamaProvider } = require('./providers/ollama-provider');

class SequentialChat {
  constructor(providers) {
    this.providers = new Map();
    this.activeProvider = null;
    this.conversationHistory = [];

    Object.entries(providers).forEach(([key, provider]) => {
      this.providers.set(key, provider);
    });
    // Set first provider as active by default
    this.activeProvider = Object.values(providers)[0];
  }

  setActiveProvider(providerKey) {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new Error(`Provider ${providerKey} not found`);
    }
    this.activeProvider = provider;
  }

  async getResponse(message, config = {}) {
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

  async *streamResponse(message, config = {}) {
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

module.exports = { SequentialChat };