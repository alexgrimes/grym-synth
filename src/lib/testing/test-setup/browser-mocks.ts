// Mock AudioBuffer implementation
class MockAudioBuffer implements AudioBuffer {
  private _length: number;
  private _sampleRate: number;
  private _numberOfChannels: number;
  private _channelData: Float32Array[];

  constructor(options: AudioBufferOptions) {
    this._length = options.length;
    this._sampleRate = options.sampleRate;
    this._numberOfChannels = options.numberOfChannels;
    this._channelData = Array(options.numberOfChannels)
      .fill(null)
      .map(() => new Float32Array(options.length));
  }

  get duration(): number {
    return this._length / this._sampleRate;
  }

  get length(): number {
    return this._length;
  }

  get numberOfChannels(): number {
    return this._numberOfChannels;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  getChannelData(channel: number): Float32Array {
    if (channel >= this._numberOfChannels) {
      throw new Error('Channel index out of bounds');
    }
    return this._channelData[channel];
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void {
    const source = this.getChannelData(channelNumber);
    const start = startInChannel || 0;
    destination.set(source.subarray(start, start + destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void {
    const destination = this.getChannelData(channelNumber);
    const start = startInChannel || 0;
    destination.set(source, start);
  }
}

// Mock AudioContext implementation
class MockAudioContext {
  constructor() {
    // Add minimal implementation if needed
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }
}

// Export types for TypeScript
declare global {
  interface Window {
    AudioBuffer: typeof MockAudioBuffer;
    AudioContext: typeof MockAudioContext;
  }

  var AudioBuffer: typeof MockAudioBuffer;
  var AudioContext: typeof MockAudioContext;
}

// Install mocks globally
global.AudioBuffer = MockAudioBuffer;
global.AudioContext = MockAudioContext;

// Helper functions
export function createTestAudioBuffer(duration: number = 1, sampleRate: number = 44100): AudioBuffer {
  return new MockAudioBuffer({
    numberOfChannels: 2,
    length: Math.floor(duration * sampleRate),
    sampleRate: sampleRate
  });
}

// Export for use in tests
export {
  MockAudioBuffer,
  MockAudioContext
};