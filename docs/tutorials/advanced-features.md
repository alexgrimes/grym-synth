# GAMA Advanced Features Tutorial

## Overview

This tutorial explores advanced features and customization options for the GAMA integration in the grym-synth. Building on the [Basic Usage Tutorial](./basic-usage.md), we'll dive deeper into advanced configuration, optimization techniques, custom processing pipelines, and integration with other systems.

## Prerequisites

Before starting this tutorial, ensure you:

1. Have completed the [Basic Usage Tutorial](./basic-usage.md)
2. Have a working GAMA integration
3. Understand TypeScript/JavaScript and async/await
4. Have basic knowledge of audio processing concepts

## Advanced Configuration

### Fine-Tuning GAMA Parameters

GAMA offers numerous configuration options to fine-tune its behavior:

```typescript
// Advanced configuration
const advancedConfig = {
  id: 'gama-advanced',
  modelPath: 'models/gama',
  maxMemory: '8GB',
  device: 'cuda',  // Use GPU if available
  quantization: '8bit',

  // Logging configuration
  logConfig: {
    level: 'debug',  // 'debug', 'info', 'warn', 'error'
    file: 'logs/gama.log',
    console: true,
    format: 'json',
    maxFiles: 5,
    maxSize: '10m'
  },

  // Memory management
  memoryConfig: {
    warningThreshold: 0.8,  // 80% of maxMemory
    criticalThreshold: 0.9,  // 90% of maxMemory
    maxBatchSize: 8,
    minItemSize: 16000,  // Minimum audio size in samples
    gradientCheckpointingThreshold: 1000000,
    useQuantization: true,
    monitoringInterval: 5000,  // 5 seconds
    processAudioMemoryPerItem: 1024 * 1024 * 50,  // 50 MB
    extractFeaturesMemoryPerItem: 1024 * 1024 * 20  // 20 MB
  },

  // Model configuration
  modelConfig: {
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
    maxNewTokens: 100,
    repetitionPenalty: 1.1,
    useCache: true,
    cachePath: 'cache/model'
  },

  // Processing options
  processingConfig: {
    defaultQuality: 'high',  // 'low', 'medium', 'high'
    enableBatchProcessing: true,
    enableStreaming: false,
    timeoutMs: 30000,  // 30 seconds
    maxAudioLength: 600,  // 10 minutes in seconds
    normalizeAudio: true
  },

  // Error handling
  errorConfig: {
    maxRetries: 3,
    backoffFactor: 1.5,
    initialDelayMs: 1000,
    reducedBatchSize: 1,
    bridgeTimeout: 30000,
    maxBridgeRestarts: 3,
    bridgeRestartDelay: 2000
  },

  // Quality assurance
  qaConfig: {
    audioFeaturesConfig: {
      expectedDimensions: 768,
      minValue: -10,
      maxValue: 10
    },
    patternConfig: {
      minConfidence: 0.5
    },
    responseTimeConfig: {
      maxResponseTime: 10000
    }
  },

  // Python bridge configuration
  bridgeConfig: {
    pythonPath: 'python',  // Path to Python executable
    scriptPath: 'gama_operations.py',
    startupTimeoutMs: 30000,
    operationTimeoutMs: 60000,
    maxMessageSize: 1024 * 1024 * 100,  // 100 MB
    enableLogging: true,
    logPath: 'logs/python-bridge.log'
  }
};

// Initialize with advanced configuration
const gamaService = new GAMAService(advancedConfig);
```

### Environment-Specific Configuration

You can create environment-specific configurations:

```typescript
// Load environment-specific configuration
function loadConfig() {
  const env = process.env.NODE_ENV || 'development';

  // Base configuration
  const baseConfig = {
    id: 'gama-service',
    modelPath: 'models/gama',
    maxMemory: '4GB',
    device: 'cpu',
    quantization: '8bit'
  };

  // Environment-specific overrides
  const envConfigs = {
    development: {
      logConfig: {
        level: 'debug',
        console: true
      },
      memoryConfig: {
        maxBatchSize: 2
      }
    },
    test: {
      modelPath: 'models/gama-test',
      device: 'cpu',
      logConfig: {
        level: 'info',
        console: true
      }
    },
    production: {
      device: 'cuda',
      maxMemory: '12GB',
      logConfig: {
        level: 'warn',
        file: 'logs/gama.log',
        console: false
      },
      memoryConfig: {
        maxBatchSize: 8
      },
      errorConfig: {
        maxRetries: 5
      }
    }
  };

  // Merge configurations
  return {
    ...baseConfig,
    ...envConfigs[env]
  };
}

// Initialize with environment-specific configuration
const gamaService = new GAMAService(loadConfig());
```

## Performance Optimization

### Batch Processing

Process multiple audio files in a single operation for better throughput:

```typescript
// Batch processing
async function processBatch(audioFiles: SimpleAudioBuffer[]) {
  console.log(`Processing batch of ${audioFiles.length} files...`);

  // Process the batch
  const results = await gamaService.processBatch(audioFiles, {
    quality: 'medium',
    maxNewTokens: 50
  });

  console.log('Batch processing complete!');
  console.log(`Processed ${results.length} files`);

  return results;
}

// Example usage
async function batchProcessingExample() {
  // Create multiple audio files
  const audioFiles = [
    createTestAudio(3, 16000, 440),  // 3 seconds of 440 Hz tone
    createTestAudio(2, 16000, 880),  // 2 seconds of 880 Hz tone
    createTestAudio(4, 16000, 220)   // 4 seconds of 220 Hz tone
  ];

  // Process the batch
  const results = await processBatch(audioFiles);

  // Process results
  results.forEach((result, index) => {
    console.log(`Result ${index + 1}:`);
    console.log(`- Transcription: "${result.transcription}"`);
    console.log(`- Confidence: ${result.confidence}`);
    console.log(`- Processing time: ${result.processingTime} ms`);
  });
}
```

### Memory Optimization

Optimize memory usage for better performance:

```typescript
// Memory optimization
async function processLargeAudio(audioPath: string) {
  // Load audio metadata without loading the entire file
  const metadata = await getAudioMetadata(audioPath);
  console.log(`Audio metadata: ${metadata.duration}s, ${metadata.sampleRate}Hz, ${metadata.channels} channels`);

  // Calculate chunk size (5 seconds per chunk)
  const chunkSize = 5 * metadata.sampleRate * metadata.channels;
  const chunks = Math.ceil(metadata.samples / chunkSize);

  console.log(`Processing audio in ${chunks} chunks...`);

  // Process audio in chunks
  const results = [];

  for (let i = 0; i < chunks; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks}...`);

    // Load chunk
    const chunk = await loadAudioChunk(audioPath, i * chunkSize, chunkSize);

    // Process chunk
    const result = await gamaService.process(chunk);
    results.push(result);

    // Release memory
    await gamaService.releaseResources();
  }

  // Combine results
  const combinedResult = combineResults(results);

  return combinedResult;
}

// Helper function to combine results
function combineResults(results) {
  // Combine transcriptions
  const transcription = results.map(r => r.transcription).join(' ');

  // Average confidence
  const confidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  // Combine segments
  const segments = [];
  let timeOffset = 0;

  for (const result of results) {
    if (result.segments) {
      // Adjust segment times
      const adjustedSegments = result.segments.map(segment => ({
        ...segment,
        start: segment.start + timeOffset,
        end: segment.end + timeOffset
      }));

      segments.push(...adjustedSegments);
    }

    // Update time offset for next chunk
    if (result.duration) {
      timeOffset += result.duration;
    }
  }

  return {
    transcription,
    confidence,
    segments,
    processingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
    duration: timeOffset
  };
}
```

### GPU Acceleration

Leverage GPU acceleration for faster processing:

```typescript
// GPU acceleration
async function initializeWithGPU() {
  // Check if CUDA is available
  const cudaAvailable = await checkCudaAvailability();

  // Configure GAMA with GPU support if available
  const config = {
    id: 'gama-gpu',
    modelPath: 'models/gama',
    maxMemory: cudaAvailable ? '12GB' : '4GB',
    device: cudaAvailable ? 'cuda' : 'cpu',
    quantization: '8bit',

    // GPU-specific configuration
    gpuConfig: cudaAvailable ? {
      cudaDevice: 0,  // Use first GPU
      halfPrecision: true,  // Use FP16 for faster computation
      tensorCores: true,  // Use tensor cores if available
      cudnnBenchmark: true,  // Benchmark cuDNN algorithms
      maxBatchSize: 16,  // Larger batch size for GPU
      streamingMultiprocessors: 'auto'  // Auto-detect SM count
    } : undefined
  };

  // Initialize GAMA with GPU configuration
  const gamaService = new GAMAService(config);
  await gamaService.initialize();

  console.log(`GAMA initialized with ${cudaAvailable ? 'GPU' : 'CPU'} support`);

  return gamaService;
}

// Helper function to check CUDA availability
async function checkCudaAvailability() {
  try {
    // Execute Python script to check CUDA
    const { execSync } = require('child_process');
    const result = execSync('python -c "import torch; print(torch.cuda.is_available())"').toString().trim();

    return result === 'True';
  } catch (error) {
    console.error('Error checking CUDA availability:', error);
    return false;
  }
}
```

## Custom Processing Pipelines

### Audio Preprocessing

Implement custom audio preprocessing for better results:

```typescript
// Audio preprocessing
class AudioPreprocessor {
  // Normalize audio to a specific level
  normalize(audio: SimpleAudioBuffer, targetLevel = 0.8): SimpleAudioBuffer {
    // Find peak amplitude
    let peak = 0;
    for (let i = 0; i < audio.data.length; i++) {
      peak = Math.max(peak, Math.abs(audio.data[i]));
    }

    // Skip if peak is zero or very small
    if (peak < 0.0001) {
      return audio;
    }

    // Calculate normalization factor
    const factor = targetLevel / peak;

    // Create normalized audio
    const normalizedData = new Float32Array(audio.data.length);
    for (let i = 0; i < audio.data.length; i++) {
      normalizedData[i] = audio.data[i] * factor;
    }

    return {
      data: normalizedData,
      channels: audio.channels,
      sampleRate: audio.sampleRate
    };
  }

  // Remove silence from the beginning and end
  trimSilence(audio: SimpleAudioBuffer, threshold = 0.01, minSilenceMs = 100): SimpleAudioBuffer {
    const samplesPerMs = audio.sampleRate / 1000;
    const minSilenceSamples = minSilenceMs * samplesPerMs;

    // Find start index (first non-silent sample)
    let startIdx = 0;
    let silenceCount = 0;

    for (let i = 0; i < audio.data.length; i++) {
      if (Math.abs(audio.data[i]) > threshold) {
        silenceCount = 0;
      } else {
        silenceCount++;
      }

      if (silenceCount >= minSilenceSamples) {
        startIdx = i - silenceCount + 1;
        break;
      }
    }

    // Find end index (last non-silent sample)
    let endIdx = audio.data.length - 1;
    silenceCount = 0;

    for (let i = audio.data.length - 1; i >= 0; i--) {
      if (Math.abs(audio.data[i]) > threshold) {
        silenceCount = 0;
      } else {
        silenceCount++;
      }

      if (silenceCount >= minSilenceSamples) {
        endIdx = i + silenceCount - 1;
        break;
      }
    }

    // Create trimmed audio
    const trimmedData = audio.data.slice(startIdx, endIdx + 1);

    return {
      data: trimmedData,
      channels: audio.channels,
      sampleRate: audio.sampleRate
    };
  }

  // Apply a simple noise gate
  applyNoiseGate(audio: SimpleAudioBuffer, threshold = 0.05): SimpleAudioBuffer {
    const gatedData = new Float32Array(audio.data.length);

    for (let i = 0; i < audio.data.length; i++) {
      gatedData[i] = Math.abs(audio.data[i]) > threshold ? audio.data[i] : 0;
    }

    return {
      data: gatedData,
      channels: audio.channels,
      sampleRate: audio.sampleRate
    };
  }

  // Resample audio to a specific sample rate
  resample(audio: SimpleAudioBuffer, targetSampleRate: number): SimpleAudioBuffer {
    if (audio.sampleRate === targetSampleRate) {
      return audio;
    }

    // Simple linear interpolation resampling
    // Note: For production use, consider a more sophisticated resampling algorithm
    const ratio = audio.sampleRate / targetSampleRate;
    const newLength = Math.floor(audio.data.length / ratio);
    const resampledData = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * ratio;
      const srcIdxFloor = Math.floor(srcIdx);
      const srcIdxCeil = Math.min(srcIdxFloor + 1, audio.data.length - 1);
      const t = srcIdx - srcIdxFloor;

      // Linear interpolation
      resampledData[i] = (1 - t) * audio.data[srcIdxFloor] + t * audio.data[srcIdxCeil];
    }

    return {
      data: resampledData,
      channels: audio.channels,
      sampleRate: targetSampleRate
    };
  }

  // Apply all preprocessing steps
  process(audio: SimpleAudioBuffer, options = {}): SimpleAudioBuffer {
    const {
      normalize = true,
      normalizationLevel = 0.8,
      trimSilence = true,
      silenceThreshold = 0.01,
      minSilenceMs = 100,
      applyNoiseGate = false,
      noiseGateThreshold = 0.05,
      resample = true,
      targetSampleRate = 16000
    } = options;

    let processedAudio = { ...audio };

    // Apply preprocessing steps
    if (normalize) {
      processedAudio = this.normalize(processedAudio, normalizationLevel);
    }

    if (trimSilence) {
      processedAudio = this.trimSilence(processedAudio, silenceThreshold, minSilenceMs);
    }

    if (applyNoiseGate) {
      processedAudio = this.applyNoiseGate(processedAudio, noiseGateThreshold);
    }

    if (resample && processedAudio.sampleRate !== targetSampleRate) {
      processedAudio = this.resample(processedAudio, targetSampleRate);
    }

    return processedAudio;
  }
}
```

### Custom Processing Pipeline

Create a custom processing pipeline for advanced use cases:

```typescript
// Custom processing pipeline
class GAMAProcessingPipeline {
  private preprocessor: AudioPreprocessor;
  private gamaService: GAMAService;
  private postprocessor: TranscriptionPostprocessor;

  constructor(gamaService: GAMAService) {
    this.preprocessor = new AudioPreprocessor();
    this.gamaService = gamaService;
    this.postprocessor = new TranscriptionPostprocessor();
  }

  async process(audio: SimpleAudioBuffer, options = {}): Promise<ProcessingResult> {
    console.log('Starting processing pipeline...');

    // Step 1: Preprocess audio
    console.log('Preprocessing audio...');
    const preprocessedAudio = this.preprocessor.process(audio, options.preprocessing);

    // Step 2: Process with GAMA
    console.log('Processing with GAMA...');
    const gamaResult = await this.gamaService.process(preprocessedAudio, options.gama);

    // Step 3: Postprocess transcription
    console.log('Postprocessing transcription...');
    const postprocessedResult = this.postprocessor.process(gamaResult, options.postprocessing);

    console.log('Processing pipeline complete');

    return {
      ...postprocessedResult,
      pipeline: {
        preprocessed: {
          samples: preprocessedAudio.data.length,
          sampleRate: preprocessedAudio.sampleRate,
          duration: preprocessedAudio.data.length / preprocessedAudio.sampleRate
        },
        raw: gamaResult
      }
    };
  }
}

// Transcription postprocessor
class TranscriptionPostprocessor {
  process(result: any, options = {}): any {
    const {
      removeHesitations = true,
      capitalizeFirstLetter = true,
      addPunctuation = true,
      formatNumbers = true,
      confidenceThreshold = 0.5
    } = options;

    let transcription = result.transcription || '';

    // Apply postprocessing steps
    if (removeHesitations) {
      transcription = this.removeHesitations(transcription);
    }

    if (capitalizeFirstLetter) {
      transcription = this.capitalizeFirstLetter(transcription);
    }

    if (addPunctuation) {
      transcription = this.addPunctuation(transcription);
    }

    if (formatNumbers) {
      transcription = this.formatNumbers(transcription);
    }

    // Filter segments by confidence
    let segments = result.segments || [];
    if (confidenceThreshold > 0) {
      segments = segments.filter(segment => segment.confidence >= confidenceThreshold);
    }

    return {
      ...result,
      transcription,
      segments
    };
  }

  private removeHesitations(text: string): string {
    // Remove common hesitation sounds
    return text
      .replace(/\b(um|uh|er|ah|like|you know|i mean)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private addPunctuation(text: string): string {
    // This is a simplified example
    // In a real implementation, you would use a more sophisticated approach

    // Add period at the end if missing
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }

    return text;
  }

  private formatNumbers(text: string): string {
    // Convert number words to digits
    // This is a simplified example
    const numberMap = {
      'one': '1',
      'two': '2',
      'three': '3',
      'four': '4',
      'five': '5',
      'six': '6',
      'seven': '7',
      'eight': '8',
      'nine': '9',
      'ten': '10'
    };

    // Replace number words with digits
    for (const [word, digit] of Object.entries(numberMap)) {
      text = text.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
    }

    return text;
  }
}
```

## Advanced Pattern Recognition

### Custom Feature Extraction

Implement custom feature extraction for specialized use cases:

```typescript
// Custom feature extraction
class CustomFeatureExtractor {
  private gamaService: GAMAService;

  constructor(gamaService: GAMAService) {
    this.gamaService = gamaService;
  }

  async extractFeatures(audio: SimpleAudioBuffer, options = {}): Promise<Float32Array> {
    // Extract base features using GAMA
    const baseFeatures = await this.gamaService.extractFeatures(audio);

    // Apply custom feature processing
    const customFeatures = this.processFeatures(baseFeatures, options);

    return customFeatures;
  }

  private processFeatures(features: Float32Array, options = {}): Float32Array {
    const {
      normalize = true,
      dimensionReduction = false,
      targetDimensions = 128,
      applyWeighting = false,
      weights = []
    } = options;

    let processedFeatures = features;

    // Normalize features
    if (normalize) {
      processedFeatures = this.normalizeFeatures(processedFeatures);
    }

    // Apply dimension reduction
    if (dimensionReduction && targetDimensions < processedFeatures.length) {
      processedFeatures = this.reduceDimensions(processedFeatures, targetDimensions);
    }

    // Apply feature weighting
    if (applyWeighting && weights.length === processedFeatures.length) {
      processedFeatures = this.applyWeighting(processedFeatures, weights);
    }

    return processedFeatures;
  }

  private normalizeFeatures(features: Float32Array): Float32Array {
    // Calculate mean and standard deviation
    let sum = 0;
    let sumSquared = 0;

    for (let i = 0; i < features.length; i++) {
      sum += features[i];
      sumSquared += features[i] * features[i];
    }

    const mean = sum / features.length;
    const variance = sumSquared / features.length - mean * mean;
    const stdDev = Math.sqrt(variance);

    // Normalize features
    const normalizedFeatures = new Float32Array(features.length);

    for (let i = 0; i < features.length; i++) {
      normalizedFeatures[i] = (features[i] - mean) / stdDev;
    }

    return normalizedFeatures;
  }

  private reduceDimensions(features: Float32Array, targetDimensions: number): Float32Array {
    // Simple dimension reduction by averaging
    // In a real implementation, you would use PCA or t-SNE

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

  private applyWeighting(features: Float32Array, weights: number[]): Float32Array {
    // Apply weights to features
    const weightedFeatures = new Float32Array(features.length);

    for (let i = 0; i < features.length; i++) {
      weightedFeatures[i] = features[i] * weights[i];
    }

    return weightedFeatures;
  }
}
```

### Advanced Pattern Matching

Implement advanced pattern matching algorithms:

```typescript
// Advanced pattern matching
class AdvancedPatternMatcher {
  private featureMemory: Map<string, Float32Array> = new Map();
  private metadataMemory: Map<string, any> = new Map();

  // Store a pattern with metadata
  async storePattern(features: Float32Array, metadata: any = {}): Promise<string> {
    const patternId = `pattern-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.featureMemory.set(patternId, features);
    this.metadataMemory.set(patternId, metadata);
    return patternId;
  }

  // Find similar patterns using different similarity metrics
  async findSimilarPatterns(
    features: Float32Array,
    options: {
      metric?: 'cosine' | 'euclidean' | 'manhattan' | 'weighted';
      weights?: number[];
      threshold?: number;
      maxResults?: number;
      filter?: (metadata: any) => boolean;
    } = {}
  ): Promise<Array<{ id: string; similarity: number; metadata: any }>> {
    const {
      metric = 'cosine',
      weights,
      threshold = 0.8,
      maxResults = 5,
      filter
    } = options;

    const results: Array<{ id: string; similarity: number; metadata: any }> = [];

    // Calculate similarity for each stored pattern
    for (const [id, storedFeatures] of this.featureMemory.entries()) {
      const metadata = this.metadataMemory.get(id) || {};

      // Apply filter if provided
      if (filter && !filter(metadata)) {
        continue;
      }

      // Calculate similarity based on selected metric
      let similarity: number;

      switch (metric) {
        case 'euclidean':
          similarity = this.calculateEuclideanSimilarity(features, storedFeatures);
          break;
        case 'manhattan':
          similarity = this.calculateManhattanSimilarity(features, storedFeatures);
          break;
        case 'weighted':
          similarity = this.calculateWeightedSimilarity(features, storedFeatures, weights);
          break;
        case 'cosine':
        default:
          similarity = this.calculateCosineSimilarity(features, storedFeatures);
          break;
      }

      if (similarity >= threshold) {
        results.push({ id, similarity, metadata });
      }
    }

    // Sort by similarity (descending) and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  // Cosine similarity (1 = identical, 0 = orthogonal, -1 = opposite)
  private calculateCosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Feature vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Euclidean similarity (1 = identical, 0 = maximum distance)
  private calculateEuclideanSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Feature vectors must have the same length');
    }

    let sumSquaredDiff = 0;

    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sumSquaredDiff += diff * diff;
    }

    const distance = Math.sqrt(sumSquaredDiff);
    const maxDistance = Math.sqrt(a.length * 4); // Assuming normalized features in [-1, 1]

    return 1 - (distance / maxDistance);
  }

  // Manhattan similarity (1 = identical, 0 = maximum distance)
  private calculateManhattanSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Feature vectors must have the same length');
    }

    let sumAbsDiff = 0;

    for (let i = 0; i < a.length; i++) {
      sumAbsDiff += Math.abs(a[i] - b[i]);
    }

    const maxDistance = a.length * 2; // Assuming normalized features in [-1, 1]

    return 1 - (sumAbsDiff / maxDistance);
  }

  // Weighted similarity (combination of metrics with weights)
  private calculateWeightedSimilarity(a: Float32Array, b: Float32Array, weights?: number[]): number {
    if (!weights || weights.length !== a.length) {
      // Default to equal weights
      weights = new Array(a.length).fill(1 / a.length);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i] * weights[i];
      normA += a[i] * a[i] * weights[i];
      normB += b[i] * b[i] * weights[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

## Integration with External Systems

### WebSocket Integration

Integrate GAMA with WebSocket for real-time processing:

```typescript
// WebSocket integration
const WebSocket = require('ws');

class GAMAWebSocketServer {
  private gamaService: GAMAService;
  private server: any;
  private clients: Map<string, any> = new Map();

  constructor(gamaService: GAMAService, port = 8080) {
    this.gamaService = gamaService;
    this.server = new WebSocket.Server({ port });

    this.server.on('connection', this.handleConnection.bind(this));

    console.log(`WebSocket server started on port ${port}`);
  }

  private handleConnection(ws: any) {
    const clientId = `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.clients.set(clientId, ws);

    console.log(`Client connected: ${clientId}`);

    ws.on('message', async (message: any) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(clientId, ws, data);
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      clientId,
      message: 'Connected to GAMA WebSocket server'
    }));
  }

  private async handleMessage(clientId: string, ws: any, data: any) {
    const { type, payload } = data;

    switch (type) {
      case 'process_audio':
        await this.handleProcessAudio(clientId, ws, payload);
        break;

      case 'extract_features':
        await this.handleExtractFeatures(clientId, ws, payload);
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          error: `Unknown message type: ${type}`
        }));
        break;
    }
  }

  private async handleProcessAudio(clientId: string, ws: any, payload: any) {
    const { audio, options } = payload;

    // Convert base64 audio to Float32Array
    const audioBuffer = this.decodeAudio(audio);

    // Send acknowledgment
    ws.send(JSON.stringify({
      type: 'processing_started',
      message: 'Audio processing started'
    }));

    try {
      // Process audio
      const result = await this.gamaService.process(audioBuffer, options);

      // Send result
      ws.send(JSON.stringify({
        type: 'processing_result',
        result
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  }

  private async handleExtractFeatures(clientId: string, ws: any, payload: any) {
    const { audio, options } = payload;

    // Convert base64 audio to Float32Array
    const audioBuffer = this.decodeAudio(audio);

    // Send acknowledgment
    ws.send(JSON.stringify({
      type: 'extraction_started',
      message: 'Feature extraction started'
    }));

    try {
      // Extract features
      const features = await this.gamaService.extractFeatures(audioBuffer, options);

      // Send result
      ws.send(JSON.stringify({
        type: 'extraction_result',
        features: Array.from(features)  // Convert Float32Array to regular array for JSON
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  }

  private decodeAudio(base64Audio: string): SimpleAudioBuffer {
    // Decode base64 to binary
    const binaryString = Buffer.from(base64Audio, 'base64');

    // Parse audio format (simplified example)
    // In a real implementation, you would parse the audio format properly

    // Assume 16-bit PCM, mono, 16kHz
    const floatData = new Float32Array(binaryString.length / 2);

    for (let i = 0; i < floatData.length; i++) {
      // Convert 16-bit PCM to float32 (-1.0 to 1.0)
      floatData[i] = binaryString.readInt16LE(i * 2) / 32768.0;
    }

    return {
      data: floatData,
      channels: 1,
      sampleRate: 16000
    };
  }

  shutdown() {
    this.server.close();
    console.log('WebSocket server shut down');
  }
}
```

### REST API Integration

Integrate GAMA with a REST API:

```typescript
// REST API integration
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

class GAMARestAPI {
  private gamaService: GAMAService;
  private app: any;
  private upload: any;
  private port: number;

  constructor(gamaService: GAMAService, port = 3000) {
    this.gamaService = gamaService;
    this.port = port;

    // Create Express app
    this.app = express();

    // Configure middleware
    this.app.use(bodyParser.json());

    // Configure file upload
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    this.upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          cb(null, `${Date.now()}-${file.originalname}`);
        }
      })
    });

    // Configure routes
    this.configureRoutes();
  }

  private configureRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'gama-api',
        timestamp: new Date().toISOString()
      });
    });

    // Process audio
    this.app.post('/process', this.upload.single('audio'), async (req, res) => {
      try {
        const file = req.file;
        const options = req.body.options ? JSON.parse(req.body.options) : {};

        if (!file) {
          return res.status(400).json({
            error: 'No audio file provided'
          });
        }

        // Load audio
        const audio = await this.loadAudioFromFile(file.path);

        // Process audio
        const result = await this.gamaService.process(audio, options);

        // Clean up
        fs.unlinkSync(file.path);

        // Return result
        res.json(result);
      } catch (error) {
        console.error('Error processing audio:', error);
        res.status(500).json({
          error: error.message
        });
      }
    });

    // Extract features
    this.app.post('/extract-features', this.upload.single('audio'), async (req, res) => {
      try {
        const file = req.file;
        const options = req.body.options ? JSON.parse(req.body.options) : {};

        if (!file) {
          return res.status(400).json({
            error: 'No audio file provided'
          });
        }

        // Load audio
        const audio = await this.loadAudioFromFile(file.path);

        // Extract features
        const features = await this.gamaService.extractFeatures(audio, options);

        // Clean up
        fs.unlinkSync(file.path);

        // Return result
        res.json({
          features: Array.from(features)
        });
      } catch (error) {
        console.error('Error extracting features:', error);
        res.status(500).json({
          error: error.message
        });
      }
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('API error:', err);
      res.status(500).json({
        error: err.message
      });
    });
  }

  private async loadAudioFromFile(filePath: string): Promise<SimpleAudioBuffer> {
    // This is a simplified example
    // In a real implementation, you would use a proper audio loading library

    // Read file
    const buffer = await fs.promises.readFile(filePath);

    // Parse WAV header (simplified)
    // In a real implementation, you would parse the WAV header properly

    // Assume 16-bit PCM, mono, 16kHz
    const dataView = new DataView(buffer.buffer, 44);
    const floatData = new Float32Array(dataView.byteLength / 2);

    for (let i = 0; i < floatData.length; i++) {
      // Convert 16-bit PCM to float32 (-1.0 to 1.0)
      floatData[i] = dataView.getInt16(i * 2, true) / 32768.0;
    }

    return {
      data: floatData,
      channels: 1,
      sampleRate: 16000
    };
  }

  start() {
    return new Promise<void>((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`GAMA REST API running on port ${this.port}`);
        resolve();
      });
    });
  }

  shutdown() {
    // No built-in shutdown method for Express
    console.log('REST API shut down');
  }
}
```

## Conclusion

This tutorial covered advanced features and customization options for the GAMA integration. You've learned how to:

1. Configure GAMA with advanced options
2. Optimize performance with batch processing and memory management
3. Create custom processing pipelines
4. Implement advanced pattern recognition
5. Integrate GAMA with external systems

For more information, refer to the [API Reference](../technical/api-reference.md) and [GAMA Architecture](../technical/gama-architecture.md) documentation.

## Next Steps

- Learn how to write effective tests in the [Testing Tutorial](./testing-tutorial.md)
- Discover how to extend GAMA functionality in the [Extension Tutorial](./extension-tutorial.md)
- Explore performance tuning in the [Performance Tuning Guide](../operations/performance-tuning.md)

