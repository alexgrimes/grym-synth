import { Conversation, Message, ModelContext } from '../storage/types';
import { StorageManager } from '../storage/db';
import { SequentialChat } from '../llm/test-sequential-chat';

export class MessageHandler {
  private sequentialChat: SequentialChat;

  constructor(
    private storage: StorageManager
  ) {
    this.sequentialChat = new SequentialChat();
    // Start with Ollama as the default provider
    this.sequentialChat.switchProvider('ollama').catch(error => {
      console.error('Failed to initialize Ollama provider:', error);
    });
  }

  async processNewMessage(
    conversation: Conversation,
    content: string,
    role: 'user' | 'assistant'
  ) {
    try {
      // First, save the new message
      const message = await this.saveMessage(conversation.id, content, role);

      // If this is a user message, we need to:
      // 1. Update the listener's context (if LM Studio is available)
      // 2. Get a response from the responder
      if (role === 'user') {
        try {
          // Try to update listener context with LM Studio
          try {
            await this.sequentialChat.switchProvider('lmstudio');
            await this.updateListenerContext(conversation, message);
          } catch (error) {
            console.warn('LM Studio not available for context update, continuing with Ollama only');
          }
        } catch (error) {
          console.error('Failed to update listener context:', error);
          // Continue even if listener update fails
        }
        
        // Ensure we're using Ollama for the response
        await this.sequentialChat.switchProvider('ollama');
        const response = await this.getResponderReply(conversation, message);
        
        // Save the response as a new message
        await this.saveMessage(conversation.id, response, 'assistant');
      }
    } catch (error: any) {
      console.error('Error in processNewMessage:', error);
      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  private async saveMessage(
    conversationId: string,
    content: string,
    role: 'user' | 'assistant' | 'system'
  ): Promise<Message> {
    const message: Message = {
      id: Date.now().toString(),
      conversationId,
      role,
      content,
      timestamp: Date.now()
    };

    await this.storage.saveMessage(message);
    return message;
  }

  private async updateListenerContext(
    conversation: Conversation,
    newMessage: Message
  ) {
    if (!conversation.models) {
      throw new Error('Models not configured for conversation');
    }

    const listenerModel = conversation.models.listener;
    if (!listenerModel) {
      throw new Error('Listener model not configured for conversation');
    }

    // Ensure contexts object exists and is properly initialized
    if (!conversation.models.contexts || typeof conversation.models.contexts !== 'object') {
      conversation.models.contexts = {};
    }

    // Initialize or get the current context
    let currentContext = conversation.models.contexts[listenerModel];
    if (!currentContext) {
      currentContext = {
        understanding: "Initial conversation context.",
        lastUpdated: Date.now(),
        messagesSeen: []
      };
      conversation.models.contexts[listenerModel] = currentContext;
    }

    try {
      const prompt = `You are observing a conversation to build your understanding. 
      Your current understanding: ${currentContext.understanding}
      
      New message: ${newMessage.content}
      
      Update your understanding of the conversation, maintaining your unique perspective.
      Focus on the key points that would be relevant if you need to respond later.`;

      const response = await this.sequentialChat.chat(prompt);

      // Update the listener's context in storage
      await this.storage.updateModelContext(
        conversation.id,
        listenerModel,
        {
          understanding: response,
          lastUpdated: Date.now(),
          messagesSeen: [...currentContext.messagesSeen, parseInt(newMessage.id)]
        }
      );
    } catch (error) {
      console.error('Failed to update listener context:', error);
      throw error;
    }
  }

  private async getResponderReply(
    conversation: Conversation,
    message: Message
  ): Promise<string> {
    try {
      if (!conversation.models) {
        throw new Error('Models not configured for conversation');
      }

      const responderModel = conversation.models.responder;
      if (!responderModel) {
        throw new Error('Responder model not configured for conversation');
      }

      // Get all messages in the conversation
      const conversationMessages = await this.storage.getConversationMessages(conversation.id);
      
      // Build the conversation history as a single prompt
      const history = conversationMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      
      const prompt = `You are ${responderModel}, an AI assistant. Be helpful, clear, and concise in your responses.
      
Previous conversation:
${history}

User: ${message.content}`;

      const response = await this.sequentialChat.chat(prompt);
      return response;
    } catch (error: any) {
      console.error('Error in getResponderReply:', error);
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  async addSystemMessage(conversationId: string, content: string): Promise<Message> {
    return this.saveMessage(conversationId, content, 'system');
  }
}
