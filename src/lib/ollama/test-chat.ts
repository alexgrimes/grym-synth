import { storage } from '../storage/db';
import { ollamaClient } from './client';
import type { Message } from '../storage/types';

async function testChatFlow() {
  try {
    console.log('1. Creating test conversation...');
    const conversationId = await storage.createConversation('Test Chat', {
      responder: 'deepseek-r1:14b',
      listener: 'qwen2.5-coder'
    });
    console.log('Conversation created:', conversationId);

    // Test message
    const userMessage: Message = {
      id: 'test-1',
      content: 'Hello, are you working?',
      role: 'user',
      timestamp: Date.now(),
      conversationId
    };

    console.log('2. Saving user message...');
    await storage.saveMessage(userMessage);
    
    console.log('3. Getting model response...');
    const response = await ollamaClient.chat({
      messages: [{ role: 'user', content: userMessage.content }],
      model: 'deepseek-r1:14b'
    });
    console.log('Model response:', response);

    console.log('4. Saving model response...');
    const assistantMessage: Message = {
      id: 'test-2',
      content: response.content,
      role: 'assistant',
      timestamp: Date.now(),
      conversationId,
      model: 'deepseek-r1:14b'
    };
    await storage.saveMessage(assistantMessage);

    console.log('5. Updating model context...');
    await storage.updateModelContext(conversationId, 'deepseek-r1:14b', {
      understanding: 'Initial conversation test',
      messagesSeen: [1, 2]
    });

    console.log('6. Retrieving conversation messages...');
    const messages = await storage.getMessages(conversationId);
    console.log('Retrieved messages:', messages);

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testChatFlow();