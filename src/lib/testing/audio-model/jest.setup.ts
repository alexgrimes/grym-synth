/// <reference path="./global.d.ts" />

// Mock AudioBuffer implementation
class MockAudioBuffer implements AudioBuffer {
  length: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  private channels: Float32Array[];

  constructor(options: { length: number; numberOfChannels?: number; sampleRate: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels || 2;
    this.duration = this.length / this.sampleRate;
    this.channels = Array(this.numberOfChannels)
      .fill(null)
      .map(() => new Float32Array(this.length));
  }

  getChannelData(channel: number): Float32Array {
    if (channel >= this.numberOfChannels) {
      throw new Error(`Channel index ${channel} out of bounds`);
    }
    return this.channels[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset: number = 0): void {
    const source = this.getChannelData(channelNumber);
    destination.set(source.slice(bufferOffset, bufferOffset + destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset: number = 0): void {
    const destination = this.getChannelData(channelNumber);
    destination.set(source, bufferOffset);
  }
}

// Add mock implementations to global scope
(global as any).AudioBuffer = MockAudioBuffer;

// Mock performance API if needed
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now()
  };
}

// Add custom test matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Add test environment variables
process.env.AUDIO_TEST_TIMEOUT = '30000'; // 30 seconds
process.env.MAX_CONCURRENT_TESTS = '4';

// Add global test utilities
(global as any).createTestAudioBuffer = (duration: number, sampleRate: number = 44100) => {
  return new MockAudioBuffer({
    length: Math.floor(duration * sampleRate),
    sampleRate,
    numberOfChannels: 2
  });
};

(global as any).wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add console timing methods if needed
if (!console.time) {
  console.time = (label: string) => {};
  console.timeEnd = (label: string) => {};
}

// Mock WebAssembly if needed for audio processing
if (typeof WebAssembly === 'undefined') {
  (global as any).WebAssembly = {
    compile: () => Promise.resolve({}),
    instantiate: () => Promise.resolve({})
  };
}

// Increase test timeout for audio processing tests
jest.setTimeout(30000);

// Setup cleanup
afterEach(() => {
  jest.clearAllMocks();
});