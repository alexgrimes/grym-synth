require('@testing-library/jest-dom');

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
const mockWebGLRenderingContext = {
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
};

// Setup global mocks
global.AudioContext = MockAudioContext;
global.WebGLRenderingContext = mockWebGLRenderingContext;

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = function(callback) {
  return setTimeout(function() {
    callback(Date.now());
  }, 1000 / 60);
};

global.cancelAnimationFrame = function(handle) {
  clearTimeout(handle);
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return []; }
};

// Mock URL methods
global.URL = global.URL || {};
global.URL.createObjectURL = global.URL.createObjectURL || jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = global.URL.revokeObjectURL || jest.fn();

// Mock performance
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

// Mock WebGL context creation
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLRenderingContext;
  }
  return null;
};

// Setup test environment timeouts
jest.setTimeout(10000); // 10 second timeout for tests
