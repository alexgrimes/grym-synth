# Memory Management Quick Start Guide

## Installation
No additional dependencies required - built into core system.

## Basic Usage
```typescript
import { BasicMemoryManager } from './basic-memory-manager';

const manager = new BasicMemoryManager();

// Load a model
const success = await manager.loadModel('my-model');
if (!success) {
  console.log('Insufficient memory');
}

// Check memory status
const info = manager.getMemoryInfo();
if (info.isWarning) {
  // Take action to reduce memory usage
}

// Cleanup when done
await manager.unloadModel();
```

## Memory Monitoring
```bash
# Start real-time monitor
./monitor.sh    # Unix
monitor.bat     # Windows
```

## Running Tests
```bash
# Run memory tests
cd src/lib/core/__tests__
./run-memory-tests.sh    # Unix
run-memory-tests.bat     # Windows
```

## Key Memory Thresholds
- Warning: Baseline + 50MB (~170MB)
- Critical: Baseline + 70MB (~190MB)
- Minimum Free: 30MB

## Common Operations

### 1. Check Available Memory
```typescript
const info = manager.getMemoryInfo();
console.log(`Available: ${info.available / 1024 / 1024}MB`);
```

### 2. Handle Memory Pressure
```typescript
if (info.isWarning) {
  await manager.unloadModel();
  // Wait for GC
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### 3. Monitor Memory Usage
```typescript
const utils = new MemoryTestUtils();
utils.printStatus('Current Memory');
```

### 4. Safe Model Loading
```typescript
async function safeLoad(modelName: string) {
  const info = manager.getMemoryInfo();
  if (info.available < info.minimumFree) {
    return false;
  }
  return manager.loadModel(modelName);
}
```

## Best Practices
1. Always check load results
2. Cleanup after operations
3. Monitor memory pressure
4. Allow time for GC
5. Maintain minimum free memory

## Troubleshooting
- Memory pressure: Unload unused models
- Load failures: Check available memory
- Slow performance: Monitor GC activity
- Memory leaks: Use MemoryTestUtils

## Need Help?
- Check `README.md` for details
- Run memory monitor for diagnostics
- Review test examples
- See `MEMORY-MANAGEMENT-SUMMARY.md`