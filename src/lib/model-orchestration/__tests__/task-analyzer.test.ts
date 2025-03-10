import { TaskAnalyzer, ModelRegistry, LLMModel, Task, TaskRequirements, ModelChain } from '../types';
import { createTestTask, createMockModel } from './test-helpers';
import TaskAnalyzerImpl from '../task-analyzer';

describe('TaskAnalyzer', () => {
  let analyzer: TaskAnalyzer;
  let mockRegistry: ModelRegistry;

  beforeEach(() => {
    mockRegistry = {
      findModels: jest.fn(),
      getModel: jest.fn(),
      listModels: jest.fn(),
      registerModel: jest.fn(),
      unregisterModel: jest.fn(),
      getModelChain: jest.fn().mockImplementation(async (requirements: TaskRequirements) => ({
        planner: createMockModel({
          id: 'test-planner',
          name: 'Test Planner',
          capabilities: { reasoning: 0.9 }
        }),
        executor: createMockModel({
          id: 'test-executor',
          name: 'Test Executor',
          capabilities: { [requirements.primaryCapability]: 0.9 }
        }),
        ...(requirements.priority === 'quality' && {
          reviewer: createMockModel({
            id: 'test-reviewer',
            name: 'Test Reviewer',
            capabilities: { analysis: 0.9 }
          })
        })
      }))
    };

    analyzer = new TaskAnalyzerImpl();
  });

  it('should infer capabilities from task type', async () => {
    const task = createTestTask('architecture');
    const requirements = await analyzer.analyze(task);

    expect(requirements.primaryCapability).toBe('reasoning');
    expect(requirements.secondaryCapabilities).toContain('analysis');
    expect(requirements.secondaryCapabilities).toContain('code');
    expect(requirements.contextSize).toBeGreaterThan(4000);
  });

  it('should adjust context size based on task complexity', async () => {
    const smallTask = createTestTask('code_generation');
    const largeTask = {
      ...createTestTask('architecture'),
      input: { largeData: 'x'.repeat(10000) }
    };

    const smallReqs = await analyzer.analyze(smallTask);
    const largeReqs = await analyzer.analyze(largeTask);

    expect(largeReqs.contextSize).toBeGreaterThan(smallReqs.contextSize);
  });

  it('should handle invalid task types', async () => {
    const task = createTestTask('invalid_type');
    const requirements = await analyzer.analyze(task);
    
    expect(requirements.primaryCapability).toBe('reasoning');
  });

  it('should validate requirements', () => {
    const validReqs: TaskRequirements = {
      primaryCapability: 'reasoning',
      secondaryCapabilities: ['analysis'],
      minCapabilityScores: new Map([['reasoning', 0.8]]),
      contextSize: 4000,
      priority: 'quality'
    };

    expect(analyzer.validateRequirements(validReqs)).toBe(true);
  });

  it('should handle resource constraints', async () => {
    const task = createTestTask('code_generation', 'efficiency', {
      resourceConstraints: {
        maxMemory: 1000,
        maxCpu: 0.8,
        maxLatency: 200
      }
    });

    const requirements = await analyzer.analyze(task);

    expect(requirements.resourceConstraints).toBeDefined();
    expect(requirements.resourceConstraints!.maxMemory).toBe(1000);
    expect(requirements.resourceConstraints!.maxCpu).toBe(0.8);
    expect(requirements.resourceConstraints!.maxLatency).toBe(200);
  });
});