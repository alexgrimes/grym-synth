import { ModelContextState, ModelResourceMetrics } from './providers/resource-manager/types';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  role: 'assistant';
}

export interface LLMProvider {
  name: string;
  endpoint: string;
  contextLimit: number;
  chat(options: ChatOptions): Promise<ChatResponse>;
  healthCheck(): Promise<boolean>;
  getCapabilities(): Promise<ModelCapabilities>;
  getResourceMetrics(): ModelResourceMetrics;
  getContextState(): ModelContextState;
  setContextState(state: ModelContextState): void;
}

export interface ModelCapabilities {
  contextWindow: number;
  streamingSupport: boolean;
  specialTokens: Record<string, string>;
  modelType: 'completion' | 'chat';
}

export interface ProviderConfig {
  name: string;
  endpoint: string;
  contextLimit: number;
  modelName?: string;
  apiKey?: string;
}