# GAMA Basic Usage Tutorial

## Overview

This tutorial provides a step-by-step guide to integrating and using the GAMA (General-purpose Audio-Language Model) in your grym-synth applications. By the end of this tutorial, you'll be able to process audio, extract features, and implement basic pattern recognition using GAMA.

## Prerequisites

Before starting this tutorial, ensure you have:

1. Node.js v16.x or later installed
2. Python 3.8 or later installed
3. GAMA integration package installed
4. GAMA model files downloaded
5. Basic understanding of TypeScript/JavaScript and async/await

## Installation

If you haven't already installed the GAMA integration, follow these steps:

```bash
# Install GAMA integration package
npm install @grym-synth/gama-integration

# Download GAMA model files
npx gama-download --output models/gama
```

## Basic Setup

Let's start by setting up the GAMA service in your application:

```typescript
// Import GAMA components
import { GAMAService } from '@grym-synth/gama-integration';
import { GAMAAdapter } from '@grym-synth/gama-integration';
import { SimpleAudioBuffer } from '@grym-synth/gama-integration';

// Create a configuration object
const gamaConfig = {
  id: 'gama-service',
  modelPath: 'models/gama',
  maxMemory: '4GB',
  device: 'cpu',  // Use 'cuda' if you have a compatible GPU
  quantization: '8bit'
};

// Initialize GAMA service
const gamaService = new GAMAService(gamaConfig);

// Initialize GAMA adapter (if you're using the orchestration system)
const gamaAdapter = new GAMAAdapter({
  gamaService,
  featureMemory: yourFeatureMemoryProvider  // Replace with your feature memory provider
});

// Initialize the service
async function initializeGAMA() {
  try {
    console.log('Initializing GAMA service...');
    await gamaService.initialize();
    console.log('GAMA service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize GAMA service:', error);
  }
}

// Call the initialization function
initializeGAMA();
```

## Processing Audio

Now that we have the GAMA service initialized, let's process some audio:

### Loading Audio

First, we need to load audio data into a format that GAMA can process:

```typescript
// Load audio from a file
async function loadAudioFromFile(filePath: string): Promise<SimpleAudioBuffer> {
  // This is a simplified example. In a real application, you would use a proper audio loading library.
  const fs = require('fs');
  const { promisify } = require('util');
  const readFile = promisify(fs.readFile);

  // Read the file
  const buffer = await readFile(filePath);

  // For this example, we'll assume it's a 16-bit PCM WAV file
  // In a real application, you would parse the WAV header and extract the audio data

  // Skip the WAV header (44 bytes) and convert to float32
  const dataView = new DataView(buffer.buffer, 44);
  const floatData = new Float32Array(dataView.byteLength / 2);

  for (let i = 0; i < floatData.length; i++) {
    // Convert 16-bit PCM to float32 (-1.0 to 1.0)
    floatData[i] = dataView.getInt16(i * 2, true) / 32768.0;
  }

  return {
    data: floatData,
    channels: 1,  // Assuming mono audio
    sampleRate: 16000  // Assuming 16kHz sample rate
  };
}

// Alternatively, create a simple sine wave for testing
function createTestAudio(duration = 1, sampleRate = 16000): SimpleAudioBuffer {
  const samples = duration * sampleRate;
  const data = new Float32Array(samples);

  // Generate a simple sine wave (440 Hz)
  for (let i = 0; i < samples; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }

  return {
    data,
    channels: 1,
    sampleRate
  };
}
```

### Processing Audio with GAMA

Now, let's process the audio with GAMA:

```typescript
// Process audio with GAMA
async function processAudio(audio: SimpleAudioBuffer) {
  try {
    console.log('Processing audio...');
    console.log(`Audio details: ${audio.data.length} samples, ${audio.channels} channels, ${audio.sampleRate}Hz`);

    // Process the audio
    const result = await gamaService.process(audio);

    console.log('Processing complete!');
    console.log('Transcription:', result.transcription);
    console.log('Confidence:', result.confidence);
    console.log('Processing time:', result.processingTime, 'ms');

    // If there are segments, display them
    if (result.segments && result.segments.length > 0) {
      console.log('Segments:');
      result.segments.forEach((segment, index) => {
        console.log(`  ${index + 1}. "${segment.text}" (${segment.start.toFixed(2)}s - ${segment.end.toFixed(2)}s, confidence: ${segment.confidence.toFixed(2)})`);
      });
    }

    return result;
  } catch (error) {
    console.error('Error processing audio:', error);
    throw error;
  }
}

// Example usage
async function example() {
  // Initialize GAMA
  await initializeGAMA();

  // Create test audio
  const audio = createTestAudio(3);  // 3 seconds of audio

  // Process the audio
  const result = await processAudio(audio);

  // Do something with the result
  console.log('Result:', result);

  // Shutdown GAMA service when done
  await gamaService.shutdown();
}

// Run the example
example();
```

## Extracting Features

GAMA can also extract features from audio for pattern recognition:

```typescript
// Extract features from audio
async function extractFeatures(audio: SimpleAudioBuffer) {
  try {
    console.log('Extracting features...');

    // Extract features
    const features = await gamaService.extractFeatures(audio);

    console.log('Feature extraction complete!');
    console.log(`Extracted ${features.length} features`);

    return features;
  } catch (error) {
    console.error('Error extracting features:', error);
    throw error;
  }
}

// Example usage
async function featureExtractionExample() {
  // Initialize GAMA
  await initializeGAMA();

  // Create test audio
  const audio = createTestAudio(3);  // 3 seconds of audio

  // Extract features
  const features = await extractFeatures(audio);

  // Do something with the features
  console.log('Feature vector length:', features.length);
  console.log('First 5 features:', features.slice(0, 5));

  // Shutdown GAMA service when done
  await gamaService.shutdown();
}

// Run the example
featureExtractionExample();
```

## Pattern Recognition

Now, let's use GAMA for pattern recognition by storing and retrieving patterns:

```typescript
// Simple in-memory feature memory provider for demonstration
class SimpleFeatureMemory {
  private patterns: Map<string, Float32Array> = new Map();

  async storePattern(features: Float32Array): Promise<string> {
    const patternId = `pattern-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.patterns.set(patternId, features);
    return patternId;
  }

  async findSimilarPatterns(
    features: Float32Array,
    options: { threshold: number; maxResults: number }
  ): Promise<Array<{ id: string; similarity: number }>> {
    const results: Array<{ id: string; similarity: number }> = [];

    // Calculate similarity for each stored pattern
    for (const [id, storedFeatures] of this.patterns.entries()) {
      const similarity = this.calculateCosineSimilarity(features, storedFeatures);

      if (similarity >= options.threshold) {
        results.push({ id, similarity });
      }
    }

    // Sort by similarity (descending) and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.maxResults);
  }

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
}

// Create a feature memory provider
const featureMemory = new SimpleFeatureMemory();

// Initialize GAMA adapter with the feature memory provider
const gamaAdapter = new GAMAAdapter({
  gamaService,
  featureMemory
});

// Store a pattern
async function storePattern(audio: SimpleAudioBuffer) {
  try {
    console.log('Extracting and storing pattern...');

    // Extract and store features
    const patternId = await gamaAdapter.extractAndStoreFeatures(audio);

    console.log('Pattern stored successfully!');
    console.log('Pattern ID:', patternId);

    return patternId;
  } catch (error) {
    console.error('Error storing pattern:', error);
    throw error;
  }
}

// Find similar patterns
async function findSimilarPatterns(audio: SimpleAudioBuffer, options = { threshold: 0.8, maxResults: 5 }) {
  try {
    console.log('Finding similar patterns...');

    // Extract features
    const features = await gamaService.extractFeatures(audio);

    // Find similar patterns
    const matches = await featureMemory.findSimilarPatterns(features, options);

    console.log('Found', matches.length, 'similar patterns:');
    matches.forEach((match, index) => {
      console.log(`  ${index + 1}. ID: ${match.id}, Similarity: ${match.similarity.toFixed(4)}`);
    });

    return matches;
  } catch (error) {
    console.error('Error finding similar patterns:', error);
    throw error;
  }
}

// Example usage
async function patternRecognitionExample() {
  // Initialize GAMA
  await initializeGAMA();

  // Create test audio samples
  const audio1 = createTestAudio(3, 16000);  // 3 seconds of 440 Hz tone
  const audio2 = createTestAudio(3, 16000);  // Same as audio1

  // Create a different audio sample
  const audio3 = new SimpleAudioBuffer();
  audio3.data = new Float32Array(3 * 16000);
  audio3.channels = 1;
  audio3.sampleRate = 16000;

  // Generate a different tone (880 Hz)
  for (let i = 0; i < audio3.data.length; i++) {
    audio3.data[i] = Math.sin(2 * Math.PI * 880 * i / 16000);
  }

  // Store patterns
  const patternId1 = await storePattern(audio1);
  console.log('Stored pattern 1:', patternId1);

  // Find similar patterns for audio2 (should match audio1)
  console.log('\nFinding patterns similar to audio2:');
  const matches2 = await findSimilarPatterns(audio2);

  // Find similar patterns for audio3 (should be less similar to audio1)
  console.log('\nFinding patterns similar to audio3:');
  const matches3 = await findSimilarPatterns(audio3);

  // Shutdown GAMA service when done
  await gamaService.shutdown();
}

// Run the example
patternRecognitionExample();
```

## Using the GAMA Adapter with Tasks

If you're using the grym-synth orchestration system, you can use the GAMA adapter to handle tasks:

```typescript
// Define a task
const task = {
  id: 'task-123',
  type: 'audio.process',
  timestamp: Date.now(),
  data: {
    audio: createTestAudio(3),
    options: {
      quality: 'high'
    }
  }
};

// Handle the task with the GAMA adapter
async function handleTask(task) {
  try {
    console.log('Handling task:', task.id);

    // Handle the task
    const result = await gamaAdapter.handleTask(task);

    console.log('Task handled successfully!');
    console.log('Result:', result);

    return result;
  } catch (error) {
    console.error('Error handling task:', error);
    throw error;
  }
}

// Example usage
async function taskHandlingExample() {
  // Initialize GAMA
  await initializeGAMA();

  // Handle the task
  const result = await handleTask(task);

  // Do something with the result
  console.log('Task result:', result);

  // Shutdown GAMA service when done
  await gamaService.shutdown();
}

// Run the example
taskHandlingExample();
```

## Error Handling

Proper error handling is important when working with GAMA:

```typescript
// Process audio with error handling
async function processAudioWithErrorHandling(audio: SimpleAudioBuffer) {
  try {
    // Validate input
    if (!audio || !audio.data || audio.data.length === 0) {
      throw new Error('Invalid audio input');
    }

    // Check if service is initialized
    if (!gamaService.isInitialized()) {
      await gamaService.initialize();
    }

    // Process audio
    return await gamaService.process(audio);
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('memory')) {
      console.error('Memory error:', error.message);
      // Try with reduced quality
      return await gamaService.process(audio, { quality: 'low' });
    } else if (error.message.includes('timeout')) {
      console.error('Timeout error:', error.message);
      // Try with a timeout
      return await Promise.race([
        gamaService.process(audio),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), 30000))
      ]);
    } else {
      // Re-throw other errors
      console.error('Unexpected error:', error);
      throw error;
    }
  } finally {
    // Cleanup (if needed)
    console.log('Processing complete (success or failure)');
  }
}
```

## Complete Example

Here's a complete example that demonstrates the basic usage of GAMA:

```typescript
import { GAMAService, GAMAAdapter, SimpleAudioBuffer } from '@grym-synth/gama-integration';
import * as fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

// Simple feature memory implementation
class SimpleFeatureMemory {
  private patterns: Map<string, Float32Array> = new Map();

  async storePattern(features: Float32Array): Promise<string> {
    const patternId = `pattern-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.patterns.set(patternId, features);
    return patternId;
  }

  async findSimilarPatterns(
    features: Float32Array,
    options: { threshold: number; maxResults: number }
  ): Promise<Array<{ id: string; similarity: number }>> {
    const results: Array<{ id: string; similarity: number }> = [];

    for (const [id, storedFeatures] of this.patterns.entries()) {
      const similarity = this.calculateCosineSimilarity(features, storedFeatures);

      if (similarity >= options.threshold) {
        results.push({ id, similarity });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.maxResults);
  }

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
}

// Helper function to create test audio
function createTestAudio(duration = 1, sampleRate = 16000, frequency = 440): SimpleAudioBuffer {
  const samples = duration * sampleRate;
  const data = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }

  return {
    data,
    channels: 1,
    sampleRate
  };
}

// Main example function
async function runGAMAExample() {
  console.log('Starting GAMA example...');

  // Initialize GAMA service
  const gamaService = new GAMAService({
    id: 'gama-example',
    modelPath: 'models/gama',
    maxMemory: '4GB',
    device: 'cpu',
    quantization: '8bit'
  });

  // Initialize feature memory
  const featureMemory = new SimpleFeatureMemory();

  // Initialize GAMA adapter
  const gamaAdapter = new GAMAAdapter({
    gamaService,
    featureMemory
  });

  try {
    // Initialize service
    console.log('Initializing GAMA service...');
    await gamaService.initialize();
    console.log('GAMA service initialized successfully');

    // Create test audio
    console.log('Creating test audio...');
    const audio1 = createTestAudio(3, 16000, 440);  // 3 seconds of 440 Hz tone
    const audio2 = createTestAudio(3, 16000, 440);  // Same as audio1
    const audio3 = createTestAudio(3, 16000, 880);  // Different frequency

    // Process audio
    console.log('\nProcessing audio...');
    const processResult = await gamaService.process(audio1);
    console.log('Processing result:');
    console.log(`- Transcription: "${processResult.transcription}"`);
    console.log(`- Confidence: ${processResult.confidence}`);
    console.log(`- Processing time: ${processResult.processingTime} ms`);

    // Extract features
    console.log('\nExtracting features...');
    const features = await gamaService.extractFeatures(audio1);
    console.log(`Extracted ${features.length} features`);

    // Store pattern
    console.log('\nStoring pattern...');
    const patternId = await gamaAdapter.extractAndStoreFeatures(audio1);
    console.log(`Pattern stored with ID: ${patternId}`);

    // Find similar patterns
    console.log('\nFinding patterns similar to audio2 (should match)...');
    const matches2 = await featureMemory.findSimilarPatterns(
      await gamaService.extractFeatures(audio2),
      { threshold: 0.8, maxResults: 5 }
    );
    console.log('Matches:', matches2);

    console.log('\nFinding patterns similar to audio3 (should be less similar)...');
    const matches3 = await featureMemory.findSimilarPatterns(
      await gamaService.extractFeatures(audio3),
      { threshold: 0.5, maxResults: 5 }
    );
    console.log('Matches:', matches3);

    // Handle a task
    console.log('\nHandling a task...');
    const task = {
      id: 'task-123',
      type: 'audio.process',
      timestamp: Date.now(),
      data: {
        audio: audio1,
        options: {
          quality: 'high'
        }
      }
    };

    const taskResult = await gamaAdapter.handleTask(task);
    console.log('Task result:', taskResult);

    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in GAMA example:', error);
  } finally {
    // Shutdown service
    console.log('\nShutting down GAMA service...');
    await gamaService.shutdown();
    console.log('GAMA service shut down successfully');
  }
}

// Run the example
runGAMAExample();
```

## Next Steps

Now that you've learned the basics of using GAMA, you can:

1. Explore advanced features in the [Advanced Features Tutorial](./advanced-features.md)
2. Learn how to write effective tests in the [Testing Tutorial](./testing-tutorial.md)
3. Discover how to extend GAMA functionality in the [Extension Tutorial](./extension-tutorial.md)

For more detailed information, refer to the [API Reference](../technical/api-reference.md) and [GAMA Architecture](../technical/gama-architecture.md) documentation.

## Troubleshooting

If you encounter issues while following this tutorial, check the [Troubleshooting Guide](../operations/troubleshooting.md) for common problems and solutions.

