# Wav2Vec2 Integration Guide

This guide covers the integration of Wav2Vec2 models through our Python Bridge implementation.

## Architecture Overview

The Wav2Vec2 integration consists of:

1. **Python Backend**
   - FastAPI server for model inference
   - Support for multiple Wav2Vec2 models
   - Health monitoring and GPU utilization
   - Asynchronous model loading

2. **TypeScript Bridge**
   - PythonBridgeService for communication
   - Circuit breaker pattern for reliability
   - Streaming support for large files
   - Type-safe interfaces

3. **Feature Adapter**
   - Wav2Vec2FeatureAdapter implementation
   - Integration with feature storage system
   - Pattern creation and comparison
   - Error handling and monitoring

## Setup Instructions

### Python Backend Setup

1. Install dependencies:
```bash
cd app/api
pip install -r requirements.txt
```

2. Start the server:
```bash
python server.py
```

The server runs on `http://localhost:8000` by default.

### TypeScript Integration

```typescript
import { Wav2Vec2FeatureAdapter } from '../adapters/wav2vec2';
import { HealthMonitor } from '../monitoring/HealthMonitor';

const adapter = new Wav2Vec2FeatureAdapter(
  'http://localhost:8000',
  {
    modelType: 'base',
    useQuantization: false
  },
  5000, // timeout
  {
    maxRetries: 3,
    backoff: 1000
  },
  new HealthMonitor()
);

await adapter.initialize();
```

## Model Management

### Loading Models

```typescript
await adapter.loadModel({
  name: 'wav2vec2-base',
  path: 'facebook/wav2vec2-base-960h',
  parameters: {
    useQuantization: false
  }
});
```

### Processing Audio

```typescript
const features = await adapter.extractFeatures(audioBuffer);
```

### Creating Patterns

```typescript
const pattern = await adapter.createPattern(audioBuffer, {
  startTime: 0,
  endTime: 1.5,
  frequencyRange: { low: 20, high: 8000 }
});
```

## Error Handling

The system provides comprehensive error handling:

- Circuit breaker for service protection
- Automatic retries with backoff
- Health monitoring integration
- Type-safe error handling
- Detailed error logging

## Health Monitoring

The integration includes health monitoring:

- GPU utilization tracking
- Model loading status
- Processing latency metrics
- Error rate monitoring
- Resource usage tracking

## Performance Considerations

### Model Loading

- Models are loaded asynchronously
- Support for model caching
- Automatic model unloading for memory management
- GPU memory optimization

### Audio Processing

- Streaming support for large files
- Batch processing capabilities
- Optimized feature extraction
- Memory-efficient processing

## API Reference

### PythonBridgeService

```typescript
interface PythonBridgeConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  healthEndpoint: string;
  modelEndpoints: Record<string, string>;
}

class PythonBridgeService {
  constructor(config: PythonBridgeConfig, healthMonitor: HealthMonitor);
  checkHealth(): Promise<boolean>;
  processAudio(buffer: AudioBuffer, model: string, options: ProcessingOptions): Promise<Float32Array>;
  processAudioStream(chunks: AudioBuffer[], model: string, options: ProcessingOptions): Promise<Float32Array[]>;
  loadModel(config: ModelConfig): Promise<boolean>;
}
```

### Wav2Vec2FeatureAdapter

```typescript
class Wav2Vec2FeatureAdapter implements FeatureAdapter {
  constructor(
    endpoint: string,
    parameters: Record<string, any>,
    timeout: number,
    retryConfig?: { maxRetries: number; backoff: number },
    healthMonitor?: HealthMonitor
  );
  
  initialize(config?: any): Promise<boolean>;
  extractFeatures(audioBuffer: AudioBuffer): Promise<Float32Array>;
  createPattern(audioBuffer: AudioBuffer, region: Region): Promise<AudioPattern>;
  compareFeatures(featuresA: Float32Array, featuresB: Float32Array): Promise<number>;
  dispose(): void;
}
```

## Common Issues & Solutions

1. **Model Loading Failures**
   - Ensure sufficient GPU memory
   - Check model path validity
   - Verify network connectivity

2. **Processing Timeouts**
   - Adjust timeout configuration
   - Consider streaming for large files
   - Monitor system resources

3. **Memory Issues**
   - Enable model unloading
   - Use streaming for large files
   - Monitor GPU memory usage

## Best Practices

1. **Initialization**
   - Always initialize adapter before use
   - Handle initialization failures gracefully
   - Monitor initialization status

2. **Error Handling**
   - Implement proper error boundaries
   - Use provided error handling utilities
   - Monitor error rates

3. **Resource Management**
   - Dispose adapters when not in use
   - Monitor memory usage
   - Use streaming for large files

4. **Performance**
   - Batch similar requests
   - Reuse adapter instances
   - Monitor processing latency
