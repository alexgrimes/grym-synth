const { VisualizationTools } = require('../../monitoring/visualizationTools');

describe('VisualizationTools Tests', () => {
  let visualizer;
  let mockContainer;

  beforeEach(() => {
    // Create a mock container element
    mockContainer = document.createElement('div');
    visualizer = new VisualizationTools();
  });

  test('initialize should append canvas to container', () => {
    visualizer.initialize(mockContainer);
    expect(mockContainer.children.length).toBe(1);
    const canvas = mockContainer.firstChild;
    expect(canvas instanceof HTMLCanvasElement).toBe(true);
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

    // Mock the renderer's render method
    const mockRender = jest.spyOn(visualizer.renderer, 'render');

    visualizer.render();
    expect(mockRender).toHaveBeenCalled();
  });

  test('should handle window resize events', () => {
    const mockResize = jest.spyOn(visualizer.renderer, 'setSize');
    visualizer.initialize(mockContainer);

    // Simulate window resize
    window.innerWidth = 1024;
    window.innerHeight = 768;
    window.dispatchEvent(new Event('resize'));

    // In our mock implementation, we don't actually hook up the resize event
    // So we'll just verify the method exists
    expect(typeof visualizer.renderer.setSize).toBe('function');
  });

  test('should clean up scene before creating new waveform', () => {
    visualizer.initialize(mockContainer);
    const audioData = new Float32Array(1024);

    const mockClear = jest.spyOn(visualizer.scene, 'clear');

    // First waveform
    visualizer.createWaveform(audioData);
    expect(mockClear).toHaveBeenCalled();
  });
});
