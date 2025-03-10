import type { ChatMessage } from './types';
import { errorHandler } from '../error-handler';

export class OllamaClient {
  async chat({ messages, model }: { messages: ChatMessage[]; model?: string }) {
    return errorHandler.withRecovery(async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'deepseek-r1:14b',
          messages: messages,
          stream: false
        })
      });

      // If response isn't ok, get the error details
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(`Ollama error: ${errorData.error || response.statusText}`);
        // Add additional properties to help with error recovery decisions
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).details = errorData;
        throw error;
      }

      const data = await response.json();
      return {
        content: data.message?.content || ''
      };
    });
  }

  async testConnection(model: string = 'deepseek-r1:14b') {
    return errorHandler.withRecovery(async () => {
      const response = await fetch('/api/test-connection');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        const error = new Error('Connection test failed');
        (error as any).status = response.status;
        (error as any).details = data;
        throw error;
      }
      
      return true;
    }).catch(error => {
      console.error('Connection test failed:', error);
      return false;
    });
  }
}

// Export a default instance
export const ollamaClient = new OllamaClient();
