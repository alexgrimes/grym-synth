import { openDB } from 'idb';
import { nanoid } from 'nanoid';
import { Message, Conversation, ModelContext } from './types';

export class StorageManager {
  private async initDB() {
    return openDB('chat-db', 1, {
      upgrade(db) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('byConversation', 'conversationId');
        }
      }
    });
  }

  async saveMessage(message: Message) {
    const db = await this.initDB();
    await db.put('messages', message);
    
    // Update conversation timestamp
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.objectStore('conversations');
    const conversation = await store.get(message.conversationId);
    if (conversation) {
      conversation.updatedAt = Date.now();
      await store.put(conversation);
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const db = await this.initDB();
    return db.getAllFromIndex('messages', 'byConversation', conversationId);
  }

  // Alias for getMessages to maintain compatibility
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.getMessages(conversationId);
  }

  async createConversation(title: string, models: { responder: string; listener: string }): Promise<string> {
    const db = await this.initDB();
    const conversation: Conversation = {
      id: nanoid(),
      title,
      models: {
        responder: models.responder,
        listener: models.listener,
        contexts: {} // Initialize empty contexts object
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.put('conversations', conversation);
    return conversation.id;
  }

  async updateModelContext(
    conversationId: string,
    modelName: string,
    context: Partial<ModelContext>
  ) {
    const db = await this.initDB();
    const tx = db.transaction('conversations', 'readwrite');
    const store = tx.objectStore('conversations');
    
    const conversation = await store.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Ensure the contexts object exists
    if (!conversation.models.contexts) {
      conversation.models.contexts = {};
    }

    // Get existing context or create new one
    const existingContext = conversation.models.contexts[modelName] || {
      understanding: '',
      lastUpdated: 0,
      messagesSeen: []
    };

    // Merge the new context with existing context and ensure lastUpdated is set
    const updatedContext: ModelContext = {
      ...existingContext,
      ...context,
      lastUpdated: context.lastUpdated || Date.now() // Use provided lastUpdated or current timestamp
    };

    // Update the context for this model
    conversation.models.contexts[modelName] = updatedContext;
    conversation.updatedAt = Date.now();

    await store.put(conversation);
  }
}

export const storage = new StorageManager();
