# Resource Management Guide

The grym-synth includes a sophisticated resource management system for handling LLM models efficiently. This guide explains how to use and configure the system.

## Implementation Status

### Completed Features
1. **Model Lifecycle Management**
   - Automatic model loading/unloading ✓
   - Platform-specific handling (Ollama/LM Studio) ✓
   - Inactivity-based cleanup ✓
   - Concurrent model limits ✓

2. **Memory Optimization**
   - Progressive optimization strategies ✓
   - Context window compression ✓
   - Working memory optimization ✓
   - Disk caching support ✓

3. **Resource Monitoring**
   - Real-time metrics collection ✓
   - Memory pressure detection ✓
   - Performance analytics ✓
   - Buffer utilization tracking ✓

### In Progress Features
1. **Context Preservation**
   - Basic framework implemented ✓
   - Multiple preservation strategies defined ✓
   - Pending:
     - Actual summarization implementation
     - Integration testing with model switching
     - Performance optimization

2. **Error Handling**
   - Basic error recovery implemented ✓
   - Pending:
     - Enhanced transition handling
     - Recovery strategies for complex scenarios
     - Comprehensive error reporting

### Next Steps
1. **Context Preservation Completion**
   - Implement summarization logic
   - Add compression algorithms
   - Integrate with model switching
   - Add performance optimizations

2. **Error Handling Enhancement**
   - Implement recovery strategies
   - Improve error reporting
   - Add transition safeguards

3. **Performance Monitoring**
   - Add detailed metrics
   - Create monitoring dashboard
   - Implement alerting system

4. **Resource Optimization**
   - Implement cross-model memory sharing
   - Add GPU support
   - Optimize cache management

## Overview

The resource management system provides:
- Automatic model lifecycle management
- Memory usage optimization
- Multi-provider support (Ollama/LM Studio)
- Real-time resource monitoring
- Event-based system metrics
- Sophisticated memory allocation and compression
- Context window optimization
- Intelligent buffer management
- Progressive memory optimization
- Graceful cleanup handling

## Features

### 1. Model Lifecycle Management

```typescript
import { resourceManager } from './lib/llm/providers/resource-manager';

// Load a model
await resourceManager.loadModel('deepseek-r1:14b');

// Model will be automatically unloaded when inactive
```

The system automatically:
- Tracks model usage
- Unloads inactive models
- Manages concurrent model limits
- Handles platform-specific loading
- Optimizes memory allocation
- Compresses context when needed
- Ensures graceful cleanup

### 2. Resource Monitoring

```typescript
// Get current metrics
const metrics = await resourceManager.getResourceMetrics();
console.log('System resources:', metrics.system);
console.log('Active models:', metrics.models);

// Listen for updates
resourceManager.addEventListener((type, data) => {
  if (type === 'metricsUpdated') {
    console.log('Memory usage:', data.system.allocatedMemory);
    console.log('Peak memory:', data.system.peakMemory);
    console.log('Memory pressure:', data.system.memoryPressure);
  }
});
```

Monitored metrics include:
- Memory usage per model
- System-wide memory allocation
- Peak memory usage
- Available CPU cores
- GPU memory (if available)
- Buffer utilization
- Context window size
- Memory pressure indicators
- Active request tracking

### 3. Configuration

```typescript
resourceManager.configure({
  limits: {
    maxModelsLoaded: 3,        // Maximum concurrent models
    memoryThreshold: 0.8,      // 80% memory utilization threshold
    inactivityTimeout: 300000  // 5 minutes
  },
  modelSizes: {
    'deepseek-r1:14b': 14000,  // 14GB in MB
    'qwen2.5-coder': 7000      // 7GB in MB
  },
  buffers: {
    context: {
      initial: 2000,           // Initial context buffer size (MB)
      max: 4000,              // Maximum context buffer size (MB)
      compressionThreshold: 0.8 // Compression threshold
    },
    working: {
      initial: 1000,           // Initial working memory (MB)
      max: 2000,              // Maximum working memory (MB)
      optimizationThreshold: 0.9 // Optimization threshold
    }
  },
  memoryPressure: {
    warning: 0.7,              // Warning threshold (70% utilization)
    critical: 0.9,             // Critical threshold (90% utilization)
    action: 'compress'         // Default action: 'compress', 'unload', or 'cache'
  },
  debug: true  // Enable debug logging
});
```

Configuration options:
- Resource limits
- Model size estimates
- Memory buffer settings
- Memory pressure thresholds
- Debug logging
- Event handling
- Compression thresholds

### 4. Event System

```typescript
resourceManager.addEventListener((type, data) => {
  switch (type) {
    case 'modelLoaded':
      console.log(`Model ${data.modelId} loaded`);
      break;
    case 'modelUnloaded':
      console.log(`Model ${data.modelId} unloaded`);
      break;
    case 'resourcesFreed':
      console.log('Resources freed:', data.unloadedModels);
      break;
    case 'metricsUpdated':
      console.log('System metrics updated:', data.system);
      break;
    case 'memoryOptimized':
      console.log('Memory optimized:', {
        modelId: data.modelId,
        strategy: data.strategy,
        savedMemory: data.savedMemory
      });
      break;
  }
});
```

Available events:
- `modelLoaded`: When a model is loaded
- `modelUnloaded`: When a model is unloaded
- `resourcesFreed`: When resources are freed
- `metricsUpdated`: When system metrics are updated
- `memoryOptimized`: When memory optimization occurs
- `contextCompressed`: When context window is compressed
- `workingMemoryOptimized`: When working memory is optimized
- `modelCached`: When model data is moved to disk cache
- `contextPruned`: When context is pruned
- `error`: When an error occurs

Example event data:
```typescript
// Context compression event
{
  type: 'contextCompressed',
  data: {
    modelId: 'deepseek-r1:14b',
    metrics: {
      beforeSize: 2500,      // KB before compression
      afterSize: 800,        // KB after compression
      compressionRatio: 3.125 // Compression achieved
    }
  }
}

// Working memory optimization event
{
  type: 'workingMemoryOptimized',
  data: {
    modelId: 'deepseek-r1:14b',
    metrics: {
      beforeSize: 1500,        // MB before optimization
      afterSize: 800,          // MB after optimization
      memoryReduction: 700     // MB saved
    }
  }
}

// Model caching event
{
  type: 'modelCached',
  data: {
    modelId: 'deepseek-r1:14b',
    cachePath: '.cache/models/deepseek-r1-14b-1234567890.cache',
    metrics: {
      beforeSize: 14000,    // MB before caching
      afterSize: 7000,      // MB after caching
      savedMemory: 7000     // MB saved
    }
  }
}

// Context pruning event
{
  type: 'contextPruned',
  data: {
    modelId: 'deepseek-r1:14b',
    metrics: {
      beforeSize: 2000,       // Messages before pruning
      afterSize: 1000,        // Messages after pruning
      removedMessages: 1000,  // Number of messages removed
      memoryReduction: 1500   // KB saved
    }
  }
}
```

## Memory Management

### 1. Buffer Types

The system manages different types of memory buffers:

```typescript
interface MemoryBuffers {
  context: number;   // Context window memory
  model: number;     // Model weights
  working: number;   // Working memory for inference
}
```

### 2. Memory Optimization

The system employs several strategies for memory optimization:

#### Progressive Memory Optimization
```typescript
// The system automatically applies progressive optimization
// based on memory pressure levels:

// Stage 1: Context Window Compression (at warning level)
await resourceManager.compressContextWindow('model-id');

// Stage 2: Working Memory Optimization (at critical level)
await resourceManager.reduceWorkingMemory('model-id');

// Stage 3: Disk Caching (if still under pressure)
await resourceManager.moveToCache('model-id');

// Example optimization result with strategy:
{
  modelId: 'deepseek-r1:14b',
  savedMemory: 5000,         // MB saved
  strategy: 'aggressive',    // 'standard' or 'aggressive'
  timestamp: 1643673600000
}
```

#### Context Window Compression
```typescript
// Automatic context compression when needed
await resourceManager.optimizeMemory('model-id');

// Manual compression with smart summarization
await resourceManager.compressContextWindow('model-id');
// This will:
// 1. Keep last 10 messages intact
// 2. Summarize older messages
// 3. Replace old messages with summary
// 4. Update metrics and emit events

// Example compression result:
{
  beforeSize: 2500,      // KB before compression
  afterSize: 800,        // KB after compression
  compressionRatio: 3.125 // Compression achieved
}
```

#### Working Memory Optimization
```typescript
// Optimize working memory with multiple strategies
await resourceManager.reduceWorkingMemory('model-id');
// This will:
// 1. Clear unused caches
// 2. Reduce batch size for Ollama models
// 3. Optimize tensor allocations
// 4. Update memory metrics

// Example optimization result:
{
  beforeSize: 1500,        // MB before optimization
  afterSize: 800,          // MB after optimization
  memoryReduction: 700     // MB saved
}
```

#### Disk Caching
```typescript
// Move model data to disk when under memory pressure
await resourceManager.moveToCache('model-id');
// This will:
// 1. Create cache directory if needed
// 2. Save model context and metadata
// 3. Clear memory buffers
// 4. Update model metrics

// Example caching result:
{
  modelId: 'deepseek-r1:14b',
  cachePath: '.cache/models/deepseek-r1-14b-1234567890.cache',
  metrics: {
    beforeSize: 14000,    // MB before caching
    afterSize: 7000,      // MB after caching
    savedMemory: 7000     // MB saved
  }
}
```

#### Context Pruning
```typescript
// Prune context based on importance scoring
await resourceManager.pruneContext('model-id', {
  targetSize: 1000  // Optional target size in KB
});
// This will:
// 1. Score messages by importance
// 2. Keep most important messages
// 3. Update context size
// 4. Emit pruning metrics

// Example pruning result:
{
  beforeSize: 2000,       // Messages before pruning
  afterSize: 1000,        // Messages after pruning
  removedMessages: 1000,  // Number of messages removed
  memoryReduction: 1500   // KB saved
}
```

### 3. Memory Pressure Handling

The system automatically handles memory pressure with progressive optimization:

```typescript
// Configure memory pressure thresholds
resourceManager.configure({
  memoryPressure: {
    warning: 0.7,    // 70% utilization - Start basic optimization
    critical: 0.9,   // 90% utilization - Aggressive optimization
    action: 'compress' // Default action strategy
  }
});

// The system will automatically:
// 1. Monitor memory pressure
// 2. Apply progressive optimization based on pressure level
// 3. Use appropriate strategies for each level
// 4. Track and report optimization results
```

## Integration with Providers

### Ollama Integration

```typescript
// The resource manager automatically handles Ollama models
await resourceManager.loadModel('deepseek-r1:14b');

// Cleanup process:
// 1. Waits for active requests to complete
// 2. Clears context and working memory
// 3. Removes model caches
// 4. Updates system metrics
```

### LM Studio Integration

```typescript
// Use lmstudio: prefix for LM Studio models
await resourceManager.loadModel('lmstudio:mistral-7b');
```

## Error Handling

```typescript
try {
  await resourceManager.loadModel('invalid-model');
} catch (error) {
  if (error instanceof ResourceError) {
    switch (error.code) {
      case 'RESOURCE_LIMIT_EXCEEDED':
        console.log('Resource limit exceeded');
        break;
      case 'MODEL_LOAD_FAILED':
        console.log('Failed to load model');
        break;
      case 'INVALID_MODEL_ID':
        console.log('Invalid model ID');
        break;
      case 'MEMORY_OPTIMIZATION_FAILED':
        console.log('Memory optimization failed');
        break;
    }
  }
}
```

Error types:
- `RESOURCE_LIMIT_EXCEEDED`: When resource limits are exceeded
- `MODEL_LOAD_FAILED`: When model loading fails
- `MODEL_UNLOAD_FAILED`: When model unloading fails
- `INVALID_MODEL_ID`: When an invalid model ID is provided
- `MEMORY_OPTIMIZATION_FAILED`: When memory optimization fails
- `SYSTEM_ERROR`: For general system errors

## Best Practices

1. **Configure Memory Thresholds**
   ```typescript
   resourceManager.configure({
     limits: {
       memoryThreshold: 0.8  // Leave 20% memory buffer
     },
     buffers: {
       context: {
         compressionThreshold: 0.8  // Compress at 80% context usage
       }
     },
     memoryPressure: {
       warning: 0.7,    // Start optimization early
       critical: 0.9    // Aggressive optimization
     }
   });
   ```

2. **Handle Memory Events**
   ```typescript
   resourceManager.addEventListener((type, data) => {
     if (type === 'memoryOptimized') {
       console.log('Memory optimization occurred:', {
         modelId: data.modelId,
         savedMemory: data.savedMemory,
         strategy: data.strategy
       });
     }
   });
   ```

3. **Monitor Memory Pressure**
   ```typescript
   setInterval(async () => {
     const metrics = await resourceManager.getResourceMetrics();
     if (metrics.system.memoryPressure > 0.7) {
       await resourceManager.optimizeMemory();
     }
   }, 60000);
   ```

4. **Clean Up Resources**
   ```typescript
   // Clean up when done
   await resourceManager.freeResources();
   resourceManager.destroy();
   ```

## Technical Details

The resource management system is built on these key interfaces:

```typescript
interface ModelResourceMetrics {
  memoryUsage: number;     // Memory usage in MB
  loadTime: number;        // Load time in ms
  contextSize: number;     // Current tokens in context
  lastUsed: Date;         // Last usage timestamp
  activeRequests: number; // Current active requests
  platform: 'ollama' | 'lmstudio';
  status: 'loading' | 'ready' | 'unloading' | 'error';
  buffers: {              // Different memory types
    context: number;      // Context window memory
    model: number;        // Model weights
    working: number;      // Working memory
  };
}

interface SystemResources {
  totalMemory: number;     // Total available memory
  allocatedMemory: number; // Memory in use
  peakMemory: number;      // Highest memory usage
  availableCores: number;  // CPU cores available
  gpuMemory?: number;      // GPU memory if available
  memoryPressure: number;  // Current memory pressure
}
```

For more technical details, see [TDR-007-RESOURCE-MANAGEMENT.md](./TDR-007-RESOURCE-MANAGEMENT.md).

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [TDR-007-RESOURCE-MANAGEMENT.md](./TDR-007-RESOURCE-MANAGEMENT.md) - Technical decision record
- [LEARNING-PROFILES-GUIDE.md](./LEARNING-PROFILES-GUIDE.md) - Learning profiles integration

