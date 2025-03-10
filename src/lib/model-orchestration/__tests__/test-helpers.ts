import {
  LLMModel,
  ModelCapability,
  ModelCapabilities,
  Task,
  TaskRequirements,
  ModelResult,
  ModelChain,
  ModelPhase,
  ModelRegistry
} from '../types';

/**
 * Create a mock task with specified capabilities and requirements
 */
export function createTestTask(
  taskType: string,
  taskPriority: 'speed' | 'quality' | 'efficiency' = 'quality',
  taskOptions: {
    primaryCapability?: ModelCapability;
    secondaryCapabilities?: ModelCapability[];
    minScores?: Map<ModelCapability, number>;
    contextSize?: number;
    resourceConstraints?: {
      maxMemory?: number;
      maxCpu?: number;
      maxLatency?: number;
    };
  } = {}
): Task {
  // Create minimal requirements that allow TaskAnalyzer to do inference
  const taskRequirements: TaskRequirements = {
    // Only set primaryCapability if explicitly provided
    primaryCapability: taskOptions.primaryCapability || 'reasoning',
    // Let TaskAnalyzer infer secondary capabilities
    secondaryCapabilities: taskOptions.secondaryCapabilities || [],
    // Let TaskAnalyzer calculate scores
    minCapabilityScores: taskOptions.minScores || new Map(),
    // Let TaskAnalyzer determine context size
    contextSize: taskOptions.contextSize || 0,
    // Always set priority
    priority: taskPriority,
    // Only set constraints if provided
    resourceConstraints: taskOptions.resourceConstraints
  };

  // Create task with explicit property assignments
  const task: Task = {
    id: `test-task-${Math.random().toString(36).substr(2, 9)}`,
    type: taskType,
    description: `Test task for ${taskType}`,
    input: {} as Record<string, unknown>,
    requirements: taskRequirements
  };

  return task;
}

/**
 * Create a mock model with specified capabilities
 */
export function createMockModel(
  config: {
    id: string;
    name: string;
    capabilities: Partial<Record<ModelCapability, number>>;
    contextWindow?: number;
    mockProcess?: (input: any) => Promise<any>;
  }
): LLMModel {
  class MockCapabilities implements ModelCapabilities {
    private scores = new Map<ModelCapability, { 
      score: number; 
      confidence: number; 
      lastUpdated: Date; 
      sampleSize: number;
    }>();

    constructor(initialScores: Partial<Record<ModelCapability, number>>) {
      const allCapabilities: ModelCapability[] = [
        'code', 'reasoning', 'vision', 'context',
        'analysis', 'interaction', 'specialized'
      ];

      // Initialize all capabilities with zero scores
      allCapabilities.forEach(cap => {
        this.scores.set(cap, {
          score: 0,
          confidence: 0.9,
          lastUpdated: new Date(),
          sampleSize: 100
        });
      });

      // Set provided scores
      Object.entries(initialScores).forEach(([capability, score]) => {
        this.scores.set(capability as ModelCapability, {
          score,
          confidence: 0.9,
          lastUpdated: new Date(),
          sampleSize: 100
        });
      });
    }

    get(capability: ModelCapability) {
      return this.scores.get(capability) || { 
        score: 0, 
        confidence: 0, 
        lastUpdated: new Date(), 
        sampleSize: 0 
      };
    }

    set(capability: ModelCapability, score: { 
      score: number; 
      confidence: number; 
      lastUpdated: Date; 
      sampleSize: number;
    }) {
      this.scores.set(capability, score);
    }

    has(capability: ModelCapability) {
      return this.scores.has(capability);
    }

    getAll() {
      return this.scores;
    }
  }

  // Create a deep copy of the config and ensure capabilities are properly typed
  const capabilities: Partial<Record<ModelCapability, number>> = { ...config.capabilities };

  // Ensure reviewer has high enough analysis score
  if (config.id.includes('reviewer')) {
    capabilities.analysis = Math.max(capabilities.analysis || 0, 0.85);
    capabilities.reasoning = Math.max(capabilities.reasoning || 0, 0.8);
  }

  // Ensure executor has high enough score for its primary capability
  if (config.id.includes('executor')) {
    const entries = Object.entries(capabilities) as [ModelCapability, number][];
    const primaryCap = entries.reduce<ModelCapability>(
      (a, [k, v]) => v > (capabilities[a] || 0) ? k : a,
      'reasoning'
    );
    capabilities[primaryCap] = Math.max(capabilities[primaryCap] || 0, 0.85);
  }

  return {
    id: config.id,
    name: config.name,
    capabilities: new MockCapabilities(capabilities),
    contextWindow: config.contextWindow || 16000,

    async process(input: any) {
      if (config.mockProcess) {
        return config.mockProcess(input);
      }
      return input;
    },

    async testCapability(capability: ModelCapability) {
      return this.capabilities.get(capability);
    },

    async getResourceMetrics() {
      return {
        memoryUsage: 100,
        cpuUsage: 0.5,
        averageLatency: 100,
        peakMemoryUsage: 150,
        totalProcessingTime: 500,
        tokensProcessed: 1000
      };
    },

    async getTokenStats() {
      return {
        total: 1000,
        prompt: 400,
        completion: 600,
        rate: 10,
        cached: 0
      };
    }
  };
}

/**
 * Create a mock model chain for testing
 */
export function createMockModelChain(options: {
  plannerCapabilities?: Partial<Record<ModelCapability, number>>;
  executorCapabilities?: Partial<Record<ModelCapability, number>>;
  reviewerCapabilities?: Partial<Record<ModelCapability, number>>;
  contextCapabilities?: Partial<Record<ModelCapability, number>>;
} = {}): ModelChain {
  return {
    planner: createMockModel({
      id: 'mock-planner',
      name: 'Mock Planner',
      capabilities: options.plannerCapabilities || { reasoning: 0.9, analysis: 0.8 }
    }),
    executor: createMockModel({
      id: 'mock-executor',
      name: 'Mock Executor',
      capabilities: options.executorCapabilities || { code: 0.9, reasoning: 0.7 }
    }),
    ...(options.reviewerCapabilities && {
      reviewer: createMockModel({
        id: 'mock-reviewer',
        name: 'Mock Reviewer',
        capabilities: options.reviewerCapabilities
      })
    }),
    ...(options.contextCapabilities && {
      context: createMockModel({
        id: 'mock-context',
        name: 'Mock Context Manager',
        capabilities: options.contextCapabilities
      })
    })
  };
}

/**
 * Create a mock model result
 */
export function createMockModelResult(
  success: boolean = true,
  output: any = null,
  phase: ModelPhase = 'execution',
  metrics: {
    executionTime?: number;
    memoryUsed?: number;
    tokensUsed?: number;
    tokensProcessed?: number;
  } = {}
): ModelResult {
  return {
    success,
    output,
    phase,
    phases: [{
      name: phase,
      status: success ? 'completed' : 'failed',
      result: {
        success,
        output,
        metrics: {
          executionTime: metrics.executionTime || 100,
          memoryUsed: metrics.memoryUsed || 100,
          tokensUsed: metrics.tokensUsed || 1000,
          tokensProcessed: metrics.tokensProcessed || 1000
        }
      }
    }],
    metrics: {
      executionTime: metrics.executionTime || 100,
      memoryUsed: metrics.memoryUsed || 100,
      tokensUsed: metrics.tokensUsed || 1000,
      tokensProcessed: metrics.tokensProcessed || 1000
    }
  };
}

/**
 * Create a mock registry
 */
export class MockRegistry implements ModelRegistry {
  private models = new Map<string, LLMModel>();

  constructor(initialModels: LLMModel[] = []) {
    initialModels.forEach(model => this.models.set(model.id, model));
  }

  async registerModel(model: LLMModel) {
    this.models.set(model.id, model);
  }

  async unregisterModel(modelId: string) {
    this.models.delete(modelId);
  }

  getModel(modelId: string) {
    return this.models.get(modelId);
  }

  listModels() {
    return Array.from(this.models.values());
  }

  findModels(criteria: { capabilities?: ModelCapability[]; minScores?: Map<ModelCapability, number>; contextSize?: number }) {
    return this.listModels().filter(model => {
      if (criteria.capabilities) {
        return criteria.capabilities.every(cap => model.capabilities.has(cap));
      }
      return true;
    });
  }

  async getModelChain(requirements: TaskRequirements): Promise<ModelChain> {
    return createMockModelChain({
      plannerCapabilities: { reasoning: 0.9 },
      executorCapabilities: { [requirements.primaryCapability]: 0.9 },
      ...(requirements.priority === 'quality' && {
        reviewerCapabilities: { analysis: 0.9 }
      })
    });
  }
}

/**
 * Generate test execution results for performance testing
 */
export function generateTestExecutionResults(count: number): Array<{
  task: Task;
  execution: ModelResult;
}> {
  return Array.from({ length: count }, (_, i) => ({
    task: createTestTask(`performance-test-${i}`),
    execution: createMockModelResult(
      true,
      { result: `Result ${i}` },
      'execution',
      {
        executionTime: Math.random() * 1000,
        memoryUsed: Math.random() * 500,
        tokensUsed: Math.floor(Math.random() * 2000)
      }
    )
  }));
}

/**
 * Wait for a specified duration (useful for async tests)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create error simulation function
 */
export function createErrorSimulator(
  errorRate: number = 0.2,
  errorMessage: string = 'Simulated error'
): (input: any) => Promise<any> {
  return async (input: any) => {
    if (Math.random() < errorRate) {
      throw new Error(errorMessage);
    }
    return input;
  };
}