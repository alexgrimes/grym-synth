export interface ModelContext {
  understanding: string;    // The model's processed view of the conversation
  lastUpdated: number;     // When this context was last updated
  messagesSeen: number[];  // IDs of messages this model has processed
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  models: {
    responder: string;  // Model name like 'deepseek-r1:14b'
    listener: string;
    // Track each model's unique context
    contexts: {
      [modelName: string]: ModelContext;
    };
  };
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;  // Which model generated this response
}
