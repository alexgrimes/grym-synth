const fetch = require('node-fetch');

async function testOllama() {
  console.log('Testing Ollama connection...');
  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-r1:14b',
        prompt: 'Hello',
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Ollama response:', data.response);
    return true;
  } catch (error) {
    console.error('Ollama test failed:', error.message);
    return false;
  }
}

testOllama().then(success => {
  if (success) {
    console.log('Ollama test completed successfully');
  } else {
    console.log('Ollama test failed');
  }
});