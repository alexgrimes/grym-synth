const TIMEOUT_MS = 120000; // 2 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    console.log(`Retrying request, ${retries} attempts remaining...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchWithRetry(url, options, retries - 1);
  }
}

class OllamaProvider {
  constructor(model) {
    this.name = 'Ollama';
    this.endpoint = 'http://127.0.0.1:11434';
    this.model = model;
    this.context = null;
  }

  async getResponse(prompt) {
    const response = await fetchWithRetry(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        context: this.context,
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
      this.context = data.context;
    }

    return data.response;
  }

  async *streamResponse(prompt) {
    const response = await fetchWithRetry(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: true,
        context: this.context,
        options: {
          temperature: 0.7,
          num_predict: 1024,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1,
        }
      })
    });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line);
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
    } finally {
      reader.releaseLock();
    }
  }

  clearContext() {
    this.context = null;
  }

  async isAvailable() {
    try {
      const response = await fetchWithRetry(`${this.endpoint}/api/version`, {
        method: 'GET'
      });
      const data = await response.json();
      return !!data.version;
    } catch (error) {
      console.error('Ollama availability check failed:', error);
      return false;
    }
  }
}

module.exports = { OllamaProvider };