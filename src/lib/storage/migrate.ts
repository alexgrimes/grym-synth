import { ChatStorage, StoredChat } from './chat-storage';
import { storage } from './db';

export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  const chatStorage = ChatStorage.getInstance();
  const existingChats = chatStorage.getAllChats();

  if (existingChats.length === 0) {
    return; // No data to migrate
  }

  try {
    // Migrate each chat to the new format
    for (const chat of existingChats) {
      // Create a new conversation with the chat data
      const conversationId = await storage.createConversation(
        `Chat from ${new Date(chat.createdAt).toLocaleDateString()}`,
        {
          responder: chat.model,
          listener: chat.model // In the old format, we only had one model
        }
      );

      // Migrate all messages for this chat
      for (const msg of chat.messages) {
        await storage.saveMessage({
          id: crypto.randomUUID(),
          conversationId,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp ?? Date.now(),
          model: chat.model
        });
      }
    }

    // After successful migration, we could optionally clear the old storage
    // localStorage.removeItem('audio-learning-hub-chats');
    
    console.log(`Successfully migrated ${existingChats.length} chats to IndexedDB`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw new Error('Failed to migrate chat data to IndexedDB');
  }
}
