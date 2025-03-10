import {
  LLMModel,
  ModelCapabilities,
  ModelCapability,
  ModelOrchestratorError
} from '../types';

interface OllamaConfig {
  modelName: string;
  endpoint: string;
  contextWindow: number;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  capabilities?: Partial<Record<ModelCapability, number>>;
}

/**
 * Ollama model provider implementation
 */
export class OllamaProvider implements LLMModel {
  public readonly capabilities: ModelCapabilities;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly contextWindow: number,
    private config: OllamaConfig
  ) {
    this.capabilities = this.initializeCapabilities(config.capabilities || {});
  }

  /**
   * Process a request through the Ollama model
   */
  async process(input: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.modelName,
          prompt: this.formatInput(input),
          options: {
            temperature: this.config.temperature || 0.7,
            top_p: this.config.topP || 0.9,
            num_predict: this.config.maxTokens,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.formatOutput(result);
    } catch (error) {
      throw new ModelOrchestratorError(
        'Failed to process request with Ollama model',
        'MODEL_EXECUTION_ERROR',
        { modelId: this.id, error }
      );
    }
  }

  /**
   * Test a specific capability of the model
   */
  async testCapability(capability: ModelCapability): Promise<{
    score: number;
    confidence: number;
    lastUpdated: Date;
    sampleSize: number;
  }> {
    return this.capabilities.get(capability) || {
      score: 0,
      confidence: 0,
      lastUpdated: new Date(),
      sampleSize: 0
    };
  }

  /**
   * Get resource metrics for the model
   */
  async getResourceMetrics(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    averageLatency: number;
    peakMemoryUsage?: number;
    totalProcessingTime?: number;
  }> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/metrics`);
      if (!response.ok) {
        throw new Error(`Failed to get metrics: ${response.statusText}`);
      }

      const metrics = await response.json();
      return {
        memoryUsage: metrics.memory_usage || 0,
        cpuUsage: metrics.cpu_usage || 0,
        averageLatency: metrics.average_latency || 0,
        peakMemoryUsage: metrics.peak_memory_usage || metrics.memory_usage || 0,
        totalProcessingTime: metrics.total_processing_time || metrics.average_latency * metrics.request_count || 0
      };
    } catch (error) {
      // Return default metrics if unable to fetch
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        averageLatency: 0,
        peakMemoryUsage: 0,
        totalProcessingTime: 0
      };
    }
  }

  async getTokenStats(): Promise<{
    total: number;
    prompt: number;
    completion: number;
    rate?: number;
    cached?: number;
  }> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/stats`);
      if (!response.ok) {
        throw new Error(`Failed to get token stats: ${response.statusText}`);
      }

      const stats = await response.json();
      const totalTokens = stats.total_tokens || 0;
      const promptTokens = stats.prompt_tokens || Math.floor(totalTokens * 0.4); // Estimate if not provided
      const completionTokens = stats.completion_tokens || totalTokens - promptTokens;

      return {
        total: totalTokens,
        prompt: promptTokens,
        completion: completionTokens,
        rate: stats.tokens_per_second,
        cached: stats.cached_tokens || 0
      };
    } catch (error) {
      // Return default stats if unable to fetch
      return {
        total: 0,
        prompt: 0,
        completion: 0,
        rate: 0,
        cached: 0
      };
    }
  }

  /**
   * Initialize model capabilities
   */
  private initializeCapabilities(
    configCapabilities: Partial<Record<ModelCapability, number>>
  ): ModelCapabilities {
    // Base capabilities for different Ollama models
    const baseCapabilities: Record<string, Record<ModelCapability, number>> = {
      'deepseek-coder': {
        code: 0.95,
        reasoning: 0.85,
        vision: 0,
        context: 0.8,
        analysis: 0.9,
        interaction: 0.7,
        specialized: 0.8
      },
      'deepseek-1b': {
        code: 0.7,
        reasoning: 0.9,
        vision: 0,
        context: 0.8,
        analysis: 0.85,
        interaction: 0.8,
        specialized: 0.7
      },
      'llama2': {
        code: 0.8,
        reasoning: 0.9,
        vision: 0,
        context: 0.85,
        analysis: 0.85,
        interaction: 0.9,
        specialized: 0.8
      },
      'mistral': {
        code: 0.85,
        reasoning: 0.9,
        vision: 0,
        context: 0.9,
        analysis: 0.9,
        interaction: 0.85,
        specialized: 0.85
      },
      'codellama': {
        code: 0.95,
        reasoning: 0.8,
        vision: 0,
        context: 0.8,
        analysis: 0.85,
        interaction: 0.7,
        specialized: 0.9
      }
    };

    // Get base capabilities for the model
    const modelBase = baseCapabilities[this.config.modelName] || {
      code: 0.7,
      reasoning: 0.7,
      vision: 0,
      context: 0.7,
      analysis: 0.7,
      interaction: 0.7,
      specialized: 0.7
    };

    // Create capabilities map
    const capabilities = new Map<ModelCapability, {
      score: number;
      confidence: number;
      lastUpdated: Date;
      sampleSize: number;
    }>();

    // Initialize all capabilities
    (Object.keys(modelBase) as ModelCapability[]).forEach(capability => {
      capabilities.set(capability, {
        score: configCapabilities[capability] || modelBase[capability],
        confidence: 0.8,
        lastUpdated: new Date(),
        sampleSize: 100
      });
    });

    return {
      get: (capability: ModelCapability) => capabilities.get(capability) || {
        score: 0,
        confidence: 0,
        lastUpdated: new Date(),
        sampleSize: 0
      },
      set: (capability: ModelCapability, score: {
        score: number;
        confidence: number;
        lastUpdated: Date;
        sampleSize: number;
      }) => {
        capabilities.set(capability, score);
      },
      has: (capability: ModelCapability) => capabilities.has(capability),
      getAll: () => capabilities
    };
  }

  /**
   * Format input for the Ollama model
   */
  private formatInput(input: any): string {
    if (typeof input === 'string') {
      return input;
    }

    if (typeof input === 'object') {
      // Handle different input types
      if (input.type === 'planning') {
        return this.formatPlanningInput(input);
      }
      if (input.type === 'code') {
        return this.formatCodeInput(input);
      }
      if (input.type === 'analysis') {
        return this.formatAnalysisInput(input);
      }
    }

    return JSON.stringify(input, null, 2);
  }

  /**
   * Format planning input
   */
  private formatPlanningInput(input: any): string {
    return `Task Planning Request:
Description: ${input.task.description}
Type: ${input.task.type}
Requirements:
${JSON.stringify(input.task.requirements, null, 2)}

Please provide a detailed plan for accomplishing this task, including:
1. Key steps and their dependencies
2. Required capabilities and resources
3. Potential challenges and mitigation strategies
4. Success criteria and validation approach`;
  }

  /**
   * Format code input
   */
  private formatCodeInput(input: any): string {
    return `Code Generation Request:
${input.task.description}

Requirements:
${JSON.stringify(input.task.requirements, null, 2)}

Context:
${input.context || 'No additional context provided'}

Please provide:
1. Implementation code
2. Brief explanation of the approach
3. Any important considerations or assumptions`;
  }

  /**
   * Format analysis input
   */
  private formatAnalysisInput(input: any): string {
    return `Analysis Request:
${input.task.description}

Content to Analyze:
${typeof input.content === 'string' ? input.content : JSON.stringify(input.content, null, 2)}

Please provide:
1. Detailed analysis
2. Key findings and insights
3. Potential improvements or recommendations
4. Any concerns or issues identified`;
  }

  /**
   * Format output from the Ollama model
   */
  private formatOutput(result: any): any {
    // Extract the generated text
    const text = result.response || result.generated_text || '';

    // Try to parse as JSON if it looks like JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch {
        // If parsing fails, return as text
        return text;
      }
    }

    return text;
  }
}