import { ModelOrchestrator } from '../model-orchestrator';
import { ModelRegistry, LLMModel, Task, TaskRequirements, ModelChain } from '../types';
import { createTestTask, createMockModel, createMockModelChain } from './test-helpers';

describe('ModelOrchestrator', () => {
  let orchestrator: ModelOrchestrator;
  let mockRegistry: ModelRegistry;

  beforeEach(() => {
    mockRegistry = {
      registerModel: jest.fn(),
      unregisterModel: jest.fn(),
      getModel: jest.fn(),
      listModels: jest.fn(),
      findModels: jest.fn(),
      getModelChain: jest.fn().mockImplementation(async (requirements: TaskRequirements) => {
        return createMockModelChain({
          plannerCapabilities: { reasoning: 0.9 },
          executorCapabilities: { [requirements.primaryCapability]: 0.9 },
          ...(requirements.priority === 'quality' && {
            reviewerCapabilities: { analysis: 0.9 }
          })
        });
      })
    };

    orchestrator = new ModelOrchestrator(mockRegistry);
  });

  it('should execute task through model chain', async () => {
    const task = createTestTask('test_task', 'quality', {
      primaryCapability: 'code',
      secondaryCapabilities: ['reasoning']
    });

    const result = await orchestrator.handleTask(task);

    expect(result.success).toBe(true);
    expect(result.phases).toHaveLength(3); // planning, execution, review
    expect(result.phases[0].name).toBe('planning');
    expect(result.phases[1].name).toBe('execution');
    expect(result.phases[2].name).toBe('review');
    expect(result.metrics).toBeDefined();
  });

  it('should handle task without review for speed priority', async () => {
    const task = createTestTask('test_task', 'speed', {
      primaryCapability: 'code'
    });

    const result = await orchestrator.handleTask(task);

    expect(result.success).toBe(true);
    expect(result.phases).toHaveLength(2); // planning and execution only
    expect(result.phases[0].name).toBe('planning');
    expect(result.phases[1].name).toBe('execution');
  });

  it('should handle task failure', async () => {
    const failingModel = createMockModel({
      id: 'failing-model',
      name: 'Failing Model',
      capabilities: { code: 0.9 },
      mockProcess: async () => {
        throw new Error('Simulated failure');
      }
    });

    mockRegistry.getModelChain = jest.fn().mockResolvedValue({
      planner: failingModel,
      executor: failingModel
    });

    const task = createTestTask('test_task', 'speed', {
      primaryCapability: 'code'
    });

    await expect(orchestrator.handleTask(task)).rejects.toThrow();
  });

  it('should retry failed operations', async () => {
    let attempts = 0;
    const retriableModel = createMockModel({
      id: 'retriable-model',
      name: 'Retriable Model',
      capabilities: { code: 0.9 },
      mockProcess: async () => {
        if (attempts++ < 2) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      }
    });

    mockRegistry.getModelChain = jest.fn().mockResolvedValue({
      planner: retriableModel,
      executor: retriableModel
    });

    const task = createTestTask('test_task', 'speed', {
      primaryCapability: 'code'
    });

    const result = await orchestrator.handleTask(task);
    expect(result.success).toBe(true);
    expect(attempts).toBeGreaterThan(1);
  });

  it('should aggregate metrics from all phases', async () => {
    const task = createTestTask('test_task', 'quality', {
      primaryCapability: 'code'
    });

    const result = await orchestrator.handleTask(task);

    expect(result.metrics).toEqual(expect.objectContaining({
      executionTime: expect.any(Number),
      memoryUsed: expect.any(Number),
      tokensUsed: expect.any(Number),
      totalExecutionTime: expect.any(Number),
      totalMemoryUsed: expect.any(Number),
      totalTokensUsed: expect.any(Number),
      peakMemoryUsage: expect.any(Number)
    }));

    expect(result.metrics.totalExecutionTime).toBeGreaterThan(0);
    expect(result.metrics.totalMemoryUsed).toBeGreaterThan(0);
    expect(result.metrics.totalTokensUsed).toBeGreaterThan(0);
  });

  it('should handle context initialization when needed', async () => {
    const task = createTestTask('test_task', 'quality', {
      primaryCapability: 'code',
      contextSize: 8000
    });

    mockRegistry.getModelChain = jest.fn().mockImplementation(async () => {
      return createMockModelChain({
        plannerCapabilities: { reasoning: 0.9 },
        executorCapabilities: { code: 0.9 },
        reviewerCapabilities: { analysis: 0.9 },
        contextCapabilities: { context: 0.9 }
      });
    });

    const result = await orchestrator.handleTask(task);

    expect(result.success).toBe(true);
    expect(result.phases).toHaveLength(4); // planning, context, execution, review
    expect(result.phases[0].name).toBe('planning');
    expect(result.phases[1].name).toBe('context');
    expect(result.phases[2].name).toBe('execution');
    expect(result.phases[3].name).toBe('review');
  });
});