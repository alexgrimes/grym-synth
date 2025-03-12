import { VisualizationTools } from '../../src/monitoring/visualizationTools';

describe('VisualizationTools Tests', () => {
  let visualizer: VisualizationTools;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Create a mock container element
    mockContainer = document.createElement('div');
    visualizer = new VisualizationTools();
  });

  test('initialize should append canvas to container', () => {
    visualizer.initialize(mockContainer);
    expect(mockContainer.children.length).toBe(1);
    expect(mockContainer.firstChild).toBeInstanceOf(HTMLCanvasElement);
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

    // Create spy on renderer's render method
    const canvas = mockContainer.querySelector('canvas');
    const context = canvas?.getContext('webgl');
    const renderSpy = jest.spyOn(context as any, 'clear');

    visualizer.render();
    expect(renderSpy).toHaveBeenCalled();
  });

  test('should handle window resize events', () => {
    visualizer.initialize(mockContainer);
    const canvas = mockContainer.querySelector('canvas');
    const originalWidth = canvas?.width;
    const originalHeight = canvas?.height;

    // Simulate window resize
    global.innerWidth = 1024;
    global.innerHeight = 768;
    global.dispatchEvent(new Event('resize'));

    // Check if canvas dimensions were updated
    expect(canvas?.width).not.toBe(originalWidth);
    expect(canvas?.height).not.toBe(originalHeight);
  });

  test('should clean up scene before creating new waveform', () => {
    visualizer.initialize(mockContainer);
    const audioData = new Float32Array(1024);

    // First waveform
    visualizer.createWaveform(audioData);

    // Create new waveform
    const newAudioData = new Float32Array(1024);
    visualizer.createWaveform(newAudioData);

    // Scene should have been cleared and contain only one waveform
    // This is a bit of an implementation detail, but important for performance
    const canvas = mockContainer.querySelector('canvas');
    const context = canvas?.getContext('webgl');
    expect(context?.clear).toHaveBeenCalled();
  });
});
