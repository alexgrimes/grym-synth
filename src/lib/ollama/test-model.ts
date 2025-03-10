import { testOllamaConnection } from './test-connection';

async function testModel() {
  console.log('Testing Ollama connection and deepseek-r1:14b model...');
  
  try {
    const isConnected = await testOllamaConnection();
    if (!isConnected) {
      console.error('Failed to connect to Ollama. Make sure Ollama is running.');
      return;
    }
    
    console.log('Successfully connected to Ollama.');
    console.log('Testing deepseek-r1:14b model...');
    
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-r1:14b',
        prompt: 'Say "Model is working!" if you can read this.',
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Model response:', data);
    
  } catch (error) {
    console.error('Error testing model:', error);
  }
}

// Run the test
testModel();
