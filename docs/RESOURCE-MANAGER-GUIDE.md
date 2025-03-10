# Resource Manager Guide

## Overview
The Resource Manager is a critical component of the grym-synth that handles resource allocation, monitoring, and optimization for LLM operations. It ensures efficient use of system resources while maintaining performance and reliability.

## Core Features

### Resource Monitoring
- Real-time memory usage tracking
- CPU utilization monitoring
- Resource pressure detection
- Event-based monitoring system
- Automatic optimization triggers
- Token window monitoring
- Cache performance tracking

### Memory Management
- Dynamic memory allocation
- Advanced compression strategies
  * Adaptive compression ratios
  * Context-aware compression
  * Selective compression based on importance
- Resource cleanup
- Pressure handling
- Memory optimization
- Token-aware memory management
- Window-based optimization

### Disk Cache
- Persistent context storage
- Advanced cache management policies
  * LRU with importance scoring
  * Adaptive cache sizing
  * Predictive prefetching
- Intelligent eviction strategies
- Atomic file operations
- Cache consistency
- Compression-aware caching
- Memory-mapped operations

### Error Handling
- Resource exhaustion recovery
- System failure resilience
- Circuit breaking
  * Adaptive thresholds
  * State-aware breaking
  * Gradual recovery
- Error propagation control
- Graceful degradation
- Token budget enforcement

### Context Management
- Efficient context initialization
- Advanced token management
  * Dynamic window sizing
  * Token budget optimization
  * Importance-based truncation
- Message validation
- Context cleanup
- State management
- Memory-efficient context storage

## Implementation Status

### Completed Features
- ✅ Resource monitoring system
- ✅ Memory compression
  * Adaptive compression
  * Context-aware optimization
  * Performance monitoring
- ✅ Disk caching
  * Smart eviction
  * Prefetching
  * Compression integration
- ✅ Error handling
- ✅ Circuit breaking
- ✅ Message validation
- ✅ Context management
- ✅ Token management
  * Window optimization
  * Budget control
  * Truncation strategies
- ✅ Lifecycle management

### Test Coverage
All core functionality has been thoroughly tested:
- Resource monitoring tests
- Memory management tests
  * Compression efficiency
  * Resource allocation
  * Pressure handling
- Memory compression tests
  * Ratio verification
  * Performance impact
  * Recovery behavior
- Disk cache tests
  * Hit rate optimization
  * Eviction accuracy
  * Compression integration
- Error handling tests
- Circuit breaker tests
- Message validation tests
- Context management tests
- Token management tests
  * Window sizing
  * Budget enforcement
  * Truncation accuracy
- Lifecycle tests

### Next Steps
1. Performance Testing
   - Implement comprehensive performance test suite
   - Measure system latency
   - Test throughput capabilities
   - Verify resource utilization
   - Validate scaling behavior
   - Monitor compression ratios
   - Track cache efficiency

2. Load Testing
   - Test high concurrency scenarios
   - Verify resource contention handling
   - Measure system limits
   - Test recovery behavior
   - Validate compression under load
   - Verify cache performance

3. Integration Testing
   - End-to-end workflows
   - Cross-component interactions
   - System boundaries
   - External service integration
   - Compression pipeline verification
   - Cache coherence testing

## Usage

### Basic Setup
```typescript
const resourceManager = new ResourceManager({
  maxMemoryUsage: 1000,
  maxCpuUsage: 80,
  optimizationThreshold: 0.8,
  cleanupInterval: 1000,
  compressionConfig: {
    minRatio: 0.5,
    adaptiveThreshold: 0.8
  },
  cacheConfig: {
    maxSize: '1GB',
    evictionPolicy: 'lru-importance'
  }
});
```

### Resource Monitoring
```typescript
// Get current resource metrics
const metrics = await resourceManager.getResourceMetrics();

// Listen for resource events
resourceManager.on('resourcePressure', (event) => {
  console.log('Resource pressure detected:', event);
});

// Monitor compression performance
resourceManager.on('compressionMetrics', (metrics) => {
  console.log('Compression performance:', metrics);
});
```

### Context Management
```typescript
// Initialize context with advanced options
await resourceManager.initializeContext('test', {
  maxTokens: 100,
  model: 'gpt-3.5-turbo',
  compressionEnabled: true,
  windowOptimization: true
});

// Add message with token management
await resourceManager.addMessage('test', {
  role: 'user',
  content: 'Hello world',
  importance: 0.8
});
```

### Memory Optimization
```typescript
// Configure compression
await resourceManager.configureCompression({
  ratio: 0.7,
  strategy: 'adaptive',
  importanceThreshold: 0.5
});

// Monitor compression
resourceManager.on('compressionStatus', (status) => {
  console.log('Compression status:', status);
});
```

### Error Handling
```typescript
try {
  await resourceManager.addMessage('test', message);
} catch (error) {
  if (error instanceof ResourceError) {
    // Handle resource-related errors
    if (error.type === 'compression') {
      // Handle compression-specific errors
    }
  }
}
```

## Best Practices

1. Resource Management
   - Monitor resource metrics regularly
   - Set appropriate thresholds
   - Handle resource events
   - Implement cleanup strategies
   - Configure compression appropriately
   - Monitor cache performance

2. Error Handling
   - Use proper error types
   - Implement recovery strategies
   - Handle edge cases
   - Log errors appropriately
   - Monitor compression errors
   - Track cache failures

3. Performance
   - Optimize resource usage
   - Implement caching strategies
   - Monitor system metrics
   - Handle high load scenarios
   - Configure compression ratios
   - Tune cache settings

4. Testing
   - Write comprehensive tests
   - Cover edge cases
   - Test error scenarios
   - Verify performance metrics
   - Validate compression
   - Test cache behavior

## Contributing
1. Follow the test-driven development approach
2. Add tests for new features
3. Maintain test coverage
4. Document changes
5. Update relevant guides
6. Verify compression impact
7. Test cache performance

## Related Documentation
- [Error Handling Guide](./ERROR-HANDLING-SUMMARY.md)
- [Performance Testing Guide](./PERFORMANCE-TESTING.md)
- [Testing Overview](../src/lib/llm/providers/resource-manager/__tests__/TESTING.md)
- [Memory Optimization Guide](./MEMORY-OPTIMIZATION.md)
- [Cache Management Guide](./CACHE-MANAGEMENT.md)

