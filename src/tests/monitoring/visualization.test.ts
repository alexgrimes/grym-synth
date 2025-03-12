import { VisualizationTools } from '../../monitoring/visualizationTools';

describe('VisualizationTools Tests', () => {
  let visualizer: VisualizationTools;
  let mockContainer: HTMLDivElement;

  beforeEach(() => {
    // Create a mock container element
    mockContainer = document.createElement('div');
    visualizer = new VisualizationTools();
  });

  test('initialize should append canvas to container', () => {
    visualizer.initialize(mockContainer);
    expect(mockContainer.children.length).toBe(1);
    const canvas = mockContainer.firstChild as HTMLCanvasElement;
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  test('createWaveform should process audio data correctly', () => {
    visualizer.initialize(mockContainer);
    const audioData = new Float32Array(1024);

    // Create a simple sine wave
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.sin(2 * Math.PI * i / 1024);
    }

    // This should not throw any errors
    expect(() => {
      visualizer.createWaveform(audioData);
    }).not.toThrow();
  });

  test('render should call WebGL render method', () => {
    visualizer.initialize(mockContainer);

    // Mock the WebGL context
    const canvas = mockContainer.querySelector('canvas');
    expect(canvas).not.toBeNull();

    const mockClear = jest.fn();
    const mockRender = jest.fn();

    // Override the context methods for testing
    jest.spyOn(visualizer as any, 'renderer', 'get').mockReturnValue({
      render: mockRender,
      clear: mockClear
    });

    visualizer.render();
    expect(mockRender).toHaveBeenCalled();
  });

  test('should handle window resize events', () => {
    const mockResize = jest.fn();
    visualizer.initialize(mockContainer);

    // Override the renderer's setSize method for testing
    jest.spyOn(visualizer as any, 'renderer', 'get').mockReturnValue({
      setSize: mockResize
    });

    // Simulate window resize
    window.innerWidth = 1024;
    window.innerHeight = 768;
    window.dispatchEvent(new Event('resize'));

    expect(mockResize).toHaveBeenCalledWith(1024, 768);
  });

  test('should clean up scene before creating new waveform', () => {
    visualizer.initialize(mockContainer);
    const audioData = new Float32Array(1024);

    const mockClear = jest.fn();
    jest.spyOn(visualizer as any, 'scene', 'get').mockReturnValue({
      clear: mockClear,
      add: jest.fn()
    });

    // First waveform
    visualizer.createWaveform(audioData);
    expect(mockClear).toHaveBeenCalled();
  });
});
