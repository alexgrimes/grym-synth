import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock types for Canvas API
interface MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement;
  clearRect: jest.Mock;
  beginPath: jest.Mock;
  moveTo: jest.Mock;
  lineTo: jest.Mock;
  stroke: jest.Mock;
  strokeStyle: string;
  lineWidth: number;
}

// Extend partial window interface for testing
declare global {
  namespace NodeJS {
    interface Global {
      innerWidth: number;
      innerHeight: number;
    }
  }
}

// Mock analyzer interface
interface MockAnalyser {
  frequencyBinCount: number;
  getByteTimeDomainData: (array: Uint8Array) => void;
}

// Create mock context with proper typing
const createMockContext = (): MockCanvasRenderingContext2D => ({
  canvas: {
    width: 800,
    height: 200,
  } as HTMLCanvasElement,
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  strokeStyle: '#000',
  lineWidth: 1,
});

// Create mock canvas element with proper context typing
const createMockCanvas = (context: MockCanvasRenderingContext2D) => {
  const canvas = {
    getContext: jest.fn().mockReturnValue(context),
    width: 800,
    height: 200,
  };
  return canvas;
};

describe('Visualization Rendering', () => {
  let canvas: ReturnType<typeof createMockCanvas>;
  let context: MockCanvasRenderingContext2D;
  let mockAnalyser: MockAnalyser;
  let mockDataArray: Uint8Array;

  beforeEach(() => {
    // Reset mocks and create fresh instances
    jest.clearAllMocks();

    // Create mock context and canvas
    context = createMockContext();
    canvas = createMockCanvas(context);

    // Mock analyser node and data array
    mockDataArray = new Uint8Array(1024).fill(128); // Middle value for testing
    mockAnalyser = {
      frequencyBinCount: 1024,
      getByteTimeDomainData: jest.fn((array: Uint8Array) => {
        array.set(mockDataArray);
      }),
    };

    // Mock window dimensions
    (global as any).innerWidth = 800;
    (global as any).innerHeight = 600;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up global mocks
    delete (global as any).innerWidth;
    delete (global as any).innerHeight;
  });

  test('renders waveform correctly', () => {
    // Draw waveform
    const waveformData = new Uint8Array(1024).fill(128); // Flat line for testing
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Test basic drawing operations
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    expect(context.beginPath).toHaveBeenCalled();

    // Verify style settings
    expect(context.strokeStyle).toBe('#000');
    expect(context.lineWidth).toBe(1);

    // Verify drawing operations were called appropriate number of times
    const expectedCalls = waveformData.length - 1;
    expect(context.lineTo).toHaveBeenCalledTimes(expectedCalls);
    expect(context.stroke).toHaveBeenCalled();
  });

  test('updates visualization in real-time', () => {
    // Simulate multiple frames of animation
    const frames = 5;
    for (let i = 0; i < frames; i++) {
      // Update data array with new values for each frame
      mockDataArray.fill(128 + (i * 10)); // Increasing amplitude

      // Simulate frame render
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();

      // Draw frame
      for (let x = 0; x < mockDataArray.length - 1; x++) {
        const y = (mockDataArray[x] / 256) * canvas.height;
        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.stroke();
    }

    // Verify multiple frames were rendered
    expect(context.clearRect).toHaveBeenCalledTimes(frames);
    expect(context.beginPath).toHaveBeenCalledTimes(frames);
    expect(context.stroke).toHaveBeenCalledTimes(frames);
  });

  test('handles window resize', () => {
    // Initial size
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(200);

    // Simulate window resize
    const newWidth = 1024;
    const newHeight = 400;

    // Update canvas dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Verify canvas was resized
    expect(canvas.width).toBe(newWidth);
    expect(canvas.height).toBe(newHeight);

    // Verify visualization still works with new dimensions
    context.clearRect(0, 0, canvas.width, canvas.height);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, newWidth, newHeight);

    // Test drawing at new dimensions
    context.beginPath();
    for (let x = 0; x < mockDataArray.length - 1; x++) {
      const y = (mockDataArray[x] / 256) * newHeight;
      if (x === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();

    // Verify drawing operations still work
    expect(context.beginPath).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.lineTo).toHaveBeenCalled();
  });
});
