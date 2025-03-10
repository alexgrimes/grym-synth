import { CapabilityScorer } from '../capability-scorer';

describe('CapabilityScorer', () => {
  let scorer: CapabilityScorer;

  beforeEach(() => {
    scorer = new CapabilityScorer({
      decayFactor: 0.95,
      timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
      minSamples: 5,
      weightFactors: {
        successRate: 0.5,
        latency: 0.3,
        resourceUsage: 0.2
      }
    });
  });

  it('should update capability scores based on performance', async () => {
    const modelId = 'test-model';
    
    // Record multiple successes to meet minSamples
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess(modelId, 'code-generation', { 
        latency: 100,
        resourceUsage: 0.3
      });
    }

    const score = await scorer.getCapabilityScore(modelId, 'code-generation');
    expect(score).toBeGreaterThan(0.5);
  });

  it('should adjust scores with historical decay', async () => {
    const modelId = 'test-model';
    
    // Add historical data
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess(modelId, 'reasoning', { 
        latency: 150,
        resourceUsage: 0.4
      });
    }

    const initialScore = await scorer.getCapabilityScore(modelId, 'reasoning');
    
    // Mock time passing (7 days)
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const decayedScore = await scorer.getCapabilityScore(modelId, 'reasoning');
    expect(decayedScore).toBeLessThan(initialScore);

    jest.useRealTimers();
  });

  it('should handle multiple capabilities for a model', async () => {
    const modelId = 'multi-model';
    
    // Record data for multiple capabilities
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess(modelId, 'code-generation', { 
        latency: 100,
        resourceUsage: 0.3
      });
      await scorer.recordSuccess(modelId, 'reasoning', { 
        latency: 150,
        resourceUsage: 0.4
      });
    }

    const modelScores = await scorer.getModelScores(modelId);
    expect(modelScores.capabilities.size).toBe(2);
    expect(modelScores.capabilities.get('code-generation')).toBeGreaterThan(0);
    expect(modelScores.capabilities.get('reasoning')).toBeGreaterThan(0);
  });

  it('should calculate performance metrics correctly', async () => {
    const modelId = 'perf-model';
    
    // Record mix of successes and failures
    for (let i = 0; i < 4; i++) {
      await scorer.recordSuccess(modelId, 'analysis', { 
        latency: 100,
        resourceUsage: 0.3
      });
    }
    await scorer.recordFailure(modelId, 'analysis', { 
      latency: 200,
      resourceUsage: 0.5
    });

    const modelScores = await scorer.getModelScores(modelId);
    expect(modelScores.performanceMetrics.successRate).toBe(0.8); // 4/5 success rate
    expect(modelScores.performanceMetrics.latency).toBeGreaterThan(0);
    expect(modelScores.performanceMetrics.resourceUsage).toBeGreaterThan(0);
  });

  it('should require minimum samples before providing scores', async () => {
    const modelId = 'new-model';
    
    // Record fewer than minSamples
    for (let i = 0; i < 3; i++) {
      await scorer.recordSuccess(modelId, 'translation', { 
        latency: 100,
        resourceUsage: 0.3
      });
    }

    const score = await scorer.getCapabilityScore(modelId, 'translation');
    expect(score).toBe(0);
  });

  it('should handle high latency appropriately', async () => {
    const modelId = 'slow-model';
    
    // Record high latency operations
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess(modelId, 'heavy-task', { 
        latency: 900, // Near the 1000ms threshold
        resourceUsage: 0.3
      });
    }

    const score = await scorer.getCapabilityScore(modelId, 'heavy-task');
    const modelScores = await scorer.getModelScores(modelId);
    
    // Score should be lower due to high latency
    expect(score).toBeLessThan(0.5);
    expect(modelScores.performanceMetrics.latency).toBeGreaterThan(800);
  });

  it('should handle resource usage appropriately', async () => {
    const modelId = 'resource-heavy-model';
    
    // Record high resource usage operations
    for (let i = 0; i < 5; i++) {
      await scorer.recordSuccess(modelId, 'memory-intensive', { 
        latency: 100,
        resourceUsage: 0.9 // High resource usage
      });
    }

    const score = await scorer.getCapabilityScore(modelId, 'memory-intensive');
    const modelScores = await scorer.getModelScores(modelId);
    
    // Score should be lower due to high resource usage
    expect(score).toBeLessThan(0.5);
    expect(modelScores.performanceMetrics.resourceUsage).toBeGreaterThan(0.8);
  });
});