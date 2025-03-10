declare namespace NodeJS {
  interface Global {
    gc?: () => void;
    createTestAudioBuffer: (duration?: number, sampleRate?: number) => AudioBuffer;
    wait: (ms: number) => Promise<void>;
  }
}

declare interface AudioBuffer {
  length: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void;
  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void;
}

declare interface AudioBufferOptions {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
}

declare interface AudioContext {
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer;
}

declare interface AudioNode {
  connect(destination: AudioNode | AudioParam, output?: number, input?: number): void;
  disconnect(destination?: AudioNode | AudioParam, output?: number, input?: number): void;
}

declare interface AudioParam {
  value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
}

declare interface MemoryTestEnvironment {
  memoryProfiler: import('./memory-profile').MemoryProfiler;
  memoryVisualizer: import('./memory-viz').MemoryVisualizer;
  MEMORY_LIMIT: number;
  forceGC: () => Promise<void>;
}

declare interface MemoryTestGlobals extends NodeJS.Global {
  testEnv: MemoryTestEnvironment;
}

declare const global: MemoryTestGlobals;