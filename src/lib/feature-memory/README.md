# Feature Memory System

## Quick Start

```typescript
import { Qwen2MemoryManager, Qwen2Quantization } from './core/qwen-memory-manager';

// Initialize manager
const manager = new Qwen2MemoryManager();

// Check and load model
async function loadModel() {
  const quantization = await manager.getRecommendedQuantization();
  if (await manager.canLoadModel(quantization)) {
    await manager.registerModelLoad(quantization);
  }
}
```

## Key Features

- Memory requirement management for Qwen2-Audio
- Automatic quantization selection
- Memory status monitoring
- Safety thresholds and warnings

## Memory Requirements

| Quantization | RAM | Buffer | Total |
|--------------|-----|---------|--------|
| Q4_K_M | 4.2GB | 512MB | ~4.7GB |
| Q4_0 | 3.8GB | 512MB | ~4.3GB |
| Q5_K_M | 4.8GB | 768MB | ~5.6GB |

## Documentation

For detailed documentation, see:
- [Qwen2 Memory Management](../../docs/QWEN2-MEMORY-MANAGEMENT.md)
- [Feature Memory System Fixes](../../docs/FEATURE-MEMORY-SYSTEM-FIXES.md)
- [Memory Management Summary](../../docs/MEMORY-MANAGEMENT-SUMMARY.md)

## Testing

Run memory tests:
```bash
npm test src/lib/feature-memory/core/__tests__/qwen-memory-manager.test.ts
```

Current coverage:
- Statements: 94.82%
- Branches: 84.21%
- Functions: 100%