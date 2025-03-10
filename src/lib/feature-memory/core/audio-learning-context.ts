import { FeatureMemorySystem } from './feature-memory-system';
import { Pattern, StorageOperationResult, ValidationResult, SearchCriteria, PatternMetadata } from './types';

export interface AudioPattern extends Pattern {
  features: Map<string, string | number[]>;
  metadata: PatternMetadata & {
    timestamp: string;
    frequency: number;
    duration: number;
  };
}

export interface KnowledgeBase {
  patterns: Map<string, AudioPattern>;
  relationshipGraph: Map<string, Set<string>>;
  confidenceScores: Map<string, number>;
}

export interface LearningMetrics {
  totalPatternsLearned: number;
  averageConfidence: number;
  recognitionRate: number;
  lastUpdated: string;
}

export interface LearningContext {
  patterns: AudioPattern[];
  knowledgeBase: KnowledgeBase;
  learningProgress: LearningMetrics;
}

export class AudioLearningManager {
  private featureMemory: FeatureMemorySystem;
  private context: LearningContext;

  constructor(featureMemory: FeatureMemorySystem) {
    this.featureMemory = featureMemory;
    this.context = this.initializeContext();
  }

  private initializeContext(): LearningContext {
    return {
      patterns: [],
      knowledgeBase: {
        patterns: new Map(),
        relationshipGraph: new Map(),
        confidenceScores: new Map()
      },
      learningProgress: {
        totalPatternsLearned: 0,
        averageConfidence: 0,
        recognitionRate: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  async preserveContext(modelId: string): Promise<StorageOperationResult<ValidationResult>> {
    const contextPattern: Pattern = {
      id: `${modelId}:context`,
      features: new Map<string, string>([
        ['type', 'learning_context'],
        ['modelId', modelId],
        ['context', JSON.stringify(this.context)]
      ]),
      confidence: 1,
      timestamp: new Date(),
      metadata: {
        source: 'audio_learning_manager',
        category: 'context',
        frequency: 1,
        lastUpdated: new Date()
      }
    };

    const result = await this.featureMemory.storePattern(contextPattern);
    this.updateLearningMetrics();
    return result;
  }

  async retrieveContext(modelId: string): Promise<LearningContext> {
    const searchCriteria: SearchCriteria = {
      metadata: {
        category: 'context',
        source: 'audio_learning_manager'
      },
      features: new Map<string, string>([['type', 'learning_context'], ['modelId', modelId]])
    };

    const result = await this.featureMemory.searchPatterns(searchCriteria);
    if (result.data && result.data.length > 0) {
      const contextData = result.data[0].features.get('context');
      if (contextData) {
        this.context = JSON.parse(contextData) as LearningContext;
      }
    }
    return this.context;
  }

  async accumulatePattern(fftData: Float32Array, metadata: Omit<AudioPattern['metadata'], 'lastUpdated' | 'category'>): Promise<void> {
    const pattern: AudioPattern = {
      id: `pattern_${Date.now()}`,
      features: new Map<string, string | number[]>([
        ['type', 'audio_pattern'],
        ['fftData', Array.from(fftData)]
      ]),
      confidence: 1,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        category: 'audio_pattern',
        lastUpdated: new Date()
      }
    };

    const result = await this.featureMemory.storePattern(pattern);
    if (result.success) {
      this.context.knowledgeBase.patterns.set(pattern.id, pattern);
      this.context.knowledgeBase.confidenceScores.set(pattern.id, pattern.confidence);
      this.context.patterns.push(pattern);

      this.updateLearningMetrics();
    }
  }

  async recognizePattern(fftData: Float32Array): Promise<AudioPattern | null> {
    const features = new Map<string, string | number[]>([
      ['type', 'audio_pattern'],
      ['fftData', Array.from(fftData)]
    ]);

    const result = await this.featureMemory.recognizePattern(features);
    
    if (result.matches && result.matches.length > 0) {
      const matchedPattern = result.matches[0];
      const matchedAudioPattern = this.context.knowledgeBase.patterns.get(matchedPattern.id);

      if (matchedAudioPattern) {
        this.context.learningProgress.recognitionRate = 
          (this.context.learningProgress.recognitionRate + 1) / 2;
        return matchedAudioPattern;
      }
    }

    return null;
  }

  private updateLearningMetrics(): void {
    const scores = Array.from(this.context.knowledgeBase.confidenceScores.values());
    
    this.context.learningProgress = {
      totalPatternsLearned: this.context.patterns.length,
      averageConfidence: scores.reduce((a, b) => a + b, 0) / scores.length || 0,
      recognitionRate: this.context.learningProgress.recognitionRate,
      lastUpdated: new Date().toISOString()
    };
  }

  getContext(): LearningContext {
    return this.context;
  }

  getLearningProgress(): LearningMetrics {
    return this.context.learningProgress;
  }
}