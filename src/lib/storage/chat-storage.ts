import type { ChatMessage } from '../types';

export interface StoredChat {
  id: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export class ChatStorage {
  private static instance: ChatStorage;
  private readonly storageKey = 'audio-learning-hub-chats';

  private constructor() {
    // Private constructor to enforce singleton
  }

  static getInstance(): ChatStorage {
    if (!ChatStorage.instance) {
      ChatStorage.instance = new ChatStorage();
    }
    return ChatStorage.instance;
  }

  getAllChats(): StoredChat[] {
    try {
      const chatsJson = localStorage.getItem(this.storageKey);
      if (!chatsJson) return [];
      
      const chats = JSON.parse(chatsJson);
      return Array.isArray(chats) ? chats : [];
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  }

  getChat(id: string): StoredChat | null {
    const chats = this.getAllChats();
    return chats.find(chat => chat.id === id) ?? null;
  }

  createChat(model: string): StoredChat {
    const now = Date.now();
    const newChat: StoredChat = {
      id: now.toString(),
      messages: [],
      model,
      createdAt: now,
      updatedAt: now,
    };

    const chats = this.getAllChats();
    chats.unshift(newChat);
    this.saveChats(chats);

    return newChat;
  }

  updateChat(id: string, messages: ChatMessage[], model: string): void {
    const chats = this.getAllChats();
    const index = chats.findIndex(chat => chat.id === id);
    
    if (index !== -1) {
      chats[index] = {
        ...chats[index],
        messages,
        model,
        updatedAt: Date.now(),
      };
      this.saveChats(chats);
    }
  }

  deleteChat(id: string): void {
    const chats = this.getAllChats();
    const filteredChats = chats.filter(chat => chat.id !== id);
    this.saveChats(filteredChats);
  }

  exportChat(id: string): string {
    const chat = this.getChat(id);
    if (!chat) throw new Error(`Chat not found: ${id}`);
    return JSON.stringify(chat, null, 2);
  }

  private saveChats(chats: StoredChat[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }
}
