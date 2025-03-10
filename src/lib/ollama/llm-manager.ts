interface StreamChunk {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

export class LLMManager {
  private currentModel: string = 'deepseek-r1:14b';
  private context: number[] | null = null;

  setActiveModel(model: string) {
    this.currentModel = model;
  }

  async getResponse(prompt: string): Promise<string> {
    console.log('LLM Request:', { prompt });
    
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.currentModel,
          prompt,
          stream: false,
          context: this.context
        })
      });

      console.log('Ollama Response Status:', response.status);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Ollama Response Data:', data);

      if (data.context) {
        this.context = data.context;
      }

      return data.response;
    } catch (error) {
      console.error('LLM Request Failed:', error);
      throw error;
    }
  }

  async *generateStreamingResponse(prompt: string) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.currentModel,
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
              const chunk: StreamChunk = JSON.parse(line);
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

      if (buffer) {
        try {
          const chunk: StreamChunk = JSON.parse(buffer);
          if (chunk.context) {
            this.context = chunk.context;
          }
          yield chunk;
        } catch (e) {
          console.error('Error parsing final chunk:', e);
        }
      }
    } catch (error) {
      console.error('Streaming Request Failed:', error);
      throw error;
    }
  }

  clearContext() {
    this.context = null;
  }
}
