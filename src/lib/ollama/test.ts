import { testOllamaConnection } from './test-connection';

async function runTest() {
  console.log('Testing Ollama connection...');
  const result = await testOllamaConnection();
  console.log('Connection test result:', result);
}

runTest().catch(console.error);
