export interface OllamaStreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
  eval_count?: number;
}

export interface LLMConfig {
  temperature?: number;
  maxTokens?: number;
  format?: 'openai' | 'raw';
}

export interface LLMResponse {
  content: string;
  metadata?: {
    tokens: number;
    model: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  config?: LLMConfig;
}

export interface ChatResponse extends LLMResponse {
  messages: ChatMessage[];
}
