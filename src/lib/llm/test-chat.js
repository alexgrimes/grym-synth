global.fetch = require('node-fetch');

const { SequentialChat } = require('./multi-provider-chat');
const { OllamaProvider } = require('./providers/ollama-provider');
const { LMStudioProvider } = require('./providers/lm-studio-provider');

async function testSequentialChat() {
  // Initialize providers with specific models
  const chat = new SequentialChat({
    ollama: new OllamaProvider('deepseek-r1:14b'),  // Using DeepSeek for Ollama
    lmStudio: new LMStudioProvider('qwen2.5-vl-7b-instruct') // Using the correct Qwen model
  });

  try {
    // Test 1: Use Ollama for initial question
    console.log('\n=== Test 1: Ollama Initial Question ===');
    chat.setActiveProvider('ollama');
    const ollamaResponse = await chat.getResponse(
      'What are the key differences between TypeScript and JavaScript?'
    );
    console.log('Ollama Response:', ollamaResponse);

    // Test 2: Switch to LM Studio for implementation details
    console.log('\n=== Test 2: LM Studio Implementation Details ===');
    chat.setActiveProvider('lmStudio');
    const lmStudioResponse = await chat.getResponse(
      'Based on the previous explanation, show me how to implement a TypeScript interface with generics.'
    );
    console.log('LM Studio Response:', lmStudioResponse);

    // Test 3: Back to Ollama for architectural discussion
    console.log('\n=== Test 3: Ollama Architecture Discussion ===');
    chat.setActiveProvider('ollama');
    const architectureResponse = await chat.getResponse(
      'What are the architectural benefits of using TypeScript in a large-scale application?'
    );
    console.log('Ollama Architecture Response:', architectureResponse);

    // Test 4: Streaming response from Ollama
    console.log('\n=== Test 4: Ollama Streaming Response ===');
    chat.setActiveProvider('ollama');
    console.log('Streaming response (each chunk on new line):');
    for await (const chunk of chat.streamResponse(
      'Explain how TypeScript\'s type system helps with refactoring.'
    )) {
      process.stdout.write(chunk.response);
    }
    console.log('\n');

    // Get conversation history
    console.log('\n=== Conversation History ===');
    const history = chat.getConversationHistory();
    history.forEach((msg, i) => {
      console.log(`${i + 1}. [${msg.provider}] ${msg.role}: ${msg.content.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Error during sequential chat test:', error);
  } finally {
    // Clean up
    chat.clearHistory();
  }
}

// Run the test
console.log('Starting Sequential Chat Test...');
testSequentialChat().then(() => {
  console.log('Test completed.');
}).catch(error => {
  console.error('Test failed:', error);
});