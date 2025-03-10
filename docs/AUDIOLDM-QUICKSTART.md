# AudioLDM Quick Start Guide

This guide provides a quick introduction to using the AudioLDM service for text-to-audio generation.

## Prerequisites

- Node.js environment with TypeScript
- Python 3.8+ with PyTorch installed
- CUDA-capable GPU with at least 6GB VRAM (recommended)

## Installation

1. Ensure the AudioLDM Python package is installed:

```bash
pip install audioldm torch transformers soundfile numpy
```

2. Verify the Python script is in the correct location:

```
scripts/audioldm_operations.py
```

## Basic Usage

### 1. Enable the Service

First, enable the AudioLDM service in your application configuration:

```typescript
import { systemBootstrap } from "../integration/system-bootstrap";

// Configure and initialize the system
await systemBootstrap.initialize({
  enableAudioLDM: true,
  audioldmConfig: {
    maxMemory: "4GB",
    quantization: "8bit"
  }
});
```

### 2. Generate Audio from Text

```typescript
import { serviceRegistry } from "../services";
import { v4 as uuidv4 } from "uuid";

// Get the AudioLDM service
const audioldmService = serviceRegistry.getService("audioldm");

// Create a task for audio generation
const task = {
  id: uuidv4(),
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

// Check if generation was successful
if (result.status === "success") {
  // Access the generated audio
  const audioData = result.data.audio;        // Float32Array of audio samples
  const sampleRate = result.data.sampleRate;  // Sample rate (e.g., 16000)
  const duration = result.data.duration;      // Duration in seconds
  
  // Example: Save to WAV file using a hypothetical audio utility
  await saveToWavFile(audioData, sampleRate, "generated_audio.wav");
} else {
  console.error("Audio generation failed:", result.error);
}
```

### 3. Play Generated Audio

```typescript
// Example: Play audio in browser
function playAudio(audioData, sampleRate) {
  const audioContext = new AudioContext({ sampleRate });
  const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
  
  // Copy data to audio buffer
  audioBuffer.copyToChannel(audioData, 0);
  
  // Create source and play
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  
  return source; // Return for stopping later if needed
}

// Play the generated audio
const audioSource = playAudio(result.data.audio, result.data.sampleRate);
```

## Configuration Options

### Memory Optimization

For systems with limited VRAM, you can adjust these settings:

```typescript
const config = {
  enableAudioLDM: true,
  audioldmConfig: {
    maxMemory: "4GB",
    quantization: "8bit",      // Options: "8bit", "4bit", "none"
    useHalfPrecision: true,    // Use FP16 instead of FP32
    diffusionSteps: 20,        // Fewer steps = less memory but lower quality
    offloadModules: ["encoder", "decoder"]
  }
};
```

### Generation Parameters

Customize your audio generation with these parameters:

```typescript
const params = {
  diffusionSteps: 25,     // Number of diffusion steps (higher = better quality but slower)
  guidanceScale: 3.5,     // How closely to follow the prompt (higher = more faithful but less creative)
  duration: 5.0,          // Duration in seconds
  batchSize: 1,           // Number of samples to generate
  sampleRate: 16000       // Sample rate in Hz
};
```

## Using with Context Management

The context system provides a way to store and retrieve generation parameters:

```typescript
import { contextManager } from "../context";
import { v4 as uuidv4 } from "uuid";

// Store generation parameters
await contextManager.storeContext({
  id: uuidv4(),
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

// Store prompt
await contextManager.storeContext({
  id: uuidv4(),
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

// Get context for the audio model
const filter = { types: ["generation_parameters", "prompt"] };
const context = await contextManager.getContextForModel("audioldm", filter);

// The context will include the adapted parameters for AudioLDM
console.log(context.generationParameters.prompt); // "Birds chirping in a forest"
console.log(context.generationParameters.diffusionSteps); // 30
```

## Common Issues and Solutions

### Out of Memory Errors

If you encounter out of memory errors:

1. Reduce `diffusionSteps` (try 15-20)
2. Use `quantization: "8bit"` or `"4bit"`
3. Enable `useHalfPrecision`
4. Reduce `duration` to generate shorter audio
5. Ensure other GPU-intensive applications are closed

### Poor Audio Quality

If the generated audio quality is poor:

1. Increase `diffusionSteps` (try 30-50)
2. Adjust `guidanceScale` (try 4.0-7.0)
3. Use more detailed prompts
4. Use `quantization: "none"` if you have enough VRAM

### Python Script Errors

If you encounter Python script errors:

1. Verify Python dependencies are installed
2. Check CUDA and PyTorch compatibility
3. Ensure the script has execute permissions
4. Check the Python path in your configuration

## Next Steps

For more detailed information, refer to:

- [AudioLDM Service Implementation](./AUDIOLDM-SERVICE-IMPLEMENTATION.md) - Complete documentation
- [AudioLDM Technical Reference](./AUDIOLDM-TECHNICAL-REFERENCE.md) - Technical details for developers
