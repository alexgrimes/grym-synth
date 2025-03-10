# Sequential Chat Setup Guide

This guide explains how to set up and use the sequential chat system that allows interaction with both Ollama and LM Studio models in a single conversation, with persistent storage and context management.

## Prerequisites

1. **Ollama**
   - Install Ollama from [ollama.ai](https://ollama.ai)
   - Run `ollama serve` to start the Ollama server
   - Pull the required model: `ollama pull deepseek-r1:14b`

2. **LM Studio**
   - Install LM Studio from [lmstudio.ai](https://lmstudio.ai)
   - Launch LM Studio and load the qwen2.5-vl-7b-instruct model
   - Enable the local inference server in LM Studio settings
   - Start the server (it runs on port 1234 by default)

3. **Browser Requirements**
   - Modern browser with IndexedDB support
   - Chrome 76+, Firefox 65+, or Safari 13.1+
   - Minimum 50MB storage space recommended

## Installation

1. Install dependencies:
```bash
npm install node-fetch idb nanoid
```

## Components

The system consists of several integrated components:

1. **Storage Layer**
   - IndexedDB-based persistence
   - Conversation management
   - Message history
   - Model context tracking

2. **Provider Layer**
   - OllamaProvider: Handles Ollama models
   - LMStudioProvider: Handles LM Studio models
   - Provider switching logic

3. **UI Layer**
   - Chat interface
   - Message display
   - Context management
   - Loading states

## Usage

### Basic Usage Example

```typescript
import { storage } from './lib/storage/db';
import { SequentialChat } from './lib/llm/sequential-chat';

// Initialize chat with storage
const chat = new SequentialChat();

// Create a new conversation
const conversationId = await storage.createConversation('New Chat', {
  responder: 'deepseek-r1:14b',
  listener: 'qwen2.5-coder'
});

// Start with Ollama
await chat.switchProvider('ollama');
const response1 = await chat.chat('What is quantum computing?');
await storage.saveMessage({
  id: nanoid(),
  content: response1,
  role: 'assistant',
  timestamp: Date.now(),
  conversationId
});

// Switch to LM Studio
await chat.switchProvider('lmstudio');
const response2 = await chat.chat('Can you elaborate on quantum entanglement?');
await storage.saveMessage({
  id: nanoid(),
  content: response2,
  role: 'assistant',
  timestamp: Date.now(),
  conversationId
});
```

### Features

- **Provider Switching**: Seamlessly switch between Ollama and LM Studio models
- **Persistent Storage**: IndexedDB-based storage for conversations and messages
- **Context Management**: Each provider maintains its own context
- **Error Handling**: Robust error handling for API and storage issues
- **Real-time Updates**: UI updates as messages are processed
- **Automatic Context Preservation**: Context is preserved across sessions

## API Reference

### StorageManager Class

```typescript
class StorageManager {
  // Initialize IndexedDB storage
  private async initDB()

  // Save a message to storage
  async saveMessage(message: Message)

  // Get messages for a conversation
  async getMessages(conversationId: string)

  // Create a new conversation
  async createConversation(title: string, models: Models)

  // Update model context
  async updateModelContext(conversationId: string, modelName: string, context: ModelContext)
}
```

### SequentialChat Class

```typescript
class SequentialChat {
  // Create a new chat instance
  constructor()

  // Switch to a different provider ('ollama' or 'lmstudio')
  async switchProvider(providerName: string)

  // Send a message and get a response
  async chat(message: string)

  // Clear conversation history and context
  clearContext()
}
```

### Provider Classes

Both `OllamaProvider` and `LMStudioProvider` implement:

```typescript
interface Provider {
  // Get a non-streaming response
  async getResponse(prompt: string)

  // Get a streaming response
  async *streamResponse(prompt: string)

  // Clear provider's context
  clearContext()
}
```

## Troubleshooting

1. **Storage Issues**
   - Check browser storage permissions
   - Verify IndexedDB support
   - Clear browser data if needed
   - Check storage quota

2. **Ollama Connection Issues**
   - Ensure Ollama is running (`ollama serve`)
   - Check if the model is downloaded (`ollama list`)
   - Verify the API endpoint (default: http://127.0.0.1:11434)

3. **LM Studio Connection Issues**
   - Ensure LM Studio is running and the local server is enabled
   - Check if the model is properly loaded
   - Verify the API endpoint (default: http://127.0.0.1:1234)

4. **Common Errors**
   - Connection refused: Check if services are running
   - Model not found: Ensure models are properly installed
   - Storage errors: Check browser console for details
   - Context errors: Try clearing context and restarting

## Testing

Run the test suite:

```bash
# Test sequential chat
node src/lib/llm/test-sequential-chat.js

# Test storage
node src/lib/ollama/test-chat.ts
```

## Notes

- Only one model can be active at a time in each service
- Context is preserved in IndexedDB between sessions
- Each provider maintains its own context
- Use `clearContext()` when starting a new conversation topic
- Storage operations are asynchronous
- Browser storage limits apply
- Regular cleanup of old conversations recommended
