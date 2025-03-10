export {};

declare global {
  // Declare global utility functions
  function createTestAudioBuffer(duration: number, sampleRate?: number): AudioBuffer;
  function wait(ms: number): Promise<void>;
  
  // Extend Jest matchers
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
  
  // Complete AudioBuffer interface
  interface AudioBuffer {
    length: number;
    duration: number;
    sampleRate: number;
    numberOfChannels: number;
    getChannelData(channel: number): Float32Array;
    copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void;
    copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void;
  }

  // Declare AudioBuffer constructor
  var AudioBuffer: {
    new (options: {
      length: number;
      numberOfChannels?: number;
      sampleRate: number;
    }): AudioBuffer;
    prototype: AudioBuffer;
  };

  // Declare the global namespace for our test utilities
  interface Window {
    createTestAudioBuffer: typeof createTestAudioBuffer;
    wait: typeof wait;
  }

  // Declare performance API
  interface Performance {
    now(): number;
  }
  var performance: Performance;

  // Declare console timing methods
  interface Console {
    time(label: string): void;
    timeEnd(label: string): void;
  }
}