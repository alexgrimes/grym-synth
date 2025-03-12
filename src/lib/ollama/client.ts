import { OllamaConfig, defaultOllamaConfig, validateConfig, mergeConfigs } from './config';
import EventEmitter from 'events';

export interface OllamaClientOptions {
  config?: Partial<OllamaConfig>;
  baseUrl?: string;
}

export interface ModelResponse {
  response: string;
  context?: number[];
  done: boolean;
}

export class OllamaClient extends EventEmitter {
  private config: OllamaConfig;
  private baseUrl: string;
  private initialized: boolean = false;

  constructor(options: OllamaClientOptions = {}) {
    super();
    this.config = mergeConfigs(defaultOllamaConfig, options.config || {});
    validateConfig(this.config);
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Verify Ollama service is running
      await this.ping();

      // Set system parameters
      await this.setSystemParameters();

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Ollama client: ${(error as Error).message}`);
    }
  }

  private async ping(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Ollama service not available: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to Ollama service: ${(error as Error).message}`);
    }
  }

  private async setSystemParameters(): Promise<void> {
    // Set CUDA parameters if enabled
    if (this.config.system.cuda_enabled) {
      process.env.CUDA_VISIBLE_DEVICES = '0';
    }

    // Set memory limit
    process.env.OLLAMA_MAX_MEMORY_PERCENT = String(this.config.system.max_memory_percent);
  }

  async runModel(model: string, prompt: string, options: {
    stream?: boolean;
    onProgress?: (response: ModelResponse) => void;
  } = {}): Promise<ModelResponse | AsyncGenerator<ModelResponse>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const modelConfig = this.config.models[model];
    if (!modelConfig) {
      throw new Error(`Model ${model} not found in configuration`);
    }

    const requestBody = {
      model,
      prompt,
      options: {
        ...modelConfig,
      },
      stream: options.stream || false,
    };

    if (options.stream) {
      return this.streamResponse(model, requestBody, options.onProgress);
    } else {
      return this.singleResponse(model, requestBody);
    }
  }

  private async singleResponse(model: string, requestBody: any): Promise<ModelResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate response: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        response: data.response,
        context: data.context,
        done: true,
      };
    } catch (error) {
      throw new Error(`Error running model ${model}: ${(error as Error).message}`);
    }
  }

  private async *streamResponse(
    model: string,
    requestBody: any,
    onProgress?: (response: ModelResponse) => void
  ): AsyncGenerator<ModelResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate response: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON objects
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              const response: ModelResponse = {
                response: data.response,
                context: data.context,
                done: data.done,
              };

              if (onProgress) {
                onProgress(response);
              }

              yield response;

              if (data.done) {
                return;
              }
            } catch (error) {
              console.error('Error parsing streamed response:', error);
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Error streaming model ${model}: ${(error as Error).message}`);
    }
  }

  async getModelInfo(model: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`Error getting info for model ${model}: ${(error as Error).message}`);
    }
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<OllamaConfig>): void {
    this.config = mergeConfigs(this.config, newConfig);
    validateConfig(this.config);

    // Reset initialization flag to force reinitialization with new config
    this.initialized = false;
  }
}
