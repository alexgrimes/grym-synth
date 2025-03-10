import { MockAudioBuffer, MockAudioContext } from './browser-mocks';

// Initialize test environment
export function setupTestEnvironment() {
  // Setup browser-like globals
  if (typeof global.AudioBuffer === 'undefined') {
    (global as any).AudioBuffer = MockAudioBuffer;
  }

  if (typeof global.AudioContext === 'undefined') {
    (global as any).AudioContext = MockAudioContext;
  }

  // Add helper functions to global scope
  if (typeof global.createTestAudioBuffer === 'undefined') {
    global.createTestAudioBuffer = (duration: number = 1, sampleRate: number = 44100): AudioBuffer => {
      return new MockAudioBuffer({
        numberOfChannels: 2,
        length: Math.floor(duration * sampleRate),
        sampleRate
      });
    };
  }

  // Add performance timing if not available
  if (typeof global.performance === 'undefined') {
    (global as any).performance = {
      now: () => Date.now(),
      mark: () => {},
      measure: () => {},
      clearMarks: () => {},
      clearMeasures: () => {}
    };
  }

  // Force garbage collection helper
  if (typeof global.gc === 'undefined') {
    console.warn('Garbage collection is not exposed. Run Node.js with --expose-gc flag for better memory testing.');
  }

  // Add process memory info if not available (mock for browsers)
  if (typeof process === 'undefined' || !process.memoryUsage) {
    (global as any).process = {
      ...(global as any).process,
      memoryUsage: () => ({
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        rss: 0
      })
    };
  }
}

// Initialize test environment
setupTestEnvironment();