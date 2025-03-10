import { HybridImportanceScorer } from './hybrid-importance-scorer';
import { Message, MLModel, LearningProfile } from './types';

// Mock MLModel implementation
class MockMLModel implements MLModel {
  private confidence = 0.8;
  private predictions = new Map<string, number>();

  async predict(features: number[]): Promise<number> {
    return 0.7; // Default prediction
  }

  async update(params: { features: number[]; label: number; learningRate: number }): Promise<void> {
    // Simulate model update
  }

  async getConfidence(): Promise<number> {
    return this.confidence;
  }

  setConfidence(value: number): void {
    this.confidence = value;
  }
}

// Mock LearningProfile implementation
class MockLearningProfile implements LearningProfile {
  private accuracy = 0.85;
  private learningRate = 0.1;

  async updateFromFeedback(feedback: {
    prediction: number;
    actual: number;
    features: number[];
  }): Promise<void> {
    // Simulate learning update
  }

  async getPerformanceMetrics(): Promise<{
    accuracy: number;
    confidence: number;
    learningRate: number;
  }> {
    return {
      accuracy: this.accuracy,
      confidence: 0.8,
      learningRate: this.learningRate
    };
  }
}

describe('HybridImportanceScorer', () => {
  const mockMessage: Message = {
    id: 'test-1',
    content: 'Test message content',
    timestamp: new Date(),
    references: ['ref-1', 'ref-2'],
    hasResponse: true,
    participantCount: 3
  };

  const defaultConfig = {
    weights: {
      recency: 0.2,
      relevance: 0.2,
      interaction: 0.2,
      complexity: 0.1,
      theme: 0.2,
      keyTerms: 0.1
    },
    mlModel: new MockMLModel(),
    learningProfile: new MockLearningProfile(),
    initialMLWeight: 0.3,
    adaptationRate: 0.1,
    minConfidence: 0.4
  };

  it('should calculate hybrid importance score', async () => {
    const scorer = new HybridImportanceScorer(defaultConfig);
    const scores = await scorer.calculateImportance([mockMessage], 'test context');

    expect(scores).toHaveLength(1);
    expect(scores[0].mlScore).toBeDefined();
    expect(scores[0].confidence).toBeDefined();
    expect(scores[0].finalScore).toBeGreaterThanOrEqual(0);
    expect(scores[0].finalScore).toBeLessThanOrEqual(1);
  });

  it('should adapt weights based on confidence', async () => {
    const mlModel = new MockMLModel();
    const scorer = new HybridImportanceScorer({
      ...defaultConfig,
      mlModel
    });

    // Test with high confidence
    mlModel.setConfidence(0.9);
    let scores = await scorer.calculateImportance([mockMessage], 'test context');
    const highConfidenceWeight = scores[0].mlScore!;

    // Test with low confidence
    mlModel.setConfidence(0.3);
    scores = await scorer.calculateImportance([mockMessage], 'test context');
    const lowConfidenceWeight = scores[0].mlScore!;

    expect(highConfidenceWeight).toBeGreaterThan(lowConfidenceWeight);
  });

  it('should handle feedback and update model', async () => {
    const scorer = new HybridImportanceScorer(defaultConfig);
    const feedback = {
      messageId: mockMessage.id,
      userScore: 0.8,
      actualImportance: 0.9
    };

    await expect(scorer.provideFeedback(feedback)).resolves.not.toThrow();
  });

  it('should maintain base scoring functionality', async () => {
    const scorer = new HybridImportanceScorer(defaultConfig);
    const scores = await scorer.calculateImportance([mockMessage], 'test context');

    // Check that base scores are still calculated
    expect(scores[0].scores.recency).toBeDefined();
    expect(scores[0].scores.relevance).toBeDefined();
    expect(scores[0].scores.interaction).toBeDefined();
    expect(scores[0].scores.complexity).toBeDefined();
    expect(scores[0].scores.theme).toBeDefined();
    expect(scores[0].scores.keyTerms).toBeDefined();
  });

  it('should respect minimum confidence threshold', async () => {
    const mlModel = new MockMLModel();
    const scorer = new HybridImportanceScorer({
      ...defaultConfig,
      mlModel,
      minConfidence: 0.6
    });

    mlModel.setConfidence(0.5); // Below threshold
    const scores = await scorer.calculateImportance([mockMessage], 'test context');

    // Expect ML influence to be reduced
    expect(scores[0].confidence).toBeLessThan(0.6);
  });

  it('should handle missing message data gracefully', async () => {
    const incompleteMessage: Message = {
      id: 'test-2',
      content: 'Incomplete message',
      timestamp: new Date()
    };

    const scorer = new HybridImportanceScorer(defaultConfig);
    const scores = await scorer.calculateImportance([incompleteMessage], 'test context');

    expect(scores).toHaveLength(1);
    expect(scores[0].finalScore).toBeDefined();
    expect(scores[0].mlScore).toBeDefined();
  });
});