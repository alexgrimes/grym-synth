import '@testing-library/jest-dom';

// Mock performance.now() for consistent timing tests
const mockNow = jest.fn(() => 0);
performance.now = mockNow;

let currentTime = 0;

// Allow tests to control time advancement
(global as any).__advanceTime = (ms: number) => {
  currentTime += ms;
  mockNow.mockReturnValue(currentTime);
};

// Reset time between tests
beforeEach(() => {
  currentTime = 0;
  mockNow.mockReturnValue(currentTime);
});

// Mock WebGL context for visualization tests
class MockWebGLRenderingContext {
  canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  // Stub required WebGL methods
  getContext() { return this; }
  createShader() { return {}; }
  createProgram() { return {}; }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() { return true; }
  getShaderParameter() { return true; }
  useProgram() {}
  createBuffer() { return {}; }
  bindBuffer() {}
  bufferData() {}
  enable() {}
  disable() {}
  clear() {}
  viewport() {}
  drawArrays() {}
  drawElements() {}
}

// Mock WebGL context creation
HTMLCanvasElement.prototype.getContext = function(contextId: string) {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return new MockWebGLRenderingContext();
  }
  return null;
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(() => {
    callback(performance.now());
  }, 16) as unknown as number;
};

global.cancelAnimationFrame = (handle: number) => {
  clearTimeout(handle);
};

// Mock Web Audio API
class MockAudioContext {
  createOscillator() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
  }

  createGain() {
    return {
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn()
      }
    };
  }
}

(window as any).AudioContext = MockAudioContext;
(window as any).webkitAudioContext = MockAudioContext;

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(window as any).ResizeObserver = MockResizeObserver;

// Mock PointerEvent for gesture tests
class MockPointerEvent extends Event {
  clientX: number;
  clientY: number;
  pressure: number;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type);
    this.clientX = init.clientX || 0;
    this.clientY = init.clientY || 0;
    this.pressure = init.pressure || 0;
  }
}

(window as any).PointerEvent = MockPointerEvent;

// Mock Web Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage(data: any) {
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage(new MessageEvent('message', { data }));
      }, 0);
    }
  }
  terminate() {}
}

(window as any).Worker = MockWorker;

// Extend expect matchers
expect.extend({
  toBeWithinLatencyThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    return {
      message: () =>
        `expected ${received}ms to ${pass ? 'not ' : ''}be within ${threshold}ms latency threshold`,
      pass
    };
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinLatencyThreshold(threshold: number): R;
    }
  }
}
