# AudioLDM Implementation

## Overview

This project implements AudioLDM, a text-to-audio generative model based on latent diffusion, into our application's service architecture. AudioLDM enables high-quality audio generation from text prompts, with specific optimizations for running on systems with limited VRAM (6GB).

## Key Features

- **Text-to-Audio Generation**: Generate audio content from text descriptions
- **Memory Optimization**: Run on systems with limited VRAM (6GB)
- **Service Architecture Integration**: Seamless integration with existing services
- **Context Management**: Support for generation parameters in the context system
- **Configurable Generation**: Control over diffusion steps, guidance scale, and more

## Documentation

This implementation is documented in several files:

1. [**Quick Start Guide**](./AUDIOLDM-QUICKSTART.md) - Get started quickly with basic usage examples
2. [**Service Implementation**](./AUDIOLDM-SERVICE-IMPLEMENTATION.md) - Complete documentation of the implementation
3. [**Technical Reference**](./AUDIOLDM-TECHNICAL-REFERENCE.md) - Detailed technical information for developers

## Architecture

The implementation follows our established service layer architecture:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│ AudioLDMService │──────▶ AudioLDMBridge  │──────▶ Python Script   │
│                 │      │                 │      │ (audioldm_ops)  │
└────────┬────────┘      └─────────────────┘      └─────────────────┘
         │                                                 │
         │                                                 │
         │                                                 ▼
┌────────▼────────┐                              ┌─────────────────┐
│                 │                              │                 │
│ Service Registry│                              │ AudioLDM Model  │
│                 │                              │                 │
└────────┬────────┘                              └─────────────────┘
         │
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│ Context Manager │◀─────▶ Audio Adapter   │
│                 │      │                 │
└─────────────────┘      └─────────────────┘
```

## Files

- `src/services/audio/AudioLDMService.ts` - Main service class
- `src/services/audio/AudioLDMBridge.ts` - Bridge to Python implementation
- `scripts/audioldm_operations.py` - Python script for model operations
- `src/context/types.ts` - Extended context types for AudioLDM
- `src/context/adapters/audio-model-adapter.ts` - Context adapter with AudioLDM support
- `src/services/service-factory.ts` - Factory method for AudioLDM service
- `src/integration/system-bootstrap.ts` - System integration
- `src/tests/services/AudioLDMService.test.ts` - Unit tests

## Memory Optimization Techniques

The implementation includes several techniques to optimize memory usage:

1. **Model Quantization**: Support for 8-bit and 4-bit quantization
2. **Half Precision**: Using FP16 instead of FP32 for computations
3. **Gradient Checkpointing**: Reduces memory usage by recomputing intermediate activations
4. **Memory Monitoring**: Tracking usage to stay within limits
5. **Module Offloading**: Moving non-essential components to CPU when not in use
6. **Reduced Diffusion Steps**: Default of 25 steps instead of 50 for better memory usage

## Basic Usage

```typescript
// Get the AudioLDM service
const audioldmService = serviceRegistry.getService("audioldm");

// Create a task for audio generation
const task = {
  id: "generate-audio-1",
  type: "audio-generation",
  modelType: "audioldm",
  data: {
    operation: "generate",
    prompt: "A dog barking in the distance",
    params: {
      diffusionSteps: 25,
      guidanceScale: 3.5,
      duration: 5.0
    }
  },
  storeResults: true
};

// Execute the task
const result = await audioldmService.executeTask(task);

// Access the generated audio
const audioData = result.data.audio;
const sampleRate = result.data.sampleRate;
```

## Requirements

- Node.js environment with TypeScript
- Python 3.8+ with PyTorch installed
- CUDA-capable GPU with at least 6GB VRAM (recommended)
- Python dependencies: audioldm, torch, transformers, soundfile, numpy

## Configuration

The AudioLDM service can be configured with the following options:

| Option | Description | Default |
|--------|-------------|---------|
| `maxMemory` | Maximum memory allocation | "4GB" |
| `modelPath` | Path to the model | "latent-diffusion/audioldm-s-full" |
| `quantization` | Quantization level | "8bit" |
| `diffusionSteps` | Number of diffusion steps | 25 |
| `useHalfPrecision` | Use half precision (FP16) | true |
| `offloadModules` | Modules to offload to CPU | ["encoder", "decoder"] |

## Future Improvements

- Add support for audio-to-audio generation
- Implement streaming audio output for longer generations
- Add more fine-grained control over the generation process
- Optimize memory usage further for lower-end GPUs
