import {
  createWebGLContext,
  createProgram,
  initShaders,
  checkWebGLRequirements,
  setupCanvas,
  handleContextEvents,
  type WebGLContextType
} from '../webgl';

// WebGL mock types
type MockFunction<T> = T & jest.Mock;

interface MockWebGLContext extends Partial<WebGLContextType> {
  getParameter: MockFunction<WebGLContextType['getParameter']>;
  getSupportedExtensions: MockFunction<WebGLContextType['getSupportedExtensions']>;
  createShader: MockFunction<WebGLContextType['createShader']>;
  shaderSource: MockFunction<WebGLContextType['shaderSource']>;
  compileShader: MockFunction<WebGLContextType['compileShader']>;
  getShaderParameter: MockFunction<WebGLContextType['getShaderParameter']>;
  createProgram: MockFunction<WebGLContextType['createProgram']>;
  attachShader: MockFunction<WebGLContextType['attachShader']>;
  linkProgram: MockFunction<WebGLContextType['linkProgram']>;
  getProgramParameter: MockFunction<WebGLContextType['getProgramParameter']>;
  getAttribLocation: MockFunction<WebGLContextType['getAttribLocation']>;
  getUniformLocation: MockFunction<WebGLContextType['getUniformLocation']>;
}

describe('WebGL Utilities', () => {
  let canvas: HTMLCanvasElement;
  let mockGL: MockWebGLContext;
  let mockGetContext: jest.Mock;

  beforeEach(() => {
    // Create mock WebGL methods
    mockGL = {
      getParameter: jest.fn(),
      getSupportedExtensions: jest.fn(),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      getShaderParameter: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      getProgramParameter: jest.fn(),
      getAttribLocation: jest.fn(),
      getUniformLocation: jest.fn(),
      VERTEX_SHADER: WebGLRenderingContext.VERTEX_SHADER,
      FRAGMENT_SHADER: WebGLRenderingContext.FRAGMENT_SHADER,
      COMPILE_STATUS: WebGLRenderingContext.COMPILE_STATUS,
      LINK_STATUS: WebGLRenderingContext.LINK_STATUS,
      MAX_TEXTURE_SIZE: WebGLRenderingContext.MAX_TEXTURE_SIZE,
      MAX_VIEWPORT_DIMS: WebGLRenderingContext.MAX_VIEWPORT_DIMS,
      MAX_RENDERBUFFER_SIZE: WebGLRenderingContext.MAX_RENDERBUFFER_SIZE
    };

    mockGetContext = jest.fn();
    canvas = document.createElement('canvas');
    canvas.getContext = mockGetContext;
  });

  describe('createWebGLContext', () => {
    it('should try WebGL2 first', () => {
      mockGetContext.mockReturnValueOnce(mockGL);
      createWebGLContext(canvas);
      expect(mockGetContext).toHaveBeenCalledWith('webgl2', expect.any(Object));
    });

    it('should fall back to WebGL1', () => {
      mockGetContext
        .mockReturnValueOnce(null) // webgl2 fails
        .mockReturnValueOnce(mockGL); // webgl1 succeeds

      createWebGLContext(canvas);

      expect(mockGetContext).toHaveBeenCalledWith('webgl2', expect.any(Object));
      expect(mockGetContext).toHaveBeenCalledWith('webgl', expect.any(Object));
    });

    it('should return null context info when WebGL is not available', () => {
      mockGetContext.mockReturnValue(null);

      const contextInfo = createWebGLContext(canvas);

      expect(contextInfo.gl).toBeNull();
      expect(contextInfo.isWebGL2).toBe(false);
    });

    it('should detect WebGL capabilities', () => {
      mockGL.getParameter
        .mockReturnValueOnce(8192) // MAX_TEXTURE_SIZE
        .mockReturnValueOnce([4096, 4096]) // MAX_VIEWPORT_DIMS
        .mockReturnValueOnce(4096); // MAX_RENDERBUFFER_SIZE

      mockGL.getSupportedExtensions.mockReturnValue(['OES_texture_float']);
      mockGetContext.mockReturnValue(mockGL);

      const contextInfo = createWebGLContext(canvas);

      expect(contextInfo.maxTextureSize).toBe(8192);
      expect(contextInfo.maxViewportDims).toEqual([4096, 4096]);
      expect(contextInfo.extensions).toContain('OES_texture_float');
    });
  });

  describe('createProgram', () => {
    it('should create and link a shader program', () => {
      const mockShader = {} as WebGLShader;
      const mockProgram = {} as WebGLProgram;

      mockGL.createShader.mockReturnValue(mockShader);
      mockGL.getShaderParameter.mockReturnValue(true);
      mockGL.createProgram.mockReturnValue(mockProgram);
      mockGL.getProgramParameter.mockReturnValue(true);

      const program = createProgram(
        mockGL as WebGLContextType,
        'vertex shader source',
        'fragment shader source'
      );

      expect(program).toBe(mockProgram);
      expect(mockGL.createShader).toHaveBeenCalledTimes(2);
      expect(mockGL.linkProgram).toHaveBeenCalledWith(mockProgram);
    });

    it('should handle shader compilation failure', () => {
      mockGL.createShader.mockReturnValue({} as WebGLShader);
      mockGL.getShaderParameter.mockReturnValue(false);
      mockGL.getShaderInfoLog = jest.fn().mockReturnValue('Compilation error');

      const program = createProgram(
        mockGL as WebGLContextType,
        'invalid vertex shader',
        'fragment shader'
      );

      expect(program).toBeNull();
      expect(mockGL.getShaderInfoLog).toHaveBeenCalled();
    });
  });

  describe('initShaders', () => {
    it('should initialize shader program with attributes and uniforms', () => {
      const mockProgram = {} as WebGLProgram;
      const mockLocation = {} as WebGLUniformLocation;

      mockGL.createShader.mockReturnValue({} as WebGLShader);
      mockGL.getShaderParameter.mockReturnValue(true);
      mockGL.createProgram.mockReturnValue(mockProgram);
      mockGL.getProgramParameter.mockReturnValue(true);
      mockGL.getAttribLocation.mockReturnValue(1);
      mockGL.getUniformLocation.mockReturnValue(mockLocation);

      const result = initShaders(
        mockGL as WebGLContextType,
        'vertex',
        'fragment',
        ['position'],
        ['resolution']
      );

      expect(result.program).toBe(mockProgram);
      expect(result.attributes).toHaveProperty('position', 1);
      expect(result.uniforms).toHaveProperty('resolution');
    });
  });

  describe('checkWebGLRequirements', () => {
    it('should check required capabilities', () => {
      const contextInfo = {
        gl: mockGL as WebGLContextType,
        isWebGL2: false,
        maxTextureSize: 8192,
        maxViewportDims: [4096, 4096] as [number, number],
        maxRenderBufferSize: 4096,
        extensions: ['OES_texture_float', 'WEBGL_color_buffer_float'],
        contextAttributes: {}
      };

      const result = checkWebGLRequirements(contextInfo);
      expect(result.meetsRequirements).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('setupCanvas', () => {
    it('should set up canvas with correct pixel ratio', () => {
      const devicePixelRatio = 2;
      const width = 800;
      const height = 600;

      const canvas = setupCanvas(width, height, devicePixelRatio);

      expect(canvas.width).toBe(width * devicePixelRatio);
      expect(canvas.height).toBe(height * devicePixelRatio);
      expect(canvas.style.width).toBe(`${width}px`);
      expect(canvas.style.height).toBe(`${height}px`);
    });
  });
});
