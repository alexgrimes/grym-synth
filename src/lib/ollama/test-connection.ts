export async function testOllamaConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('/api/test-connection', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    const data = await response.json();
    console.log('Ollama test response:', data);
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Connection test failed: ${response.statusText}`);
    }
    
    return {
      success: true,
      deepseek: data.deepseek,
      qwen: data.qwen
    };
  } catch (error: any) {
    console.error('Ollama connection test failed:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Connection test timed out. Please check if Ollama server is responding.');
    }
    
    throw new Error(error.message || 'Failed to connect to Ollama server');
  }
}
