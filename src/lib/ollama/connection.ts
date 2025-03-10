import { testOllamaConnection } from './test-connection';

export async function verifyOllamaSetup(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await testOllamaConnection();
    console.log('Setup verification succeeded:', result);
    return { success: true };
  } catch (error: any) {
    console.error('Setup verification failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Ollama server'
    };
  }
}
