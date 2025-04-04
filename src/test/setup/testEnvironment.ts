import '@testing-library/jest-dom';
import './types';

class MockAudioContext {
  createGain() {
    return {
      connect: jest.fn(),
      gain: { value: 1 }
    };
  }

  createOscillator() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 440 }
    };
  }

  createAnalyser() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn(),
      getFloatFrequencyData: jest.fn(),
      getFloatTimeDomainData: jest.fn(),
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8
    };
  }
}

// Create mock WebGL context
const mockWebGLRenderingContext = Object.assign({
  canvas: null,
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  getExtension: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn()
}, {});

// Setup global mocks
Object.assign(global, {
  AudioContext: MockAudioContext,
  WebGLRenderingContext: mockWebGLRenderingContext,
  requestAnimationFrame: (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(performance.now()), 1000 / 60) as unknown as number;
  },
  cancelAnimationFrame: (handle: number): void => {
    clearTimeout(handle);
  },
  ResizeObserver: class ResizeObserver {
    constructor(callback: ResizeObserverCallback) {}
    disconnect() {}
    observe() {}
    unobserve() {}
  },
  IntersectionObserver: class IntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() { return []; }
  },
  URL: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
  },
  performance: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  }
});

// Mock WebGL context creation
HTMLCanvasElement.prototype.getContext = function(contextType: string) {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLRenderingContext;
  }
  return null;
};

// Setup test environment timeouts
jest.setTimeout(10000); // 10 second timeout for tests
