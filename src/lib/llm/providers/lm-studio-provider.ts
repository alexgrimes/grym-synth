import { LLMProvider, ChatMessage } from '../types';

export class LMStudioProvider implements LLMProvider {
  name = 'LM Studio';
  endpoint = 'http://127.0.0.1:1234';
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  async getResponse(prompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Note: LM Studio's streaming implementation follows OpenAI's format
  async *streamResponse(prompt: string) {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
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
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const jsonData = line.slice(6); // Remove 'data: ' prefix
            if (jsonData === '[DONE]') continue;

            const parsed = JSON.parse(jsonData);
            if (parsed.choices?.[0]?.delta?.content) {
              yield {
                model: this.model,
                created_at: new Date().toISOString(),
                response: parsed.choices[0].delta.content,
                done: false
              };
            }
          } catch (e) {
            console.error('Error parsing streaming response:', e);
          }
        }
      }
    }
  }
}