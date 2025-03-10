export class ChatManager {
  async sendMessage(message: string) {
    console.log('Attempting to connect to Ollama...');
    
    try {
      // First test connection
      const testResponse = await fetch('http://localhost:11434/api/version');
      console.log('Ollama connection test:', testResponse.ok);
      
      if (!testResponse.ok) {
        throw new Error('Could not connect to Ollama server. Please ensure Ollama is running.');
      }

      const versionData = await testResponse.json();
      console.log('Ollama version:', versionData);
      
      console.log('Making chat request...');
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-r1:14b',
          prompt: message,
          stream: false
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to get response: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      return data.response;
    } catch (error) {
      console.error('Detailed connection error:', error);
      throw error;
    }
  }
}
