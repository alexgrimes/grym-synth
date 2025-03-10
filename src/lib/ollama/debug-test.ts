import { ollamaClient } from './client';
import type { ChatMessage } from './types';

async function runDebugTests() {
  console.log('Starting Ollama Debug Tests...\n');

  // Test 1: Basic Connection
  console.log('Test 1: Basic Connection Test');
  try {
    const isConnected = await ollamaClient.testConnection();
    console.log('Connection test result:', isConnected);
  } catch (error) {
    console.error('Connection test failed:', error);
    return; // Stop if we can't even connect
  }

  // Test 2: Simple Message
  console.log('\nTest 2: Simple Message Test');
  try {
    const response = await ollamaClient.sendMessage('Hello, this is a test message.');
    console.log('Simple message response:', response);
  } catch (error) {
    console.error('Simple message test failed:', error);
  }

  // Test 3: Chat Format
  console.log('\nTest 3: Chat Format Test');
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'Hi, how are you?'
      }
    ];
    const response = await ollamaClient.chat({ messages });
    console.log('Chat format response:', response);
  } catch (error) {
    console.error('Chat format test failed:', error);
  }

  // Test 4: Longer Message (Testing memory limits)
  console.log('\nTest 4: Longer Message Test');
  try {
    const longMessage = 'Please analyze this text. '.repeat(50); // Create a longer message
    const response = await ollamaClient.sendMessage(longMessage);
    console.log('Long message response:', response);
  } catch (error) {
    console.error('Long message test failed:', error);
  }
}

// Run the tests
console.log('Starting debug tests...');
runDebugTests().catch(error => {
  console.error('Debug test suite failed:', error);
});
