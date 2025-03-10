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

class LMStudioProvider {
  constructor(model) {
    this.name = 'LM Studio';
    this.endpoint = 'http://127.0.0.1:1234/v1';
    this.model = model;
    this.messages = [];
  }

  async getResponse(prompt) {
    this.messages.push({ role: 'user', content: prompt });

    const response = await fetchWithRetry(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: this.messages,
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
    this.messages.push(assistantMessage);

    return assistantMessage.content;
  }

  async *streamResponse(prompt) {
    this.messages.push({ role: 'user', content: prompt });

    const response = await fetchWithRetry(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: this.messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      })
    });

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            if (line === 'data: [DONE]') continue;
            try {
              const chunk = JSON.parse(line.replace('data: ', ''));
              const delta = chunk.choices[0].delta.content;
              if (delta) {
                content += delta;
                yield chunk;
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      this.messages.push({ role: 'assistant', content });
    }
  }

  clearContext() {
    this.messages = [];
  }

  async isAvailable() {
    try {
      const response = await fetchWithRetry(`${this.endpoint}/models`, {
        method: 'GET'
      });
      const data = await response.json();
      return Array.isArray(data.data) && data.data.length > 0;
    } catch (error) {
      console.error('LM Studio availability check failed:', error);
      return false;
    }
  }
}

module.exports = { LMStudioProvider };