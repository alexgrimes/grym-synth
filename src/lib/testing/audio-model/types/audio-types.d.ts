declare interface IAudioContext extends AudioContext {
  createScriptProcessor(
    bufferSize?: number,
    numberOfInputChannels?: number,
    numberOfOutputChannels?: number
  ): ScriptProcessorNode;
}

declare interface AudioTestEnvironment {
  context: IAudioContext;
  destination: AudioDestinationNode;
  source: AudioBufferSourceNode;
}

declare global {
  var createTestAudioBuffer: (duration: number, sampleRate?: number) => AudioBuffer;
  var wait: (ms: number) => Promise<void>;

  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toBeLessThanWithMessage(expected: number, message?: string): R;
      toBeLessThanTime(time: number): R;
      toHaveAcceptableMemoryGrowth(initialMemory: number, threshold?: number): R;
    }
  }
}

declare interface AudioMemoryProfile {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

declare interface PerformanceMetrics {
  memoryUsage: AudioMemoryProfile;
  executionTime: number;
  timestamp: number;
}

declare interface TestCaseResult {
  name: string;
  passed: boolean;
  metrics: PerformanceMetrics;
  error?: Error;
}

// Custom matchers
declare namespace jest {
  interface Expect {
    toBeWithinRange(floor: number, ceiling: number): any;
  }
}

// Extend standardized-audio-context types
declare module 'standardized-audio-context' {
  interface IAudioContext {
    createScriptProcessor(
      bufferSize?: number,
      numberOfInputChannels?: number,
      numberOfOutputChannels?: number
    ): ScriptProcessorNode;
  }
}

export {};