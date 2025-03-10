# Qwen2-Audio Memory Management

## Overview
This document describes the memory management system implemented for Qwen2-Audio model running through Nexa-SDK. The system ensures safe and efficient memory usage while providing different quantization options for various hardware constraints.

## Memory Requirements

### Quantization Options

| Quantization | RAM Required | Type | Min Free Memory | Use Case |
|--------------|-------------|------|-----------------|----------|
| Q4_K_M | 4.2GB | edge_optimized | 512MB | Default balanced option |
| Q4_0 | 3.8GB | edge_optimized | 512MB | Resource-constrained devices |
| Q5_K_M | 4.8GB | quality_optimized | 768MB | High-performance systems |

### System Requirements

- Minimum System Memory: 8GB
- Recommended System Memory: 16GB
- High Performance Mode: 32GB+

## Memory Manager Features

### 1. Automatic Quantization Selection

The system automatically recommends the appropriate quantization based on available system memory:

```typescript
// High-memory systems (32GB+)
if (total >= 32GB && available >= 8GB) {
  return Q5_K_M;  // Higher quality
}

// Low-memory systems (8GB or less available)
if (total <= 8GB || available <= 5GB) {
  return Q4_0;    // Most optimized
}

// Standard systems
return Q4_K_M;    // Default balanced
```

### 2. Memory Status Monitoring

The system provides three status levels:

- **OK**: Sufficient memory available
- **Warning**: Available memory approaching minimum threshold
- **Critical**: Available memory below minimum requirement

### 3. Safety Thresholds

Memory loading checks ensure:
- Sufficient absolute free memory for model
- At least 25% free memory after loading
- Minimum free memory buffer maintained

## Usage Guide

### 1. Basic Usage

```typescript
import { Qwen2MemoryManager, Qwen2Quantization } from './qwen-memory-manager';

const manager = new Qwen2MemoryManager();

// Check if we can load the model
const canLoad = await manager.canLoadModel(Qwen2Quantization.Q4_K_M);
if (canLoad) {
  await manager.registerModelLoad(Qwen2Quantization.Q4_K_M);
}
```

### 2. Memory Monitoring

```typescript
// Get current memory status
const status = manager.checkMemoryStatus();
if (status.status === 'warning') {
  console.warn(status.warning);
}

// Get detailed memory stats
const stats = manager.getMemoryStats();
console.log(`Used Memory: ${stats.percentUsed}%`);
```

### 3. Automatic Quantization

```typescript
// Let the system choose best quantization
const recommended = await manager.getRecommendedQuantization();
await manager.registerModelLoad(recommended);
```

## Memory Recovery

The system supports manual cleanup through model unloading:

```typescript
// Unregister model to free memory
manager.unregisterModel();
```

## Integration with Nexa-SDK

When using with Nexa-SDK:

1. Initialize memory manager first
2. Check memory availability before model load
3. Use recommended quantization when possible
4. Monitor memory status during operations

Example:
```typescript
const manager = new Qwen2MemoryManager();
const nexa = await NexaSDK.initialize();

// Check memory before loading
const canLoad = await manager.canLoadModel();
if (!canLoad) {
  throw new Error('Insufficient memory for model load');
}

// Get recommended quantization
const quantization = await manager.getRecommendedQuantization();

// Load model with appropriate quantization
await nexa.loadModel('qwen2audio', {
  quantization: quantization
});

// Register the load with memory manager
await manager.registerModelLoad(quantization);
```

## Memory Thresholds Explained

The system uses several thresholds for memory management:

1. **Base Memory**:
   - Q4_K_M: 4.2GB base + 512MB buffer
   - Q4_0: 3.8GB base + 512MB buffer
   - Q5_K_M: 4.8GB base + 768MB buffer

2. **Warning Triggers**:
   - Less than 2x minimum free memory
   - Example: <1GB free for Q4_K_M

3. **Critical Triggers**:
   - Less than minimum free memory
   - Example: <512MB free for Q4_K_M

## Best Practices

1. **Memory Monitoring**:
   - Regularly check memory status
   - React to warning states proactively
   - Clean up unused resources promptly

2. **Model Loading**:
   - Always check memory availability before loading
   - Use recommended quantization when possible
   - Maintain minimum free memory buffers

3. **Error Handling**:
   - Handle insufficient memory errors gracefully
   - Implement fallback strategies for low memory
   - Log memory-related issues for monitoring

## Performance Considerations

1. **Memory Impact**:
   - Loading model: 3.8GB - 4.8GB
   - Audio processing: ~100MB additional
   - System overhead: ~512MB-768MB buffer

2. **Recovery Behavior**:
   - Unloading model releases majority of memory
   - Some system memory remains cached
   - GC helps recover temporary allocations

## Testing

The memory management system includes comprehensive tests:
- Unit tests for all core functionality
- Memory threshold verification
- Load/unload cycle testing
- Status monitoring validation

Test coverage:
- Statements: 94.82%
- Branches: 84.21%
- Functions: 100%
