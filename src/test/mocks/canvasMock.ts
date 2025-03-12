export const mockContext = {
  canvas: document.createElement('canvas'),
  fillStyle: '#000',
  strokeStyle: '#000',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  imageSmoothingEnabled: true,

  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  arc: jest.fn(),
  arcTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  clip: jest.fn(),
  drawImage: jest.fn(),

  fillText: jest.fn(),
  strokeText: jest.fn(),
  measureText: jest.fn().mockReturnValue({ width: 0 }),

  scale: jest.fn(),
  rotate: jest.fn(),
  translate: jest.fn(),
  transform: jest.fn(),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),

  rect: jest.fn(),
  ellipse: jest.fn(),

  save: jest.fn(),
  restore: jest.fn(),

  createLinearGradient: jest.fn().mockReturnValue({
    addColorStop: jest.fn()
  }),
  createRadialGradient: jest.fn().mockReturnValue({
    addColorStop: jest.fn()
  }),
  createPattern: jest.fn(),

  getImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(),
    width: 0,
    height: 0
  }),
  putImageData: jest.fn()
};

export const setupCanvasMock = () => {
  // Mock getContext
  const getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');
  getContextSpy.mockImplementation((contextId: string) => {
    if (contextId === '2d') {
      return mockContext as unknown as CanvasRenderingContext2D;
    }
    return null;
  });

  return {
    getContextSpy,
    mockContext,
    cleanup: () => {
      getContextSpy.mockRestore();
    }
  };
};
