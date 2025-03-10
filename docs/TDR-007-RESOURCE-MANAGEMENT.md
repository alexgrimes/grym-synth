# TDR-007: LLM Resource Management System

## Context

The grym-synth needs to efficiently manage multiple LLM models across different providers (Ollama and LM Studio). These models can be resource-intensive, requiring careful management of system memory and computational resources. We need a system that can:

- Handle concurrent model loading/unloading
- Monitor and optimize resource usage
- Prevent system overload
- Maintain responsive performance
- Support multiple LLM providers
- Optimize memory allocation and usage
- Handle context window efficiently
- Manage different types of memory buffers
- Provide graceful degradation under pressure

## Decision

Implement a centralized ResourceManager that handles:

1. Model Lifecycle Management
   - Automatic loading/unloading of models
   - Inactivity-based cleanup
   - Concurrent model limits
   - Memory buffer allocation
   - Graceful cleanup handling

2. Resource Monitoring
   - Memory usage tracking
   - System metrics collection
   - Performance analytics
   - Buffer utilization tracking
   - Memory pressure monitoring
   - Active request tracking

3. Resource Optimization
   - Progressive optimization strategy
   - Memory pressure detection
   - Proactive resource cleanup
   - Context window compression
   - Working memory optimization
   - Disk caching for inactive parts

### Core Interfaces

```typescript
interface MemoryAllocation {
  modelId: string;
  allocated: number;    // Allocated memory
  used: number;        // Actually used memory
  peak: number;        // Peak usage
  buffers: {           // Different memory types
    context: number;   // Context window memory
    model: number;     // Model weights
    working: number;   // Working memory for inference
  };
}

interface ModelResourceMetrics {
  memoryUsage: number;     // in MB
  loadTime: number;        // in ms
  contextSize: number;     // current tokens in context
  lastUsed: Date;
  activeRequests: number;
  platform: 'ollama' | 'lmstudio';
  status: 'loading' | 'ready' | 'unloading' | 'error';
  buffers: {              // Memory buffer metrics
    context: number;      // Context window memory
    model: number;        // Model weights
    working: number;      // Working memory
  };
}

interface SystemResources {
  totalMemory: number;     // Total available system memory
  allocatedMemory: number; // Memory currently in use
  peakMemory: number;      // Highest memory usage observed
  availableCores: number;  // CPU cores available
  gpuMemory?: number;      // GPU memory if available
  memoryPressure: number;  // Current memory pressure level
}
```

### Resource Limits and Configuration

```typescript
interface ResourceLimits {
  maxModelsLoaded: number;    // Maximum concurrent models
  memoryThreshold: number;    // Memory utilization threshold
  inactivityTimeout: number;  // Model unload timeout
}

interface BufferConfig {
  context: {
    initial: number;          // Initial context buffer size
    max: number;             // Maximum context buffer size
    compressionThreshold: number; // When to compress
  };
  working: {
    initial: number;         // Initial working memory
    max: number;            // Maximum working memory
    optimizationThreshold: number; // When to optimize
  };
}

interface MemoryPressureConfig {
  warning: number;           // Warning threshold (e.g., 0.7)
  critical: number;          // Critical threshold (e.g., 0.9)
  action: 'compress' | 'unload' | 'cache'; // Default action
}
```

## Rationale

### Why Enhanced Memory Management?

1. **Granular Control**
   - Separate management of different memory types
   - Targeted optimization strategies
   - Better resource utilization
   - Progressive optimization approach

2. **Improved Efficiency**
   - Context window compression
   - Working memory optimization
   - Disk caching for inactive data
   - Memory pressure handling
   - Graceful degradation

3. **Better Scalability**
   - Handles larger models
   - Supports more concurrent users
   - Adapts to resource constraints
   - Predictable performance

### Memory Management Strategy

1. **Buffer Types**
   - Context Window: Stores conversation history and prompts
   - Model Weights: Core model parameters
   - Working Memory: Temporary computation space

2. **Optimization Techniques**
   - Context Summarization: Compress older context
   - Selective Pruning: Remove redundant information
   - Working Memory Reduction: Clear caches, optimize tensors
   - Disk Caching: Offload inactive data

3. **Memory Pressure Handling**
   - Progressive optimization steps
   - Multiple compression strategies
   - Graceful degradation path
   - Active request tracking

### Implementation Strategy

1. **Memory Allocation**
   ```typescript
   async allocateMemory(request: {
     modelId: string;
     required: number;
     preferred: number;
   }): Promise<boolean> {
     // Check available resources
     if (!this.canAllocate(request.required)) {
       await this.freeMemory(request.required);
     }
     return this.performAllocation(request);
   }
   ```

2. **Progressive Memory Optimization**
   ```typescript
   async optimizeMemory(modelId: string) {
     const allocation = this.allocations.get(modelId);
     if (!allocation) return;

     const memoryPressure = this.systemMetrics.memoryPressure;

     // Stage 1: Basic optimization at warning level
     if (memoryPressure > this.memoryPressure.warning) {
       await this.compressContextWindow(modelId);
     }

     // Stage 2: Aggressive optimization at critical level
     if (memoryPressure > this.memoryPressure.critical) {
       await this.reduceWorkingMemory(modelId);
       
       // Stage 3: Last resort - move to disk
       if (this.isUnderMemoryPressure()) {
         await this.moveToCache(modelId);
       }
     }
   }
   ```

3. **Graceful Cleanup**
   ```typescript
   private async unloadOllamaModel(modelId: string) {
     const model = this.activeModels.get(modelId);
     if (!model) return;

     try {
       // Wait for active requests to complete
       if (model.activeRequests > 0) {
         await this.waitForRequests(modelId);
       }

       // Clear context and working memory
       await this.clearModelMemory(modelId);

       // Clear model caches
       await this.clearModelCaches(modelId);

       // Update metrics
       this.systemMetrics.allocatedMemory -= model.memoryUsage;
     } catch (error) {
       this.logError('Cleanup failed', modelId, error);
       throw error;
     }
   }
   ```

## Consequences

### Positive

1. **Enhanced Performance**
   - More efficient memory usage
   - Better handling of large models
   - Reduced memory pressure
   - Smoother user experience
   - Predictable degradation

2. **Improved Scalability**
   - Supports more concurrent models
   - Better resource utilization
   - Handles larger context windows
   - More efficient caching
   - Progressive optimization

3. **Better Reliability**
   - Proactive memory management
   - Graceful degradation
   - Reduced OOM errors
   - More stable operation
   - Clean resource cleanup

### Negative

1. **Implementation Complexity**
   - More sophisticated memory tracking
   - Complex optimization logic
   - Additional state management
   - More configuration options
   - Cleanup coordination

2. **Performance Overhead**
   - Compression/decompression costs
   - Memory tracking overhead
   - Cache management overhead
   - Optimization processing time
   - Request tracking overhead

## Future Considerations

1. **Advanced Memory Management**
   - GPU memory optimization
   - Distributed memory management
   - Cross-model memory sharing
   - Dynamic buffer sizing
   - Adaptive thresholds

2. **Enhanced Optimization**
   - ML-based memory prediction
   - Adaptive compression strategies
   - Smart context pruning
   - Predictive caching
   - Request-aware optimization

3. **Platform Extensions**
   - Cloud resource integration
   - Distributed deployment support
   - Custom memory backends
   - Hardware-specific optimizations
   - Provider-specific enhancements

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [RESOURCE-MANAGEMENT-GUIDE.md](./RESOURCE-MANAGEMENT-GUIDE.md)
- [LEARNING-PROFILES-GUIDE.md](./LEARNING-PROFILES-GUIDE.md)
- [TDR-006-MODEL-LEARNING-PROFILES.md](./TDR-006-MODEL-LEARNING-PROFILES.md)

