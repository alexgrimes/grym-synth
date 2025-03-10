async function testOllamaConnection() {
  try {
    console.log('Sending request to Ollama...');
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-r1:14b',
        prompt: 'Hello, are you working?',
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Ollama test response:', data);
    return true;
  } catch (error) {
    console.error('Ollama connection test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

console.log('Testing Ollama connection...');
testOllamaConnection().catch(console.error);
