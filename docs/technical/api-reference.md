# GAMA API Reference

## Overview

This document provides a comprehensive reference for all public APIs in the GAMA integration. It includes detailed information about classes, methods, interfaces, and their parameters.

## Core Service API

### GAMAService

The main service class that handles audio processing and feature extraction.

#### Constructor

```typescript
constructor(config: GAMAConfig)
```

**Parameters:**
- `config`: Configuration object for the GAMA service
  - `id`: Unique identifier for the service instance
  - `modelPath`: Path to the GAMA model
  - `maxMemory`: Maximum memory to use (e.g., "4GB")
  - `device`: Device to use for processing ("cpu" or "cuda")
  - `quantization`: Quantization level ("8bit", "4bit", or "none")
  - `logConfig`: Logging configuration
  - `monitorConfig`: Monitoring configuration
  - `errorConfig`: Error handling configuration
  - `qaConfig`: Quality assurance configuration

#### Methods

##### initialize

```typescript
async initialize(): Promise<void>
```

Initializes the GAMA service, downloading and verifying the model if necessary.

**Returns:** Promise that resolves when initialization is complete

##### process

```typescript
async process(audio: SimpleAudioBuffer, options?: ProcessOptions): Promise<ProcessResult>
```

Processes audio with the GAMA model.

**Parameters:**
- `audio`: Audio buffer to process
  - `data`: Float32Array containing audio samples
  - `channels`: Number of audio channels
  - `sampleRate`: Sample rate of the audio
- `options`: Processing options (optional)
  - `quality`: Processing quality ("high", "medium", or "low")
  - `maxNewTokens`: Maximum number of new tokens to generate
  - `doSample`: Whether to use sampling for generation
  - `temperature`: Temperature for sampling
  - `topP`: Top-p value for sampling
  - `topK`: Top-k value for sampling

**Returns:** Promise that resolves to the processing result
- `transcription`: Transcribed text
- `confidence`: Confidence score (0-1)
- `segments`: Array of segments with text, start time, end time, and confidence
- `duration`: Duration of the audio in seconds
- `processingTime`: Processing time in milliseconds
- `memoryUsage`: Memory usage statistics

##### extractFeatures

```typescript
async extractFeatures(audio: SimpleAudioBuffer, options?: FeatureExtractionOptions): Promise<Float32Array>
```

Extracts features from audio for pattern recognition.

**Parameters:**
- `audio`: Audio buffer to extract features from
  - `data`: Float32Array containing audio samples
  - `channels`: Number of audio channels
  - `sampleRate`: Sample rate of the audio
- `options`: Feature extraction options (optional)
  - `returnVector`: Whether to return a single feature vector (true) or multiple frames (false)
  - `quality`: Extraction quality ("high", "medium", or "low")

**Returns:** Promise that resolves to a feature vector (Float32Array)

##### shutdown

```typescript
async shutdown(): Promise<void>
```

Shuts down the GAMA service, releasing resources.

**Returns:** Promise that resolves when shutdown is complete

##### ping

```typescript
async ping(): Promise<boolean>
```

Checks if the GAMA service is responsive.

**Returns:** Promise that resolves to true if the service is responsive, false otherwise

## Adapter API

### GAMAAdapter

Adapter for integrating GAMA with the existing orchestration system.

#### Constructor

```typescript
constructor(config: GAMAAdapterConfig)
```

**Parameters:**
- `config`: Configuration object for the GAMA adapter
  - `gamaService`: Instance of the GAMA service
  - `featureMemory`: Instance of the feature memory provider

#### Methods

##### handleTask

```typescript
async handleTask(task: AudioTask): Promise<TaskResult>
```

Handles an audio processing task.

**Parameters:**
- `task`: Task to handle
  - `id`: Unique identifier for the task
  - `type`: Type of task ("audio.process", "audio.extract_features", or "audio.pattern_recognition")
  - `timestamp`: Timestamp when the task was created
  - `data`: Task data
    - `audio`: Audio buffer or path to audio file
    - `options`: Task-specific options

**Returns:** Promise that resolves to the task result
- `success`: Whether the task was successful
- `data`: Task-specific result data
- `error`: Error message if the task failed
- `processingTime`: Processing time in milliseconds

##### extractAndStoreFeatures

```typescript
async extractAndStoreFeatures(audio: SimpleAudioBuffer): Promise<string>
```

Extracts features from audio and stores them in the feature memory system.

**Parameters:**
- `audio`: Audio buffer to extract features from
  - `data`: Float32Array containing audio samples
  - `channels`: Number of audio channels
  - `sampleRate`: Sample rate of the audio

**Returns:** Promise that resolves to the pattern ID

##### getCapabilities

```typescript
getCapabilities(): ModelCapabilities
```

Gets the capabilities of the GAMA model.

**Returns:** Object describing the model's capabilities
- `supportedTasks`: Array of supported task types
- `maxAudioLength`: Maximum audio length in seconds
- `supportedFormats`: Array of supported audio formats
- `features`: Object describing supported features
  - `patternRecognition`: Whether pattern recognition is supported
  - `contextualProcessing`: Whether contextual processing is supported
  - `batchProcessing`: Whether batch processing is supported

## Python Bridge API

### GAMABridge

Handles communication between TypeScript and Python.

#### Constructor

```typescript
constructor()
```

#### Methods

##### initialize

```typescript
async initialize(): Promise<void>
```

Initializes the bridge, starting the Python process.

**Returns:** Promise that resolves when initialization is complete

##### executeOperation

```typescript
async executeOperation(operation: string, data: any): Promise<any>
```

Executes an operation in the Python process.

**Parameters:**
- `operation`: Name of the operation to execute
- `data`: Data to pass to the operation

**Returns:** Promise that resolves to the operation result

##### shutdown

```typescript
async shutdown(): Promise<void>
```

Shuts down the bridge, terminating the Python process.

**Returns:** Promise that resolves when shutdown is complete

## Memory Management API

### MemoryManager

Manages memory usage for GAMA operations.

#### Constructor

```typescript
constructor(config: MemoryConfig)
```

**Parameters:**
- `config`: Memory management configuration
  - `maxMemory`: Maximum memory to use in bytes
  - `maxBatchSize`: Maximum batch size
  - `minItemSize`: Minimum item size in bytes
  - `gradientCheckpointingThreshold`: Threshold for using gradient checkpointing
  - `useQuantization`: Whether to use quantization
  - `monitoringInterval`: Interval for monitoring memory usage in milliseconds
  - `processAudioMemoryPerItem`: Estimated memory per item for audio processing
  - `extractFeaturesMemoryPerItem`: Estimated memory per item for feature extraction
  - `defaultMemoryPerItem`: Default estimated memory per item

#### Methods

##### optimizeForOperation

```typescript
async optimizeForOperation(operation: string, dataSize: number): Promise<OptimizationParams>
```

Optimizes parameters for an operation based on available memory.

**Parameters:**
- `operation`: Name of the operation
- `dataSize`: Size of the data in bytes

**Returns:** Promise that resolves to optimization parameters
- `batchSize`: Optimal batch size
- `precision`: Precision to use ("fp16" or "fp32")
- `useGradientCheckpointing`: Whether to use gradient checkpointing
- `useQuantization`: Whether to use quantization

##### monitorOperation

```typescript
async monitorOperation(operation: string): Promise<MonitoringHandle>
```

Starts monitoring an operation.

**Parameters:**
- `operation`: Name of the operation to monitor

**Returns:** Promise that resolves to a monitoring handle
- `end`: Function to call when the operation is complete

##### releaseResources

```typescript
async releaseResources(): Promise<void>
```

Releases resources, triggering garbage collection if available.

**Returns:** Promise that resolves when resources are released

## Quality Assurance API

### GAMAQualityAssurance

Validates outputs to ensure they meet quality standards.

#### Constructor

```typescript
constructor(config: QAConfig)
```

**Parameters:**
- `config`: Quality assurance configuration
  - `logConfig`: Logging configuration
  - `metricsConfig`: Metrics configuration
  - `audioFeaturesConfig`: Configuration for audio features validation
  - `patternConfig`: Configuration for pattern recognition validation
  - `responseTimeConfig`: Configuration for response time validation

#### Methods

##### validateOutput

```typescript
async validateOutput(output: any, type: string, context?: any): Promise<ValidationResult>
```

Validates an output to ensure it meets quality standards.

**Parameters:**
- `output`: Output to validate
- `type`: Type of output ("audio-features", "pattern-recognition", or "response-time")
- `context`: Additional context for validation (optional)

**Returns:** Promise that resolves to a validation result
- `valid`: Whether the output is valid
- `checks`: Array of validation checks
  - `name`: Name of the check
  - `passed`: Whether the check passed
  - `details`: Details about the check
- `timestamp`: Timestamp when validation was performed

##### getQualityReport

```typescript
async getQualityReport(timeRange?: TimeRange): Promise<QualityReport>
```

Gets a quality report for a time range.

**Parameters:**
- `timeRange`: Time range for the report (optional)
  - `start`: Start time
  - `end`: End time

**Returns:** Promise that resolves to a quality report
- `timeRange`: Time range of the report
- `overallMetrics`: Overall quality metrics
  - `totalCount`: Total number of validations
  - `validCount`: Number of valid validations
  - `validPercentage`: Percentage of valid validations
  - `trend`: Trend information
- `typeMetrics`: Quality metrics by type
  - `type`: Type of output
  - `totalCount`: Total number of validations for this type
  - `validCount`: Number of valid validations for this type
  - `validPercentage`: Percentage of valid validations for this type
  - `commonIssues`: Common issues for this type
- `timestamp`: Timestamp when the report was generated

## Monitoring API

### GAMAMonitor

Collects metrics and monitors the health of the GAMA service.

#### Constructor

```typescript
constructor(config: MonitorConfig)
```

**Parameters:**
- `config`: Monitoring configuration
  - `metricsConfig`: Metrics configuration
  - `logConfig`: Logging configuration
  - `alertConfig`: Alert configuration

#### Methods

##### monitorOperation

```typescript
async monitorOperation(operation: string, context: any): Promise<MonitoringHandle>
```

Starts monitoring an operation.

**Parameters:**
- `operation`: Name of the operation to monitor
- `context`: Additional context for monitoring

**Returns:** Promise that resolves to a monitoring handle
- `operationId`: Unique identifier for the operation
- `end`: Function to call when the operation is complete

##### getMetricsReport

```typescript
async getMetricsReport(timeRange?: TimeRange): Promise<MetricsReport>
```

Gets a metrics report for a time range.

**Parameters:**
- `timeRange`: Time range for the report (optional)
  - `start`: Start time
  - `end`: End time

**Returns:** Promise that resolves to a metrics report
- `timeRange`: Time range of the report
- `metrics`: Metrics data
  - `name`: Name of the metric
  - `values`: Array of metric values
  - `statistics`: Statistical information about the metric
- `operations`: Operation data
  - `name`: Name of the operation
  - `count`: Number of operations
  - `averageDuration`: Average duration in milliseconds
  - `p95Duration`: 95th percentile duration in milliseconds
  - `p99Duration`: 99th percentile duration in milliseconds
  - `errorRate`: Error rate as a percentage
- `timestamp`: Timestamp when the report was generated

## Error Handling API

### GAMAErrorHandler

Handles errors and implements recovery strategies.

#### Constructor

```typescript
constructor(config: ErrorHandlerConfig)
```

**Parameters:**
- `config`: Error handling configuration
  - `logConfig`: Logging configuration
  - `maxRetries`: Maximum number of retries
  - `backoffFactor`: Backoff factor for retries
  - `initialDelayMs`: Initial delay for retries in milliseconds
  - `reducedBatchSize`: Reduced batch size for resource optimization

#### Methods

##### handleError

```typescript
async handleError(error: Error, context: any): Promise<ErrorHandlingResult>
```

Handles an error with appropriate recovery strategies.

**Parameters:**
- `error`: Error to handle
- `context`: Additional context for error handling

**Returns:** Promise that resolves to an error handling result
- `recoverySuccessful`: Whether recovery was successful
- `result`: Result of the recovery if successful
- `error`: Original error if recovery failed
- `errorType`: Type of error
- `recoveryStrategy`: Name of the recovery strategy used

## Python API

### GAMAProcessor (Python)

Handles model operations in Python.

#### Constructor

```python
def __init__(self, model_path: str, device: str = "cuda", quantization: str = "8bit")
```

**Parameters:**
- `model_path`: Path to the GAMA model
- `device`: Device to use for processing ("cuda" or "cpu")
- `quantization`: Quantization level ("8bit", "4bit", or "none")

#### Methods

##### process_audio

```python
def process_audio(self, audio_data: List[float], options: Dict[str, Any] = None) -> Dict[str, Any]
```

Processes audio with the GAMA model.

**Parameters:**
- `audio_data`: List of audio samples
- `options`: Processing options (optional)

**Returns:** Dictionary with processing results
- `transcription`: Transcribed text
- `confidence`: Confidence score (0-1)
- `segments`: List of segments with text, start time, end time, and confidence
- `duration`: Duration of the audio in seconds
- `processing_time`: Processing time in milliseconds
- `memory_usage`: Memory usage statistics

##### extract_features

```python
def extract_features(self, audio_data: List[float], options: Dict[str, Any] = None) -> Dict[str, Any]
```

Extracts features from audio.

**Parameters:**
- `audio_data`: List of audio samples
- `options`: Feature extraction options (optional)
  - `return_vector`: Whether to return a single feature vector (True) or multiple frames (False)

**Returns:** Dictionary with feature extraction results
- `feature_vector` or `features`: Feature vector or list of feature frames
- `metadata`: Metadata about the features (if returning multiple frames)
- `processing_time`: Processing time in milliseconds
- `memory_usage`: Memory usage statistics

##### ping

```python
def ping(self) -> Dict[str, Any]
```

Checks if the service is alive.

**Returns:** Dictionary with status information
- `status`: Status of the service ("ok" or "error")
- `device`: Device being used
- `memory_available`: Available memory in bytes

## Interfaces

### ModelService

```typescript
interface ModelService {
  initialize(): Promise<void>;
  processAudio(audio: AudioBuffer, options: ProcessingOptions): Promise<ProcessedAudio>;
  extractFeatures(audio: AudioBuffer): Promise<FeatureVector>;
  shutdown(): Promise<void>;
}
```

### ModelAdapter

```typescript
interface ModelAdapter {
  handleTask(task: AudioTask): Promise<TaskResult>;
  extractAndStoreFeatures(audio: AudioBuffer): Promise<string>;
  getCapabilities(): ModelCapabilities;
}
```

### FeatureMemoryProvider

```typescript
interface FeatureMemoryProvider {
  storePattern(features: FeatureVector): Promise<string>;
  findSimilarPatterns(features: FeatureVector, options: FindOptions): Promise<Array<PatternMatch>>;
}
```

### MonitoringHandle

```typescript
interface MonitoringHandle {
  operationId: string;
  end(result?: any): Promise<OperationResult>;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  checks: ValidationCheck[];
  timestamp: Date;
  error?: Error;
}
```

### ErrorHandlingResult

```typescript
interface ErrorHandlingResult {
  recoverySuccessful: boolean;
  result?: any;
  error?: Error;
  errorType: string;
  recoveryStrategy?: string;
}
```

## Conclusion

This API reference provides a comprehensive guide to all public APIs in the GAMA integration. It includes detailed information about classes, methods, interfaces, and their parameters, making it a valuable resource for developers working with the GAMA integration.
