# AudioLDM Service Implementation

This document provides an overview of the AudioLDM service implementation, which enables text-to-audio generation using latent diffusion models within our application.

## Overview

AudioLDM is a text-to-audio generative model based on latent diffusion. This implementation integrates AudioLDM into our existing service architecture, with specific optimizations for running on systems with limited VRAM (6GB).

## Architecture

The implementation follows our established service layer architecture and consists of the following components:

1. **AudioLDMService**: A TypeScript service class that implements the ModelService interface
2. **AudioLDMBridge**: A bridge between TypeScript and Python for model operations
3. **Python Script**: A Python implementation that interfaces with the AudioLDM model
4. **Context Adapter**: Extensions to the context management system for AudioLDM parameters
5. **Service Factory**: Integration with the service factory for easy instantiation
6. **System Bootstrap**: Integration with the system bootstrap process

### Component Diagram

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

## Memory Optimization Techniques

The implementation includes several techniques to optimize memory usage for systems with limited VRAM:

1. **Model Quantization**: Support for 8-bit and 4-bit quantization to reduce model size
2. **Half Precision**: Using FP16 instead of FP32 for computations
3. **Gradient Checkpointing**: Reduces memory usage by recomputing intermediate activations
4. **Memory Monitoring**: Tracking usage to stay within limits
5. **Module Offloading**: Moving non-essential components to CPU when not in use
6. **Reduced Diffusion Steps**: Default of 25 steps instead of 50 for better memory usage

## Configuration Options

The AudioLDM service can be configured with the following options:

| Option | Description | Default |
|--------|-------------|---------|
| `maxMemory` | Maximum memory allocation | "4GB" |
| `modelPath` | Path to the model | "latent-diffusion/audioldm-s-full" |
| `quantization` | Quantization level | "8bit" |
| `diffusionSteps` | Number of diffusion steps | 25 |
| `useHalfPrecision` | Use half precision (FP16) | true |
| `offloadModules` | Modules to offload to CPU | ["encoder", "decoder"] |

## Usage

### Enabling the Service

To enable the AudioLDM service, update your system configuration:

```typescript
const config: SystemConfig = {
  enableAudioLDM: true,
  audioldmConfig: {
    maxMemory: "4GB",
    diffusionSteps: 25,
    useHalfPrecision: true
  }
};

await systemBootstrap.initialize(config);
```

### Generating Audio

To generate audio from text:

```typescript
// Create a task for audio generation
const task: Task = {
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

// Get the service from the registry
const audioldmService = serviceRegistry.getService("audioldm");

// Execute the task
const result = await audioldmService.executeTask(task);

// Access the generated audio
const audioData = result.data.audio;
const sampleRate = result.data.sampleRate;
```

### Using with Context Management

The context management system has been extended to support AudioLDM parameters:

```typescript
// Store generation parameters in context
await contextManager.storeContext({
  id: "gen-params-1",
  type: "generation_parameters",
  content: {
    diffusionSteps: 30,
    guidanceScale: 4.0,
    duration: 3.0
  },
  metadata: {
    timestamp: new Date(),
    source: "user-settings",
    priority: 1
  }
});

// Store prompt in context
await contextManager.storeContext({
  id: "prompt-1",
  type: "prompt",
  content: {
    text: "Birds chirping in a forest"
  },
  metadata: {
    timestamp: new Date(),
    source: "user-input",
    priority: 2
  }
});

// Get adapted context for the audio model
const filter = { types: ["generation_parameters", "prompt"] };
const context = await contextManager.getContextForModel("audioldm", filter);
```

## Python Dependencies

The Python script requires the following dependencies:

- torch
- transformers
- audioldm
- soundfile
- numpy

These can be installed via pip:

```bash
pip install torch transformers audioldm soundfile numpy
```

## Testing

Unit tests for the AudioLDM service are available in:

```
src/tests/services/AudioLDMService.test.ts
```

The tests use Jest mocks to avoid actual Python execution during testing.

## Limitations

- The service requires a CUDA-capable GPU for optimal performance
- Memory usage scales with audio duration and batch size
- Generation quality depends on the diffusion steps (more steps = better quality but more memory)

## Future Improvements

- Add support for audio-to-audio generation
- Implement streaming audio output for longer generations
- Add more fine-grained control over the generation process
- Optimize memory usage further for lower-end GPUs
