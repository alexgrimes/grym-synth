import { PERFORMANCE_CONFIG } from '../config/performance';

export type WebGLContextType = WebGLRenderingContext | WebGL2RenderingContext;

export interface WebGLContextInfo {
  gl: WebGLContextType | null;
  isWebGL2: boolean;
  maxTextureSize: number;
  maxViewportDims: [number, number];
  maxRenderBufferSize: number;
  extensions: string[];
  contextAttributes: WebGLContextAttributes;
}

/**
 * Try to create a WebGL context with the best available capabilities
 */
export function createWebGLContext(canvas: HTMLCanvasElement): WebGLContextInfo {
  const contextAttributes: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    depth: true,
    failIfMajorPerformanceCaveat: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false
  };

  // Try WebGL 2 first
  const gl2 = canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext | null;
  if (gl2) {
    return createContextInfo(gl2, true, contextAttributes);
  }

  // Fall back to WebGL 1
  const gl1 = (
    canvas.getContext('webgl', contextAttributes) ||
    canvas.getContext('experimental-webgl', contextAttributes)
  ) as WebGLRenderingContext | null;

  if (gl1) {
    return createContextInfo(gl1, false, contextAttributes);
  }

  // Return null context info if no context could be created
  return {
    gl: null,
    isWebGL2: false,
    maxTextureSize: 0,
    maxViewportDims: [0, 0],
    maxRenderBufferSize: 0,
    extensions: [],
    contextAttributes
  };
}

function createContextInfo(
  gl: WebGLContextType,
  isWebGL2: boolean,
  contextAttributes: WebGLContextAttributes
): WebGLContextInfo {
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  const extensions = gl.getSupportedExtensions() || [];

  return {
    gl,
    isWebGL2,
    maxTextureSize,
    maxViewportDims: [
      maxViewportDims?.[0] || 0,
      maxViewportDims?.[1] || 0
    ],
    maxRenderBufferSize,
    extensions,
    contextAttributes
  };
}

/**
 * Initialize a shader program
 */
export function createProgram(
  gl: WebGLContextType,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Failed to link program:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * Compile a shader from source
 */
function compileShader(
  gl: WebGLContextType,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      `Failed to compile ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader:`,
      gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Initialize shader program with attribute and uniform locations
 */
export function initShaders(
  gl: WebGLContextType,
  vertexSource: string,
  fragmentSource: string,
  attributes: string[],
  uniforms: string[]
): {
  program: WebGLProgram | null;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
} {
  const program = createProgram(gl, vertexSource, fragmentSource);
  if (!program) {
    return { program: null, attributes: {}, uniforms: {} };
  }

  const attributeLocations: Record<string, number> = {};
  const uniformLocations: Record<string, WebGLUniformLocation | null> = {};

  attributes.forEach(attribute => {
    attributeLocations[attribute] = gl.getAttribLocation(program, attribute);
  });

  uniforms.forEach(uniform => {
    uniformLocations[uniform] = gl.getUniformLocation(program, uniform);
  });

  return {
    program,
    attributes: attributeLocations,
    uniforms: uniformLocations
  };
}

/**
 * Check if required WebGL capabilities are available
 */
export function checkWebGLRequirements(contextInfo: WebGLContextInfo): {
  meetsRequirements: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!contextInfo.gl) {
    issues.push('WebGL context creation failed');
    return { meetsRequirements: false, issues };
  }

  // Check texture size requirements
  const requiredTextureSize = 4096; // Minimum required texture size
  if (contextInfo.maxTextureSize < requiredTextureSize) {
    issues.push(`Max texture size (${contextInfo.maxTextureSize}) is below required ${requiredTextureSize}`);
  }

  // Check required extensions
  const requiredExtensions = [
    'OES_texture_float',
    'WEBGL_color_buffer_float'
  ];

  for (const ext of requiredExtensions) {
    if (!contextInfo.extensions.includes(ext)) {
      issues.push(`Required extension ${ext} is not available`);
    }
  }

  return {
    meetsRequirements: issues.length === 0,
    issues
  };
}

/**
 * Create and resize a canvas with proper device pixel ratio handling
 */
export function setupCanvas(
  width: number,
  height: number,
  devicePixelRatio: number = window.devicePixelRatio
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const scaledWidth = Math.floor(width * devicePixelRatio);
  const scaledHeight = Math.floor(height * devicePixelRatio);

  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  return canvas;
}

/**
 * Handle WebGL context loss and restoration
 */
export function handleContextEvents(
  canvas: HTMLCanvasElement,
  onContextLost: () => void,
  onContextRestored: () => void
): () => void {
  const handleLost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };

  const handleRestored = () => {
    onContextRestored();
  };

  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost);
    canvas.removeEventListener('webglcontextrestored', handleRestored);
  };
}

export default {
  createWebGLContext,
  createProgram,
  initShaders,
  checkWebGLRequirements,
  setupCanvas,
  handleContextEvents
};
