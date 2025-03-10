import { OllamaStreamResponse } from './types';

export const AVAILABLE_MODELS = {
  architect: 'deepseek-r1:14b',
  developer: 'deepseek-r1:14b'
} as const;

export type ChatRole = keyof typeof AVAILABLE_MODELS;

interface ChatOptions {
  stream?: boolean;
  temperature?: number;
}

const DEFAULT_OPTIONS: ChatOptions = {
  stream: true,
  temperature: 0.7
};

const ROLE_PROMPTS = {
  architect: `You are a senior software architect focused on high-level system design, architecture patterns, and best practices. 
Analyze requests from an architectural perspective, considering:
- System design and architecture
- Scalability and performance
- Integration patterns
- Best practices and design principles
- Trade-offs and technical decisions

Question/Request: `,

  developer: `You are a senior software developer focused on practical implementation details and coding. 
Analyze requests from a development perspective, considering:
- Code implementation details
- Programming patterns and practices
- Error handling and edge cases
- Testing and debugging approaches
- Performance optimizations

Question/Request: `
};

export class DualModelChat {
  private async makeRequest(endpoint: string, body: any) {
    const response = await fetch(`http://localhost:11434/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  async getStreamingResponse(
    message: string,
    role: ChatRole,
    onChunk: (chunk: string) => void,
    options: ChatOptions = DEFAULT_OPTIONS
  ): Promise<void> {
    const prompt = ROLE_PROMPTS[role] + message;

    try {
      const response = await this.makeRequest('generate', {
        model: AVAILABLE_MODELS[role],
        prompt,
        stream: true,
        temperature: options.temperature
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as OllamaStreamResponse;
            if (parsed.response) {
              onChunk(parsed.response);
            }
          } catch (e) {
            console.error('Failed to parse streaming response:', e);
          }
        }
      }
    } catch (error) {
      console.error('Streaming request failed:', error);
      throw error;
    }
  }

  async getResponse(
    message: string,
    role: ChatRole,
    options: ChatOptions = DEFAULT_OPTIONS
  ): Promise<string> {
    const prompt = ROLE_PROMPTS[role] + message;

    try {
      const response = await this.makeRequest('generate', {
        model: AVAILABLE_MODELS[role],
        prompt,
        stream: false,
        temperature: options.temperature
      });

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Non-streaming request failed:', error);
      throw error;
    }
  }
}
