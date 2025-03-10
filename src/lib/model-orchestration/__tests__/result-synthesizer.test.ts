import { ResultSynthesizer, ModelResult } from '../types';

describe('ResultSynthesizer', () => {
  let synthesizer: ResultSynthesizer;

  beforeEach(() => {
    synthesizer = {
      combine: jest.fn(),
      validate: jest.fn(),
      format: jest.fn()
    };
  });

  it('should combine successful results', async () => {
    const result1: ModelResult = {
      success: true,
      output: 'test-output-1',
      phase: 'execution',
      phases: [{
        name: 'execution',
        status: 'completed',
        result: {
          success: true,
          output: 'test-output-1',
          metrics: {
            executionTime: 100,
            memoryUsed: 200,
            tokensUsed: 300
          }
        }
      }],
      metrics: {
        executionTime: 100,
        memoryUsed: 200,
        tokensUsed: 300
      }
    };

    const result2: ModelResult = {
      success: true,
      output: 'test-output-2',
      phase: 'execution',
      phases: [{
        name: 'execution',
        status: 'completed',
        result: {
          success: true,
          output: 'test-output-2',
          metrics: {
            executionTime: 150,
            memoryUsed: 250,
            tokensUsed: 350
          }
        }
      }],
      metrics: {
        executionTime: 150,
        memoryUsed: 250,
        tokensUsed: 350
      }
    };

    const combinedResult = {
      success: true,
      output: ['test-output-1', 'test-output-2'],
      phases: [
        {
          name: 'execution',
          status: 'completed',
          result: result1
        },
        {
          name: 'execution',
          status: 'completed',
          result: result2
        }
      ],
      metrics: {
        totalExecutionTime: 250,
        totalMemoryUsed: 450,
        totalTokensUsed: 650
      }
    };

    (synthesizer.combine as jest.Mock).mockResolvedValue(combinedResult);
    (synthesizer.validate as jest.Mock).mockReturnValue(true);

    const result = await synthesizer.combine([result1, result2]);

    expect(result).toEqual(combinedResult);
    expect(result.metrics.totalExecutionTime).toBe(250);
    expect(result.metrics.totalMemoryUsed).toBe(450);
    expect(result.metrics.totalTokensUsed).toBe(650);
  });

  it('should handle failed results', async () => {
    const result1: ModelResult = {
      success: true,
      output: 'test-output-1',
      phase: 'execution',
      phases: [{
        name: 'execution',
        status: 'completed',
        result: {
          success: true,
          output: 'test-output-1',
          metrics: {
            executionTime: 100,
            memoryUsed: 200,
            tokensUsed: 300
          }
        }
      }],
      metrics: {
        executionTime: 100,
        memoryUsed: 200,
        tokensUsed: 300
      }
    };

    const result2: ModelResult = {
      success: false,
      output: 'error-output',
      phase: 'execution',
      phases: [{
        name: 'execution',
        status: 'failed',
        result: {
          success: false,
          output: 'error-output',
          metrics: {
            executionTime: 50,
            memoryUsed: 100,
            tokensUsed: 150
          }
        }
      }],
      metrics: {
        executionTime: 50,
        memoryUsed: 100,
        tokensUsed: 150
      }
    };

    const combinedResult = {
      success: false,
      output: ['test-output-1', 'error-output'],
      phases: [
        {
          name: 'execution',
          status: 'completed',
          result: result1
        },
        {
          name: 'execution',
          status: 'failed',
          result: result2
        }
      ],
      metrics: {
        totalExecutionTime: 150,
        totalMemoryUsed: 300,
        totalTokensUsed: 450
      }
    };

    (synthesizer.combine as jest.Mock).mockResolvedValue(combinedResult);
    (synthesizer.validate as jest.Mock).mockReturnValue(true);

    const result = await synthesizer.combine([result1, result2]);

    expect(result).toEqual(combinedResult);
    expect(result.success).toBe(false);
    expect(result.phases.some(p => p.status === 'failed')).toBe(true);
  });
});