# GAMA Extension Tutorial

## Overview

This tutorial guides you through extending the GAMA integration in the grym-synth. You'll learn how to add custom functionality, create plugins, and integrate with other systems to enhance GAMA's capabilities.

## Prerequisites

Before starting this tutorial, ensure you:

1. Have completed the [Basic Usage Tutorial](./basic-usage.md) and [Advanced Features Tutorial](./advanced-features.md)
2. Have a working GAMA integration
3. Understand TypeScript/JavaScript and object-oriented programming concepts
4. Are familiar with the GAMA architecture and components

## Extension Points

The GAMA integration provides several extension points:

1. **Custom Processors**: Add custom audio preprocessing and postprocessing
2. **Custom Feature Extractors**: Create specialized feature extraction algorithms
3. **Custom Pattern Matchers**: Implement custom pattern matching algorithms
4. **Custom Error Handlers**: Add specialized error handling strategies
5. **Plugins**: Create modular extensions that can be loaded dynamically

## Creating Custom Processors

### Custom Audio Preprocessor

Create a custom audio preprocessor to enhance audio quality before processing:

```typescript
// src/extensions/processors/EnhancedAudioPreprocessor.ts
import { AudioPreprocessor, SimpleAudioBuffer, PreprocessingOptions } from '@grym-synth/gama-integration';

export class EnhancedAudioPreprocessor extends AudioPreprocessor {
  // Override the process method to add custom preprocessing
  override process(audio: SimpleAudioBuffer, options: PreprocessingOptions = {}): SimpleAudioBuffer {
    // First apply the base preprocessing
    let processedAudio = super.process(audio, options);

    // Then apply custom enhancements
    if (options.enhanceClarity) {
      processedAudio = this.enhanceClarity(processedAudio, options.clarityLevel || 0.5);
    }

    if (options.removeBackground) {
      processedAudio = this.removeBackground(processedAudio, options.backgroundThreshold || 0.1);
    }

    return processedAudio;
  }

  // Custom method to enhance audio clarity
  private enhanceClarity(audio: SimpleAudioBuffer, level: number): SimpleAudioBuffer {
    console.log(`Enhancing clarity with level ${level}`);

    // Create a new buffer for the enhanced audio
    const enhancedData = new Float32Array(audio.data.length);

    // Simple high-frequency boost (basic treble enhancement)
    let prevSample = 0;
    for (let i = 0; i < audio.data.length; i++) {
      // Simple high-pass filter
      const highPass = audio.data[i] - prevSample;

      // Mix original with high-pass filtered signal
      enhancedData[i] = audio.data[i] + (highPass * level);

      // Keep sample for next iteration
      prevSample = audio.data[i];

      // Ensure we don't clip
      if (enhancedData[i] > 1.0) enhancedData[i] = 1.0;
      if (enhancedData[i] < -1.0) enhancedData[i] = -1.0;
    }

    return {
      data: enhancedData,
      channels: audio.channels,
      sampleRate: audio.sampleRate
    };
  }

  // Custom method to remove background noise
  private removeBackground(audio: SimpleAudioBuffer, threshold: number): SimpleAudioBuffer {
    console.log(`Removing background noise with threshold ${threshold}`);

    // Create a new buffer for the processed audio
    const processedData = new Float32Array(audio.data.length);

    // Simple noise gate with smoothing
    const attackTime = 0.01; // 10ms
    const releaseTime = 0.1; // 100ms
    const attackSamples = Math.floor(attackTime * audio.sampleRate);
    const releaseSamples = Math.floor(releaseTime * audio.sampleRate);

    let envelope = 0;

    for (let i = 0; i < audio.data.length; i++) {
      // Calculate signal level (absolute value)
      const level = Math.abs(audio.data[i]);

      // Update envelope with attack/release
      if (level > envelope) {
        // Attack phase
        envelope += (level - envelope) / attackSamples;
      } else {
        // Release phase
        envelope += (level - envelope) / releaseSamples;
      }

      // Apply noise gate
      if (envelope > threshold) {
        // Above threshold - keep signal
        processedData[i] = audio.data[i];
      } else {
        // Below threshold - attenuate signal
        processedData[i] = audio.data[i] * (envelope / threshold);
      }
    }

    return {
      data: processedData,
      channels: audio.channels,
      sampleRate: audio.sampleRate
    };
  }
}
```

### Using Custom Processors

Use your custom processors in a processing pipeline:

```typescript
// src/extensions/pipelines/EnhancedProcessingPipeline.ts
import { GAMAService, SimpleAudioBuffer, ProcessingResult } from '@grym-synth/gama-integration';
import { EnhancedAudioPreprocessor } from '../processors/EnhancedAudioPreprocessor';
import { EnhancedTranscriptionPostprocessor } from '../processors/EnhancedTranscriptionPostprocessor';

export class EnhancedProcessingPipeline {
  private preprocessor: EnhancedAudioPreprocessor;
  private gamaService: GAMAService;
  private postprocessor: EnhancedTranscriptionPostprocessor;

  constructor(gamaService: GAMAService) {
    this.preprocessor = new EnhancedAudioPreprocessor();
    this.gamaService = gamaService;
    this.postprocessor = new EnhancedTranscriptionPostprocessor();
  }

  async process(audio: SimpleAudioBuffer, options: {
    preprocessing?: any;
    gama?: any;
    postprocessing?: any;
  } = {}): Promise<ProcessingResult> {
    console.log('Starting enhanced processing pipeline...');

    // Step 1: Enhanced preprocessing
    console.log('Preprocessing audio with enhanced processor...');
    const preprocessedAudio = this.preprocessor.process(audio, {
      ...options.preprocessing,
      enhanceClarity: true,
      clarityLevel: 0.3,
      removeBackground: true,
      backgroundThreshold: 0.05
    });

    // Step 2: Process with GAMA
    console.log('Processing with GAMA...');
    const gamaResult = await this.gamaService.process(preprocessedAudio, options.gama);

    // Step 3: Enhanced postprocessing
    console.log('Postprocessing transcription with enhanced processor...');
    const postprocessedResult = this.postprocessor.process(gamaResult, {
      ...options.postprocessing,
      correctGrammar: true,
      expandAcronyms: true,
      addSpeakerLabels: true
    });

    console.log('Enhanced processing pipeline complete');

    return postprocessedResult;
  }
}
```

## Creating Custom Feature Extractors

### Custom Feature Extractor

Create a custom feature extractor for specialized use cases:

```typescript
// src/extensions/features/SpecializedFeatureExtractor.ts
import { GAMAService, SimpleAudioBuffer, FeatureExtractor } from '@grym-synth/gama-integration';

export class SpecializedFeatureExtractor implements FeatureExtractor {
  private gamaService: GAMAService;

  constructor(gamaService: GAMAService) {
    this.gamaService = gamaService;
  }

  async extractFeatures(audio: SimpleAudioBuffer, options: any = {}): Promise<Float32Array> {
    console.log('Extracting specialized features...');

    // Extract base features using GAMA
    const baseFeatures = await this.gamaService.extractFeatures(audio);

    // Apply specialized processing
    const specializedFeatures = this.applySpecializedProcessing(baseFeatures, audio, options);

    return specializedFeatures;
  }

  private applySpecializedProcessing(features: Float32Array, audio: SimpleAudioBuffer, options: any): Float32Array {
    console.log('Applying specialized processing...');

    // Extract audio characteristics
    const audioCharacteristics = this.extractAudioCharacteristics(audio);

    // Combine base features with audio characteristics
    const combinedFeatures = this.combineFeatures(features, audioCharacteristics);

    // Apply dimensionality reduction if needed
    if (options.reduceDimensions) {
      return this.reduceDimensions(combinedFeatures, options.targetDimensions || 128);
    }

    return combinedFeatures;
  }

  private extractAudioCharacteristics(audio: SimpleAudioBuffer): Float32Array {
    // Extract basic audio characteristics

    // Calculate RMS (root mean square) energy
    let sumSquared = 0;
    for (let i = 0; i < audio.data.length; i++) {
      sumSquared += audio.data[i] * audio.data[i];
    }
    const rms = Math.sqrt(sumSquared / audio.data.length);

    // Calculate zero-crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < audio.data.length; i++) {
      if ((audio.data[i] >= 0 && audio.data[i - 1] < 0) ||
          (audio.data[i] < 0 && audio.data[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / audio.data.length;

    // Calculate spectral centroid (simplified)
    let spectralCentroid = 0.5; // Placeholder

    // Return characteristics as a feature vector
    return new Float32Array([rms, zcr, spectralCentroid]);
  }

  private combineFeatures(features1: Float32Array, features2: Float32Array): Float32Array {
    // Combine two feature vectors
    const combined = new Float32Array(features1.length + features2.length);

    // Copy features1
    for (let i = 0; i < features1.length; i++) {
      combined[i] = features1[i];
    }

    // Copy features2
    for (let i = 0; i < features2.length; i++) {
      combined[features1.length + i] = features2[i];
    }

    return combined;
  }

  private reduceDimensions(features: Float32Array, targetDimensions: number): Float32Array {
    // Simple dimension reduction by averaging

    if (features.length <= targetDimensions) {
      return features;
    }

    const reducedFeatures = new Float32Array(targetDimensions);
    const blockSize = Math.floor(features.length / targetDimensions);

    for (let i = 0; i < targetDimensions; i++) {
      let sum = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, features.length);

      for (let j = start; j < end; j++) {
        sum += features[j];
      }

      reducedFeatures[i] = sum / (end - start);
    }

    return reducedFeatures;
  }
}
```

## Creating Custom Pattern Matchers

### Custom Pattern Matcher

Create a custom pattern matcher for specialized pattern recognition:

```typescript
// src/extensions/patterns/HybridPatternMatcher.ts
import { PatternMatcher, PatternMatch, FeatureVector } from '@grym-synth/gama-integration';

export class HybridPatternMatcher implements PatternMatcher {
  private patterns: Map<string, FeatureVector> = new Map();
  private metadata: Map<string, any> = new Map();

  async storePattern(features: FeatureVector, metadata: any = {}): Promise<string> {
    const patternId = `pattern-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.patterns.set(patternId, features);
    this.metadata.set(patternId, metadata);
    return patternId;
  }

  async findSimilarPatterns(
    features: FeatureVector,
    options: {
      threshold?: number;
      maxResults?: number;
      weights?: number[];
      algorithm?: 'cosine' | 'euclidean' | 'hybrid';
    } = {}
  ): Promise<PatternMatch[]> {
    const {
      threshold = 0.8,
      maxResults = 5,
      weights,
      algorithm = 'hybrid'
    } = options;

    const results: PatternMatch[] = [];

    // Calculate similarity for each stored pattern
    for (const [id, storedFeatures] of this.patterns.entries()) {
      let similarity: number;

      // Choose similarity algorithm
      switch (algorithm) {
        case 'cosine':
          similarity = this.calculateCosineSimilarity(features, storedFeatures, weights);
          break;
        case 'euclidean':
          similarity = this.calculateEuclideanSimilarity(features, storedFeatures, weights);
          break;
        case 'hybrid':
        default:
          // Hybrid approach: combine cosine and euclidean
          const cosineSim = this.calculateCosineSimilarity(features, storedFeatures, weights);
          const euclideanSim = this.calculateEuclideanSimilarity(features, storedFeatures, weights);
          similarity = (cosineSim + euclideanSim) / 2;
          break;
      }

      if (similarity >= threshold) {
        results.push({
          id,
          similarity,
          metadata: this.metadata.get(id) || {}
        });
      }
    }

    // Sort by similarity (descending) and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  private calculateCosineSimilarity(
    a: FeatureVector,
    b: FeatureVector,
    weights?: number[]
  ): number {
    if (a.length !== b.length) {
      throw new Error('Feature vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const weight = weights ? weights[i] : 1;
      dotProduct += a[i] * b[i] * weight;
      normA += a[i] * a[i] * weight;
      normB += b[i] * b[i] * weight;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateEuclideanSimilarity(
    a: FeatureVector,
    b: FeatureVector,
    weights?: number[]
  ): number {
    if (a.length !== b.length) {
      throw new Error('Feature vectors must have the same length');
    }

    let sumSquaredDiff = 0;

    for (let i = 0; i < a.length; i++) {
      const weight = weights ? weights[i] : 1;
      const diff = a[i] - b[i];
      sumSquaredDiff += diff * diff * weight;
    }

    const distance = Math.sqrt(sumSquaredDiff);
    const maxDistance = Math.sqrt(a.length * 4); // Assuming normalized features in [-1, 1]

    return 1 - (distance / maxDistance);
  }
}
```

## Creating Custom Error Handlers

### Custom Error Recovery Strategy

Create a custom error recovery strategy:

```typescript
// src/extensions/errors/AdaptiveRetryStrategy.ts
import { RecoveryStrategy, ErrorContext } from '@grym-synth/gama-integration';

export class AdaptiveRetryStrategy implements RecoveryStrategy {
  name = 'adaptive-retry';

  private config: {
    initialMaxRetries: number;
    backoffFactor: number;
    initialDelayMs: number;
    maxDelayMs: number;
    resetThresholdMs: number;
  };

  private errorHistory: Map<string, {
    count: number;
    lastTime: number;
    currentMaxRetries: number;
  }> = new Map();

  constructor(config: {
    initialMaxRetries?: number;
    backoffFactor?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    resetThresholdMs?: number;
  } = {}) {
    this.config = {
      initialMaxRetries: config.initialMaxRetries || 3,
      backoffFactor: config.backoffFactor || 1.5,
      initialDelayMs: config.initialDelayMs || 1000,
      maxDelayMs: config.maxDelayMs || 30000,
      resetThresholdMs: config.resetThresholdMs || 3600000 // 1 hour
    };
  }

  async execute(context: ErrorContext): Promise<any> {
    const operationKey = this.getOperationKey(context);

    // Get or initialize error history for this operation
    let history = this.errorHistory.get(operationKey);
    if (!history) {
      history = {
        count: 0,
        lastTime: 0,
        currentMaxRetries: this.config.initialMaxRetries
      };
      this.errorHistory.set(operationKey, history);
    }

    // Check if we should reset the error count
    const now = Date.now();
    if (now - history.lastTime > this.config.resetThresholdMs) {
      history.count = 0;
      history.currentMaxRetries = this.config.initialMaxRetries;
    }

    // Update history
    history.count++;
    history.lastTime = now;

    // Check if we've exceeded the maximum retries
    if (history.count > history.currentMaxRetries) {
      // Increase max retries for next time
      history.currentMaxRetries = Math.min(history.currentMaxRetries * 2, 10);

      console.log(`Adaptive retry: Max retries (${history.currentMaxRetries}) exceeded for ${operationKey}`);
      throw new Error(`Max retries exceeded for ${operationKey}`);
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffFactor, history.count - 1),
      this.config.maxDelayMs
    );

    console.log(`Adaptive retry: Attempt ${history.count}/${history.currentMaxRetries} for ${operationKey}, waiting ${delay}ms`);

    // Wait for the backoff period
    await new Promise(resolve => setTimeout(resolve, delay));

    // Attempt to execute the operation again
    try {
      const result = await context.operation(context.params);

      // Success - reduce error count
      history.count = Math.max(0, history.count - 2);

      return result;
    } catch (error) {
      // If this is the last attempt, throw the error
      if (history.count >= history.currentMaxRetries) {
        throw error;
      }

      // Otherwise, retry again
      return this.execute(context);
    }
  }

  private getOperationKey(context: ErrorContext): string {
    // Create a unique key for the operation
    const operation = context.operationName || 'unknown';

    // Include relevant parameters in the key
    let paramKey = '';
    if (context.params && context.params.audio) {
      paramKey = `-${context.params.audio.data.length}`;
    }

    return `${operation}${paramKey}`;
  }
}
```

## Creating Plugins

### Plugin System

Create a plugin system for GAMA:

```typescript
// src/extensions/plugins/GAMAPlugin.ts
import { GAMAService } from '@grym-synth/gama-integration';

// Plugin interface
export interface GAMAPlugin {
  name: string;
  version: string;
  description: string;
  initialize(gamaService: GAMAService): Promise<void>;
  shutdown(): Promise<void>;
}

// Plugin manager
export class GAMAPluginManager {
  private plugins: Map<string, GAMAPlugin> = new Map();
  private gamaService: GAMAService;

  constructor(gamaService: GAMAService) {
    this.gamaService = gamaService;
  }

  async registerPlugin(plugin: GAMAPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    console.log(`Registering plugin: ${plugin.name} v${plugin.version}`);
    this.plugins.set(plugin.name, plugin);

    // Initialize the plugin
    await plugin.initialize(this.gamaService);
  }

  async unregisterPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} is not registered`);
    }

    console.log(`Unregistering plugin: ${plugin.name}`);

    // Shutdown the plugin
    await plugin.shutdown();

    // Remove from plugins map
    this.plugins.delete(pluginName);
  }

  getPlugin(pluginName: string): GAMAPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  getPlugins(): GAMAPlugin[] {
    return Array.from(this.plugins.values());
  }

  async shutdownAllPlugins(): Promise<void> {
    console.log('Shutting down all plugins...');

    for (const plugin of this.plugins.values()) {
      await plugin.shutdown();
    }

    this.plugins.clear();
  }
}
```

### Example Plugin

Create an example plugin:

```typescript
// src/extensions/plugins/MetricsPlugin.ts
import { GAMAPlugin } from './GAMAPlugin';
import { GAMAService, SimpleAudioBuffer } from '@grym-synth/gama-integration';

export class MetricsPlugin implements GAMAPlugin {
  name = 'metrics-plugin';
  version = '1.0.0';
  description = 'Collects and reports metrics for GAMA operations';

  private gamaService: GAMAService;
  private originalProcess: any;
  private originalExtractFeatures: any;
  private metrics: {
    processCount: number;
    extractFeaturesCount: number;
    totalProcessingTime: number;
    totalExtractionTime: number;
    errors: number;
  } = {
    processCount: 0,
    extractFeaturesCount: 0,
    totalProcessingTime: 0,
    totalExtractionTime: 0,
    errors: 0
  };

  async initialize(gamaService: GAMAService): Promise<void> {
    console.log('Initializing Metrics Plugin...');
    this.gamaService = gamaService;

    // Store original methods
    this.originalProcess = gamaService.process;
    this.originalExtractFeatures = gamaService.extractFeatures;

    // Override methods to collect metrics
    gamaService.process = this.processWithMetrics.bind(this);
    gamaService.extractFeatures = this.extractFeaturesWithMetrics.bind(this);

    console.log('Metrics Plugin initialized');
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Metrics Plugin...');

    // Restore original methods
    if (this.gamaService) {
      this.gamaService.process = this.originalProcess;
      this.gamaService.extractFeatures = this.originalExtractFeatures;
    }

    console.log('Metrics Plugin shut down');
  }

  private async processWithMetrics(audio: SimpleAudioBuffer, options?: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Call original method
      const result = await this.originalProcess.call(this.gamaService, audio, options);

      // Update metrics
      this.metrics.processCount++;
      this.metrics.totalProcessingTime += Date.now() - startTime;

      return result;
    } catch (error) {
      // Update error count
      this.metrics.errors++;
      throw error;
    }
  }

  private async extractFeaturesWithMetrics(audio: SimpleAudioBuffer, options?: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Call original method
      const result = await this.originalExtractFeatures.call(this.gamaService, audio, options);

      // Update metrics
      this.metrics.extractFeaturesCount++;
      this.metrics.totalExtractionTime += Date.now() - startTime;

      return result;
    } catch (error) {
      // Update error count
      this.metrics.errors++;
      throw error;
    }
  }

  // Method to get metrics
  getMetrics(): any {
    return {
      ...this.metrics,
      averageProcessingTime: this.metrics.processCount > 0
        ? this.metrics.totalProcessingTime / this.metrics.processCount
        : 0,
      averageExtractionTime: this.metrics.extractFeaturesCount > 0
        ? this.metrics.totalExtractionTime / this.metrics.extractFeaturesCount
        : 0
    };
  }
}
```

## Conclusion

This tutorial covered how to extend the GAMA integration with custom functionality. You've learned how to:

1. Create custom audio processors for enhanced preprocessing and postprocessing
2. Implement specialized feature extractors for domain-specific applications
3. Develop custom pattern matchers with advanced similarity algorithms
4. Build robust error handling strategies for improved reliability
5. Create plugins to extend GAMA's functionality in a modular way

By leveraging these extension points, you can customize GAMA to meet your specific requirements and integrate it with other systems in your application.

## Next Steps

- Review the [API Reference](../technical/api-reference.md) for detailed information about the GAMA API
- Explore the [GAMA Architecture](../technical/gama-architecture.md) to understand how the components fit together
- Check the [Performance Tuning Guide](../operations/performance-tuning.md) for optimizing your extensions

