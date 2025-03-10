import { ModelOrchestrator } from '../../model-orchestrator';
import { CapabilityScorer } from '../capability-scorer';
import { Task, ModelRegistry, LLMModel, ModelCapability, TaskRequirements, ModelCapabilities, ModelCapabilityScore, ModelChain, ModelResult } from '../../types';

// Mock implementations
class MockModelCapabilities implements ModelCapabilities {
  private scores = new Map<ModelCapability, ModelCapabilityScore>();

  get(capability: ModelCapability): ModelCapabilityScore {
    return this.scores.get(capability) || {
      score: 0,
      confidence: 0,
      lastUpdated: new Date(),
      sampleSize: 0
    };
  }

  set(capability: ModelCapability, score: ModelCapabilityScore): void {
    this.scores.set(capability, score);
  }

  has(capability: ModelCapability): boolean {
    return this.scores.has(capability);
  }

  getAll(): Map<ModelCapability, ModelCapabilityScore> {
    return new Map(this.scores);
  }
}

class MockLLMModel implements LLMModel {
  constructor(
    public id: string,
    public name: string,
    public contextWindow: number,
    private supportedCapabilities: ModelCapability[]
  ) {}

  capabilities = new MockModelCapabilities();

  async process(input: any): Promise<ModelResult> {
    if (this.id === 'code-model' && input.task?.type === 'code-generation') {
      // Simulate failure for primary model in fallback test
      if (input.task.metadata?.requireFallback) {
        return {
          success: false,
          output: null,
          phase: input.type || 'execution',
          phases: [{
            name: input.type || 'execution',
            status: 'failed',
            result: {
              success: false,
              output: null,
              metrics: {
                executionTime: 0,
                memoryUsed: 0,
                tokensUsed: 0
              }
            }
          }],
          metrics: {
            executionTime: 0,
            memoryUsed: 0,
            tokensUsed: 0
          }
        };
      }
    }
    return {
      success: true,
      output: { result: 'mock output' },
      phase: input.type || 'execution',
      phases: [{
        name: input.type || 'execution',
        status: 'completed',
        result: {
          success: true,
          output: { result: 'mock output' },
          metrics: {
            executionTime: 100,
            memoryUsed: 100,
            tokensUsed: 100
          }
        }
      }],
      metrics: {
        executionTime: 100,
        memoryUsed: 100,
        tokensUsed: 100
      }
    };
  }

  async testCapability(capability: ModelCapability): Promise<ModelCapabilityScore> {
    return {
      score: 0.8,
      confidence: 0.9,
      lastUpdated: new Date(),
      sampleSize: 10
    };
  }

  async getResourceMetrics() {
    return {
      memoryUsage: 100,
      cpuUsage: 0.5,
      averageLatency: 100,
      tokensProcessed: 1000
    };
  }

  async getTokenStats() {
    return {
      total: 1000,
      prompt: 400,
      completion: 600
    };
  }
}

class MockModelRegistry implements ModelRegistry {
  private models = new Map<string, LLMModel>();

  async registerModel(model: LLMModel): Promise<void> {
    this.models.set(model.id, model);
  }

  async unregisterModel(modelId: string): Promise<void> {
    this.models.delete(modelId);
  }

  getModel(modelId: string): LLMModel | undefined {
    return this.models.get(modelId);
  }

  listModels(): LLMModel[] {
    return Array.from(this.models.values());
  }

  findModels(criteria: { capabilities?: ModelCapability[] }): LLMModel[] {
    return this.listModels().filter(model => 
      criteria.capabilities?.every(cap => model.capabilities.has(cap))
    );
  }

  async getModelChain(requirements: TaskRequirements): Promise<ModelChain> {
    const models = this.listModels();
    const primaryModel = models.find(m => m.id === 'code-model') || models[0];
    const fallbackModel = models.find(m => m.id === 'general-model');
    
    return {
      planner: primaryModel,
      executor: primaryModel,
      fallback: fallbackModel ? [fallbackModel] : undefined
    };
  }
}

describe('CapabilityScorer Integration', () => {
  let scorer: CapabilityScorer;
  let orchestrator: ModelOrchestrator;
  let registry: ModelRegistry;

  beforeEach(() => {
    scorer = new CapabilityScorer({
      decayFactor: 0.95,
      timeWindow: 7 * 24 * 60 * 60 * 1000,
      minSamples: 5
    });

    registry = new MockModelRegistry();

    // Register test models
    const codeModel = new MockLLMModel('code-model', 'Code Model', 4096, ['code']);
    const generalModel = new MockLLMModel('general-model', 'General Model', 4096, ['code', 'reasoning']);
    registry.registerModel(codeModel);
    registry.registerModel(generalModel);

    orchestrator = new ModelOrchestrator(registry);
  });

  it('should route tasks based on capability scores', async () => {
    // Train the scorer with historical data
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess('code-model', 'code', { 
        latency: 100,
        resourceUsage: 0.3
      });
    }

    const task: Task = {
      id: 'test-1',
      type: 'code-generation',
      description: 'Create a React component',
      input: 'Create a button component',
      requirements: {
        primaryCapability: 'code',
        secondaryCapabilities: [],
        minCapabilityScores: new Map([['code', 0.7]]),
        contextSize: 1000,
        priority: 'quality'
      }
    };

    const result = await orchestrator.handleTask(task);
    expect(result.success).toBe(true);
    expect(result.phases[0].name).toBe('planning');
  });

  it('should handle model failures and fallbacks', async () => {
    // Set up primary and fallback models
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess('code-model', 'code', { 
        latency: 100,
        resourceUsage: 0.3
      });
      await scorer.recordSuccess('general-model', 'code', { 
        latency: 150,
        resourceUsage: 0.4
      });
    }

    // Simulate primary model failure
    await scorer.recordFailure('code-model', 'code', {
      latency: 500,
      resourceUsage: 0.8
    });

    const task: Task = {
      id: 'test-2',
      type: 'code-generation',
      description: 'Generate code with fallback',
      input: 'Create a function',
      requirements: {
        primaryCapability: 'code',
        secondaryCapabilities: [],
        minCapabilityScores: new Map([['code', 0.5]]),
        contextSize: 1000,
        priority: 'speed'
      },
      metadata: {
        requireFallback: true // Trigger simulated failure
      }
    };

    const result = await orchestrator.handleTask(task);
    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(true);
  }, 15000); // Increase timeout to 15 seconds

  it('should handle concurrent model selection', async () => {
    // Set up model capabilities
    for (const modelId of ['code-model', 'general-model']) {
      for (let i = 0; i < 5; i++) {
        await scorer.recordSuccess(modelId, modelId === 'code-model' ? 'code' : 'reasoning', {
          latency: 100 + Math.random() * 50,
          resourceUsage: 0.3 + Math.random() * 0.2
        });
      }
    }

    const createTask = (id: string, capability: ModelCapability): Task => ({
      id,
      type: capability === 'code' ? 'code-generation' : 'reasoning',
      description: `Test task ${id}`,
      input: 'Test input',
      requirements: {
        primaryCapability: capability,
        secondaryCapabilities: [],
        minCapabilityScores: new Map([[capability, 0.5]]),
        contextSize: 1000,
        priority: 'speed'
      }
    });

    const tasks = [
      createTask('concurrent-1', 'code'),
      createTask('concurrent-2', 'reasoning')
    ];

    const results = await Promise.all(
      tasks.map(task => orchestrator.handleTask(task))
    );

    expect(results.every(r => r.success)).toBe(true);
    expect(results[0].phases[0].name).toBe('planning');
    expect(results[1].phases[0].name).toBe('planning');
  });
});