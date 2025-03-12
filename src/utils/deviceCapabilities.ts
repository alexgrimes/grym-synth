import type { DeviceCapabilities } from '../config/types';

type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

interface RecommendedSettings {
  quality: QualityLevel;
  maxFields: number;
  maxParameters: number;
  useWebGL2: boolean;
  batchSize: number;
  workerCount: number;
}

/**
 * Detect WebGL capabilities
 */
function detectWebGLCapabilities(): {
  isAvailable: boolean;
  maxTextureSize?: number;
} {
  try {
    const canvas = document.createElement('canvas');
    const gl = (
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null;

    if (!gl) {
      return { isAvailable: false };
    }

    return {
      isAvailable: true,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
    };
  } catch (e) {
    console.warn('WebGL detection failed:', e);
    return { isAvailable: false };
  }
}

/**
 * Check WebAssembly support
 */
function detectWebAssemblySupport(): boolean {
  try {
    if (typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        new Uint8Array([0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
      );
      if (module instanceof WebAssembly.Module) {
        const instance = new WebAssembly.Instance(module);
        return instance instanceof WebAssembly.Instance;
      }
    }
  } catch (e) {
    console.warn('WebAssembly support detection failed:', e);
  }
  return false;
}

/**
 * Get the number of touch points supported
 */
function detectTouchPoints(): number {
  if ('maxTouchPoints' in navigator) {
    return navigator.maxTouchPoints;
  } else if ('msMaxTouchPoints' in navigator) {
    return (navigator as any).msMaxTouchPoints;
  }
  return 0;
}

/**
 * Detect device capabilities
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const webgl = detectWebGLCapabilities();

  const capabilities: DeviceCapabilities = {
    memory: performance?.memory,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    isWebGLAvailable: webgl.isAvailable,
    maxTextureSize: webgl.maxTextureSize,
    isWebAssemblyAvailable: detectWebAssemblySupport(),
    devicePixelRatio: window.devicePixelRatio || 1,
    touchPoints: detectTouchPoints()
  };

  return capabilities;
}

/**
 * Check if the device meets minimum requirements
 */
export function meetsMinimumRequirements(capabilities: DeviceCapabilities): boolean {
  return (
    capabilities.isWebGLAvailable &&
    capabilities.isWebAssemblyAvailable &&
    capabilities.hardwareConcurrency >= 1
  );
}

/**
 * Calculate performance tier (0-3) based on device capabilities
 */
export function calculatePerformanceTier(capabilities: DeviceCapabilities): number {
  let score = 0;

  // CPU cores
  score += Math.min(capabilities.hardwareConcurrency - 1, 4);

  // Memory
  if (capabilities.memory) {
    const memoryGB = capabilities.memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
    score += Math.min(Math.floor(memoryGB), 4);
  }

  // GPU/WebGL
  if (capabilities.isWebGLAvailable) {
    score += 2;
    if (capabilities.maxTextureSize && capabilities.maxTextureSize >= 8192) {
      score += 1;
    }
  }

  // Device pixel ratio (retina displays)
  if (capabilities.devicePixelRatio > 1) {
    score += 1;
  }

  // Normalize to 0-3 range
  return Math.min(Math.floor(score / 3), 3);
}

/**
 * Get recommended settings based on device capabilities
 */
export function getRecommendedSettings(capabilities: DeviceCapabilities): RecommendedSettings {
  const tier = calculatePerformanceTier(capabilities);

  const settings: RecommendedSettings = {
    quality: 'medium',
    maxFields: 50,
    maxParameters: 500,
    useWebGL2: false,
    batchSize: 32,
    workerCount: 1
  };

  switch (tier) {
    case 3: // High-end devices
      return {
        quality: 'ultra',
        maxFields: 200,
        maxParameters: 2000,
        useWebGL2: true,
        batchSize: 128,
        workerCount: Math.max(1, capabilities.hardwareConcurrency - 1)
      };

    case 2: // Mid-high devices
      return {
        quality: 'high',
        maxFields: 100,
        maxParameters: 1000,
        useWebGL2: true,
        batchSize: 64,
        workerCount: Math.max(1, Math.floor(capabilities.hardwareConcurrency / 2))
      };

    case 1: // Mid-range devices
      return {
        quality: 'medium',
        maxFields: 50,
        maxParameters: 500,
        useWebGL2: false,
        batchSize: 32,
        workerCount: 1
      };

    case 0: // Low-end devices
      return {
        quality: 'low',
        maxFields: 25,
        maxParameters: 250,
        useWebGL2: false,
        batchSize: 16,
        workerCount: 1
      };

    default:
      return settings;
  }
}

export default {
  detectDeviceCapabilities,
  meetsMinimumRequirements,
  calculatePerformanceTier,
  getRecommendedSettings
};
