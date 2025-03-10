# Memory Management System

## Overview
Advanced memory management system with adaptive thresholds based on measured behavior.

## Memory Thresholds
Based on empirical testing:
- **Baseline**: Initial heap usage (~100-120MB)
- **Warning**: Baseline + 50MB
- **Critical**: Baseline + 70MB
- **Minimum Free**: 30MB

## Features
- Adaptive threshold calculation based on initial memory state
- Memory pressure detection and prevention
- Automatic cleanup and recovery
- Memory usage tracking and reporting
- Leak detection capabilities

## Memory Profile
Typical memory behavior in 256MB environment:
```
Initial State:
  Heap Used:  ~110MB
  Available:  ~140MB
  
Under Load:
  Warning at:  ~170MB
  Critical at: ~190MB
  
After Recovery:
  Returns to:  ~100-120MB
  Available:   ~130MB
```

## Testing Utilities
Built-in testing support through `MemoryTestUtils`:
```typescript
const memUtils = new MemoryTestUtils();

// Take snapshots
const baseline = memUtils.takeSnapshot();

// Compare memory states
const impact = memUtils.compareToSnapshot(baseline);

// Controlled allocation
await memUtils.allocateMemory(50, arrays); // 50MB

// Memory reporting
memUtils.printStatus('Current State');

// Get test summary
const summary = memUtils.getSummary();
```

## Running Tests
```batch
# Windows
run-memory-tests.bat

# Unix
./run-memory-tests.sh
```

## Best Practices
1. Monitor memory pressure through `getMemoryInfo()`
2. Release resources when hitting warning threshold
3. Prevent allocations at critical threshold
4. Allow time for GC between operations
5. Track memory usage across operations

## Memory State Checks
```typescript
const info = manager.getMemoryInfo();

if (info.isWarning) {
  // Attempt cleanup
  await manager.unloadModel();
}

if (info.isCritical) {
  // Prevent further allocations
  return false;
}
```

## Memory Usage Example
```typescript
const manager = new BasicMemoryManager();

// Check available memory
const info = manager.getMemoryInfo();
console.log(`Available: ${info.available / 1024 / 1024}MB`);

// Load with memory check
const success = await manager.loadModel('my-model');
if (!success) {
  console.log('Insufficient memory');
}

// Cleanup
await manager.unloadModel();
```

## Testing Features
1. Basic load/unload verification
2. Memory pressure simulation
3. Warning threshold detection
4. Critical threshold prevention
5. Recovery verification
6. Memory leak detection
7. Performance impact measurement