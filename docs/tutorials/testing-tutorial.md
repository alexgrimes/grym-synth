# GAMA Testing Tutorial

## Overview

This tutorial provides guidance on writing effective tests for the GAMA integration in the grym-synth. You'll learn how to create unit tests, integration tests, and end-to-end tests to ensure the reliability and correctness of your GAMA implementation.

## Prerequisites

Before starting this tutorial, ensure you:

1. Have completed the [Basic Usage Tutorial](./basic-usage.md)
2. Have a working GAMA integration
3. Are familiar with Jest or another testing framework
4. Understand TypeScript/JavaScript and async/await

## Testing Framework Setup

The grym-synth uses Jest as its testing framework. If you haven't set up Jest yet, follow these steps:

```bash
# Install Jest and related dependencies
npm install --save-dev jest @types/jest ts-jest

# Create Jest configuration
npx ts-jest config:init
```

Your `jest.config.js` file should look something like this:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Unit Testing

Unit tests focus on testing individual components in isolation. For the GAMA integration, we'll create unit tests for each class and function.

### Testing Directory Structure

Create a structured testing directory:

```
src/
└── services/
    └── audio/
        ├── GAMAService.ts
        ├── GAMAAdapter.ts
        └── __tests__/
            ├── GAMAService.test.ts
            ├── GAMAAdapter.test.ts
            ├── mocks/
            │   ├── MockGAMABridge.ts
            │   └── MockFeatureMemory.ts
            └── fixtures/
                └── audio-samples.ts
```

### Creating Mocks

Create mocks for dependencies to isolate the component being tested:

```typescript
// src/services/audio/__tests__/mocks/MockGAMABridge.ts
export class MockGAMABridge {
  private initialized = false;
  private operations: Record<string, any> = {};

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async executeOperation(operation: string, data: any): Promise<any> {
    if (!this.initialized) {
      throw new Error('Bridge not initialized');
    }

    const handler = this.operations[operation];

    if (!handler) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    return handler(data);
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  // Method to register operation handlers for testing
  registerOperation(operation: string, handler: (data: any) => any): void {
    this.operations[operation] = handler;
  }

  // Method to check if initialized
  isInitialized(): boolean {
    return this.initialized;
  }
}

// src/services/audio/__tests__/mocks/MockFeatureMemory.ts
export class MockFeatureMemory {
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
      const similarity = this.calculateSimilarity(features, storedFeatures);

      if (similarity >= options.threshold) {
        results.push({ id, similarity });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.maxResults);
  }

  private calculateSimilarity(a: Float32Array, b: Float32Array): number {
    // Simple mock similarity calculation
    return 0.9; // Always return high similarity for testing
  }

  // Method to get stored patterns for testing
  getPatterns(): Map<string, Float32Array> {
    return this.patterns;
  }
}
```

### Creating Test Fixtures

Create test fixtures to use in your tests:

```typescript
// src/services/audio/__tests__/fixtures/audio-samples.ts
export function createTestAudio(duration = 1, sampleRate = 16000): SimpleAudioBuffer {
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

export const mockProcessResult = {
  transcription: 'This is a test transcription',
  confidence: 0.95,
  segments: [
    {
      text: 'This is a test',
      start: 0,
      end: 1.5,
      confidence: 0.96
    },
    {
      text: 'transcription',
      start: 1.6,
      end: 2.5,
      confidence: 0.94
    }
  ],
  processingTime: 1234,
  duration: 2.5
};

export const mockFeatures = new Float32Array(768).fill(0.1);
```

### Testing GAMAService

Create unit tests for the GAMAService class:

```typescript
// src/services/audio/__tests__/GAMAService.test.ts
import { GAMAService } from '../GAMAService';
import { MockGAMABridge } from './mocks/MockGAMABridge';
import { createTestAudio, mockProcessResult, mockFeatures } from './fixtures/audio-samples';

// Mock the GAMABridge module
jest.mock('../utils/GAMABridge', () => {
  return {
    GAMABridge: jest.fn().mockImplementation(() => {
      return new MockGAMABridge();
    })
  };
});

describe('GAMAService', () => {
  let gamaService: GAMAService;
  let mockBridge: MockGAMABridge;

  beforeEach(() => {
    // Create a new instance for each test
    gamaService = new GAMAService({
      id: 'gama-test',
      modelPath: 'models/gama',
      maxMemory: '4GB',
      device: 'cpu',
      quantization: '8bit'
    });

    // Get the mock bridge instance
    mockBridge = (gamaService as any).bridge;

    // Register mock operations
    mockBridge.registerOperation('ping', () => ({ status: 'ok' }));
    mockBridge.registerOperation('process_audio', () => mockProcessResult);
    mockBridge.registerOperation('extract_features', () => ({ features: mockFeatures }));
  });

  afterEach(async () => {
    // Clean up after each test
    await gamaService.shutdown();
  });

  test('should initialize successfully', async () => {
    // Act
    await gamaService.initialize();

    // Assert
    expect(mockBridge.isInitialized()).toBe(true);
  });

  test('should process audio successfully', async () => {
    // Arrange
    await gamaService.initialize();
    const audio = createTestAudio(2);

    // Act
    const result = await gamaService.process(audio);

    // Assert
    expect(result).toEqual(mockProcessResult);
  });

  test('should extract features successfully', async () => {
    // Arrange
    await gamaService.initialize();
    const audio = createTestAudio(2);

    // Act
    const features = await gamaService.extractFeatures(audio);

    // Assert
    expect(features).toEqual(mockFeatures);
  });

  test('should throw error if not initialized', async () => {
    // Arrange
    const audio = createTestAudio(2);

    // Act & Assert
    await expect(gamaService.process(audio)).rejects.toThrow('Bridge not initialized');
  });

  test('should shutdown successfully', async () => {
    // Arrange
    await gamaService.initialize();

    // Act
    await gamaService.shutdown();

    // Assert
    expect(mockBridge.isInitialized()).toBe(false);
  });
});
```

### Testing GAMAAdapter

Create unit tests for the GAMAAdapter class:

```typescript
// src/services/audio/__tests__/GAMAAdapter.test.ts
import { GAMAAdapter } from '../GAMAAdapter';
import { GAMAService } from '../GAMAService';
import { MockFeatureMemory } from './mocks/MockFeatureMemory';
import { createTestAudio, mockProcessResult, mockFeatures } from './fixtures/audio-samples';

// Mock the GAMAService
jest.mock('../GAMAService');

describe('GAMAAdapter', () => {
  let gamaAdapter: GAMAAdapter;
  let mockGAMAService: jest.Mocked<GAMAService>;
  let mockFeatureMemory: MockFeatureMemory;

  beforeEach(() => {
    // Create mocks
    mockGAMAService = new GAMAService({} as any) as jest.Mocked<GAMAService>;
    mockFeatureMemory = new MockFeatureMemory();

    // Mock GAMAService methods
    mockGAMAService.process.mockResolvedValue(mockProcessResult);
    mockGAMAService.extractFeatures.mockResolvedValue(mockFeatures);

    // Create adapter
    gamaAdapter = new GAMAAdapter({
      gamaService: mockGAMAService,
      featureMemory: mockFeatureMemory as any
    });
  });

  test('should handle process task successfully', async () => {
    // Arrange
    const task = {
      id: 'task-123',
      type: 'audio.process',
      timestamp: Date.now(),
      data: {
        audio: createTestAudio(2),
        options: {}
      }
    };

    // Act
    const result = await gamaAdapter.handleTask(task as any);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProcessResult);
    expect(mockGAMAService.process).toHaveBeenCalledWith(task.data.audio, task.data.options);
  });

  test('should handle extract_features task successfully', async () => {
    // Arrange
    const task = {
      id: 'task-123',
      type: 'audio.extract_features',
      timestamp: Date.now(),
      data: {
        audio: createTestAudio(2),
        options: {}
      }
    };

    // Act
    const result = await gamaAdapter.handleTask(task as any);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ features: mockFeatures });
    expect(mockGAMAService.extractFeatures).toHaveBeenCalledWith(task.data.audio);
  });

  test('should extract and store features successfully', async () => {
    // Arrange
    const audio = createTestAudio(2);

    // Act
    const patternId = await gamaAdapter.extractAndStoreFeatures(audio);

    // Assert
    expect(patternId).toBeDefined();
    expect(mockGAMAService.extractFeatures).toHaveBeenCalledWith(audio);
    expect(mockFeatureMemory.getPatterns().size).toBe(1);
  });

  test('should return capabilities', () => {
    // Act
    const capabilities = gamaAdapter.getCapabilities();

    // Assert
    expect(capabilities).toBeDefined();
    expect(capabilities.supportedTasks).toContain('audio.process');
    expect(capabilities.supportedTasks).toContain('audio.extract_features');
  });

  test('should handle errors gracefully', async () => {
    // Arrange
    mockGAMAService.process.mockRejectedValue(new Error('Test error'));

    const task = {
      id: 'task-123',
      type: 'audio.process',
      timestamp: Date.now(),
      data: {
        audio: createTestAudio(2),
        options: {}
      }
    };

    // Act
    const result = await gamaAdapter.handleTask(task as any);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
  });
});
```

## Integration Testing

Integration tests verify that different components work together correctly. For GAMA, we'll test the interaction between the service, adapter, and other components.

### Setting Up Integration Tests

Create a separate directory for integration tests:

```
src/
└── tests/
    └── integration/
        ├── gama-integration.test.ts
        └── setup.ts
```

### Creating Integration Test Setup

Create a setup file for integration tests:

```typescript
// src/tests/integration/setup.ts
import { GAMAService } from '../../services/audio/GAMAService';
import { GAMAAdapter } from '../../services/audio/GAMAAdapter';
import { SimpleFeatureMemory } from '../../services/memory/SimpleFeatureMemory';

export async function setupGAMAIntegration() {
  // Create GAMA service with test configuration
  const gamaService = new GAMAService({
    id: 'gama-integration-test',
    modelPath: 'models/gama-test',
    maxMemory: '2GB',
    device: 'cpu',
    quantization: '8bit',
    logConfig: {
      level: 'error',
      console: false
    }
  });

  // Initialize service
  await gamaService.initialize();

  // Create feature memory
  const featureMemory = new SimpleFeatureMemory();

  // Create adapter
  const gamaAdapter = new GAMAAdapter({
    gamaService,
    featureMemory
  });

  return {
    gamaService,
    gamaAdapter,
    featureMemory,
    cleanup: async () => {
      await gamaService.shutdown();
    }
  };
}

export function createTestAudio(duration = 1, sampleRate = 16000): SimpleAudioBuffer {
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

### Writing Integration Tests

Create integration tests for the GAMA integration:

```typescript
// src/tests/integration/gama-integration.test.ts
import { setupGAMAIntegration, createTestAudio } from './setup';

describe('GAMA Integration', () => {
  let integration: any;

  beforeAll(async () => {
    // Set up integration
    integration = await setupGAMAIntegration();
  });

  afterAll(async () => {
    // Clean up
    await integration.cleanup();
  });

  test('should process audio and extract features', async () => {
    // Arrange
    const audio = createTestAudio(2);

    // Act
    const processResult = await integration.gamaService.process(audio);
    const features = await integration.gamaService.extractFeatures(audio);

    // Assert
    expect(processResult).toBeDefined();
    expect(processResult.transcription).toBeDefined();
    expect(features).toBeDefined();
    expect(features.length).toBeGreaterThan(0);
  });

  test('should handle tasks through adapter', async () => {
    // Arrange
    const audio = createTestAudio(2);
    const task = {
      id: 'task-123',
      type: 'audio.process',
      timestamp: Date.now(),
      data: {
        audio,
        options: {}
      }
    };

    // Act
    const result = await integration.gamaAdapter.handleTask(task);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.transcription).toBeDefined();
  });

  test('should extract and store features', async () => {
    // Arrange
    const audio = createTestAudio(2);

    // Act
    const patternId = await integration.gamaAdapter.extractAndStoreFeatures(audio);

    // Assert
    expect(patternId).toBeDefined();

    // Verify pattern is stored
    const patterns = await integration.featureMemory.findSimilarPatterns(
      await integration.gamaService.extractFeatures(audio),
      { threshold: 0.8, maxResults: 5 }
    );

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].id).toBe(patternId);
  });
});
```

## End-to-End Testing

End-to-end tests verify that the entire system works correctly from the user's perspective. For GAMA, we'll create tests that simulate real-world usage.

### Setting Up End-to-End Tests

Create a separate directory for end-to-end tests:

```
src/
└── tests/
    └── e2e/
        ├── gama-e2e.test.ts
        └── fixtures/
            └── test-audio.wav
```

### Writing End-to-End Tests

Create end-to-end tests for the GAMA integration:

```typescript
// src/tests/e2e/gama-e2e.test.ts
import * as fs from 'fs';
import * as path from 'path';
import { GAMAService } from '../../services/audio/GAMAService';
import { GAMAAdapter } from '../../services/audio/GAMAAdapter';
import { SimpleFeatureMemory } from '../../services/memory/SimpleFeatureMemory';
import { loadAudioFromFile } from '../../utils/audio-loader';

describe('GAMA End-to-End', () => {
  let gamaService: GAMAService;
  let gamaAdapter: GAMAAdapter;
  let featureMemory: SimpleFeatureMemory;

  beforeAll(async () => {
    // Create GAMA service
    gamaService = new GAMAService({
      id: 'gama-e2e-test',
      modelPath: 'models/gama',
      maxMemory: '4GB',
      device: 'cpu',
      quantization: '8bit'
    });

    // Initialize service
    await gamaService.initialize();

    // Create feature memory
    featureMemory = new SimpleFeatureMemory();

    // Create adapter
    gamaAdapter = new GAMAAdapter({
      gamaService,
      featureMemory
    });
  });

  afterAll(async () => {
    // Clean up
    await gamaService.shutdown();
  });

  test('should process real audio file', async () => {
    // Arrange
    const audioPath = path.join(__dirname, 'fixtures', 'test-audio.wav');
    const audio = await loadAudioFromFile(audioPath);

    // Act
    const result = await gamaService.process(audio);

    // Assert
    expect(result).toBeDefined();
    expect(result.transcription).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);

    // Log result for manual verification
    console.log('Transcription:', result.transcription);
  });

  test('should extract features from real audio file', async () => {
    // Arrange
    const audioPath = path.join(__dirname, 'fixtures', 'test-audio.wav');
    const audio = await loadAudioFromFile(audioPath);

    // Act
    const features = await gamaService.extractFeatures(audio);

    // Assert
    expect(features).toBeDefined();
    expect(features.length).toBeGreaterThan(0);

    // Log feature stats for manual verification
    console.log('Feature length:', features.length);
    console.log('Feature min:', Math.min(...features));
    console.log('Feature max:', Math.max(...features));
    console.log('Feature mean:', features.reduce((sum, val) => sum + val, 0) / features.length);
  });

  test('should recognize similar patterns', async () => {
    // Arrange
    const audioPath1 = path.join(__dirname, 'fixtures', 'test-audio.wav');
    const audioPath2 = path.join(__dirname, 'fixtures', 'similar-audio.wav');
    const audio1 = await loadAudioFromFile(audioPath1);
    const audio2 = await loadAudioFromFile(audioPath2);

    // Act
    const patternId = await gamaAdapter.extractAndStoreFeatures(audio1);
    const features2 = await gamaService.extractFeatures(audio2);
    const matches = await featureMemory.findSimilarPatterns(features2, {
      threshold: 0.7,
      maxResults: 5
    });

    // Assert
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe(patternId);
    expect(matches[0].similarity).toBeGreaterThan(0.7);

    // Log matches for manual verification
    console.log('Matches:', matches);
  });
});
```

## Testing Error Handling

Testing error handling is crucial for ensuring the robustness of your GAMA integration.

### Creating Error Tests

Create tests for error handling:

```typescript
// src/services/audio/__tests__/GAMAService.error.test.ts
import { GAMAService } from '../GAMAService';
import { MockGAMABridge } from './mocks/MockGAMABridge';
import { createTestAudio } from './fixtures/audio-samples';

// Mock the GAMABridge module
jest.mock('../utils/GAMABridge', () => {
  return {
    GAMABridge: jest.fn().mockImplementation(() => {
      return new MockGAMABridge();
    })
  };
});

describe('GAMAService Error Handling', () => {
  let gamaService: GAMAService;
  let mockBridge: MockGAMABridge;

  beforeEach(() => {
    // Create a new instance for each test
    gamaService = new GAMAService({
      id: 'gama-test',
      modelPath: 'models/gama',
      maxMemory: '4GB',
      device: 'cpu',
      quantization: '8bit',
      errorConfig: {
        maxRetries: 3,
        backoffFactor: 1.5,
        initialDelayMs: 10 // Small value for testing
      }
    });

    // Get the mock bridge instance
    mockBridge = (gamaService as any).bridge;

    // Initialize
    return gamaService.initialize();
  });

  afterEach(async () => {
    // Clean up after each test
    await gamaService.shutdown();
  });

  test('should retry on timeout errors', async () => {
    // Arrange
    let attempts = 0;

    mockBridge.registerOperation('process_audio', () => {
      attempts++;

      if (attempts <= 2) {
        throw new Error('Operation timed out');
      }

      return {
        transcription: 'Success after retry',
        confidence: 0.9
      };
    });

    const audio = createTestAudio(2);

    // Act
    const result = await gamaService.process(audio);

    // Assert
    expect(attempts).toBe(3);
    expect(result.transcription).toBe('Success after retry');
  });

  test('should handle memory errors with reduced quality', async () => {
    // Arrange
    let usedHighQuality = false;

    mockBridge.registerOperation('process_audio', (data) => {
      const options = data.options || {};

      if (!options.quality || options.quality === 'high') {
        usedHighQuality = true;
        throw new Error('Out of memory');
      }

      return {
        transcription: 'Success with low quality',
        confidence: 0.8,
        quality: options.quality
      };
    });

    const audio = createTestAudio(2);

    // Act
    const result = await gamaService.process(audio, { quality: 'high' });

    // Assert
    expect(usedHighQuality).toBe(true);
    expect(result.transcription).toBe('Success with low quality');
    expect(result.quality).toBe('low');
  });

  test('should give up after max retries', async () => {
    // Arrange
    mockBridge.registerOperation('process_audio', () => {
      throw new Error('Persistent error');
    });

    const audio = createTestAudio(2);

    // Act & Assert
    await expect(gamaService.process(audio)).rejects.toThrow('Persistent error');
  });

  test('should handle bridge restart', async () => {
    // Arrange
    let bridgeRestarted = false;

    // Override shutdown and initialize to track restart
    const originalShutdown = mockBridge.shutdown;
    const originalInitialize = mockBridge.initialize;

    mockBridge.shutdown = async () => {
      await originalShutdown.call(mockBridge);
      bridgeRestarted = true;
    };

    mockBridge.initialize = async () => {
      await originalInitialize.call(mockBridge);
    };

    mockBridge.registerOperation('process_audio', () => {
      if (!bridgeRestarted) {
        throw new Error('Bridge communication error');
      }

      return {
        transcription: 'Success after bridge restart',
        confidence: 0.9
      };
    });

    const audio = createTestAudio(2);

    // Act
    const result = await gamaService.process(audio);

    // Assert
    expect(bridgeRestarted).toBe(true);
    expect(result.transcription).toBe('Success after bridge restart');
  });
});
```

## Performance Testing

Performance testing ensures that your GAMA integration meets performance requirements.

### Creating Performance Tests

Create performance tests:

```typescript
// src/tests/performance/gama-performance.test.ts
import { GAMAService } from '../../services/audio/GAMAService';
import { createTestAudio } from '../integration/setup';

describe('GAMA Performance', () => {
  let gamaService: GAMAService;

  beforeAll(async () => {
    // Create GAMA service
    gamaService = new GAMAService({
      id: 'gama-performance-test',
      modelPath: 'models/gama',
      maxMemory: '4GB',
      device: 'cpu',
      quantization: '8bit'
    });

    // Initialize service
    await gamaService.initialize();
  });

  afterAll(async () => {
    // Clean up
    await gamaService.shutdown();
  });

  test('should process audio within time limit', async () => {
    // Arrange
    const audio = createTestAudio(5); // 5 seconds of audio
    const timeLimit = 10000; // 10 seconds

    // Act
    const startTime = Date.now();
    const result = await gamaService.process(audio);
    const duration = Date.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(timeLimit);
    console.log(`Processing time: ${duration}ms`);
  });

  test('should extract features within time limit', async () => {
    // Arrange
    const audio = createTestAudio(5); // 5 seconds of audio
    const timeLimit = 5000; // 5 seconds

    // Act
    const startTime = Date.now();
    const features = await gamaService.extractFeatures(audio);
    const duration = Date.now() - startTime;

    // Assert
    expect(duration).toBeLessThan(timeLimit);
    console.log(`Feature extraction time: ${duration}ms`);
  });

  test('should handle batch processing efficiently', async () => {
    // Arrange
    const audioFiles = [
      createTestAudio(1),
      createTestAudio(2),
      createTestAudio(3),
      createTestAudio(4),
      createTestAudio(5)
    ];

    // Act
    const startTime = Date.now();
    const results = await Promise.all(audioFiles.map(audio => gamaService.process(audio)));
    const totalDuration = Date.now() - startTime;

    // Assert
    expect(results.length).toBe(audioFiles.length);

    // Calculate average processing time
    const averageDuration = totalDuration / audioFiles.length;
    console.log(`Total batch processing time: ${totalDuration}ms`);
    console.log(`Average processing time per file: ${averageDuration}ms`);

    // Verify batch processing is more efficient than sequential
    // This is a simple check - in a real test, you would compare with sequential processing
    expect(averageDuration).toBeLessThan(5000); // 5 seconds per file
  });

  test('should maintain performance over multiple calls', async () => {
    // Arrange
    const audio = createTestAudio(3); // 3 seconds of audio
    const iterations = 5;
    const durations: number[] = [];

    // Act
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await gamaService.process(audio);
      durations.push(Date.now() - startTime);
    }

    // Assert
    console.log('Processing times:', durations);

    // Calculate statistics
    const average = durations.reduce((sum, val) => sum + val, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const stdDev = Math.sqrt(
      durations.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / durations.length
    );

    console.log(`Average: ${average}ms, Min: ${min}ms, Max: ${max}ms, StdDev: ${stdDev}ms`);

    // Verify performance is consistent
    // This is a simple check - in a real test, you would have more specific requirements
    expect(stdDev / average).toBeLessThan(0.2); // Variation less than 20%
  });
});
```

## Test Coverage

Ensure your tests cover all critical parts of the GAMA integration.

### Running Tests with Coverage

Run tests with coverage:

```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific tests
npm test -- --testPathPattern=GAMAService
```

### Analyzing Coverage Reports

Analyze the coverage report to identify areas that need more testing:

1. Open the coverage report in your browser: `coverage/lcov-report/index.html`
2. Look for files with low coverage
3. Add tests for uncovered code

## Continuous Integration

Set up continuous integration to run tests automatically.

### GitHub Actions Example

Create a GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test -- --coverage

    - name: Upload coverage
      uses: codecov/codecov-action@v2
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
        directory: ./coverage
        fail_ci_if_error: true
```

## Best Practices

### 1. Test Isolation

Ensure each test is isolated and doesn't depend on the state from other tests:

```typescript
// Good practice
beforeEach(() => {
  // Create a fresh instance for each test
  gamaService = new GAMAService(config);
});

// Bad practice
let gamaService: GAMAService;

beforeAll(() => {
  // Using the same instance for all tests
  gamaService = new GAMAService(config);
});
```

### 2. Mock External Dependencies

Mock external dependencies to isolate the component being tested:

```typescript
// Good practice
jest.mock('../utils/GAMABridge');

// Bad practice
// Using the real GAMABridge in unit tests
```

### 3. Test Error Cases

Test error cases to ensure your code handles errors gracefully:

```typescript
// Good practice
test('should handle errors gracefully', async () => {
  mockGAMAService.process.mockRejectedValue(new Error('Test error'));

  const result = await gamaAdapter.handleTask(task);

  expect(result.success).toBe(false);
  expect(result.error).toBe('Test error');
});

// Bad practice
// Only testing the happy path
```

### 4. Use Descriptive Test Names

Use descriptive test names to make it clear what each test is checking:

```typescript
// Good practice
test('should retry on timeout errors', async () => {
  // Test code
});

// Bad practice
test('timeout test', async () => {
  // Test code
});
```

### 5. Keep Tests Fast

Keep tests fast to encourage frequent testing:

```typescript
// Good practice
// Using mocks for external dependencies
jest.mock('../utils/GAMABridge');

// Bad practice
// Using real external dependencies that slow down tests
```

## Conclusion

This tutorial covered how to write effective tests for the GAMA integration. You've learned how to:

1. Create unit tests for individual components
2. Write integration tests to verify component interactions
3. Implement end-to-end tests for real-world scenarios
4. Test error handling and performance
5. Set up continuous integration

By following these practices, you can ensure the reliability and correctness of your GAMA integration.

## Next Steps

- Explore advanced features in the [Advanced Features Tutorial](./advanced-features.md)
- Learn how to extend GAMA functionality in the [Extension Tutorial](./extension-tutorial.md)
- Review the [API Reference](../technical/api-reference.md) for detailed information about the GAMA API

