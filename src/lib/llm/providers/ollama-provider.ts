import { LLMProvider, StreamResponse } from '../types';

export class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  endpoint = 'http://localhost:11434';
  private model: string;
  private context: number[] | null = null;

  constructor(model: string) {
    this.model = model;
  }

  async getResponse(prompt: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        context: this.context
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.context) {
      this.context = data.context;
    }

    return data.response;
  }

  async *streamResponse(prompt: string) {
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: true,
        context: this.context
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk: StreamResponse = JSON.parse(line);
            if (chunk.context) {
              this.context = chunk.context;
            }
            yield chunk;
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    }
  }

  clearContext() {
    this.context = null;
  }
}