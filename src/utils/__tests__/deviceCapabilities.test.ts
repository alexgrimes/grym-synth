import {
  detectDeviceCapabilities,
  meetsMinimumRequirements,
  calculatePerformanceTier,
  getRecommendedSettings
} from '../deviceCapabilities';
import type { DeviceCapabilities } from '../../config/types';

jest.mock('../../test/setup/testEnvironment', () => ({
  mockPerformance: jest.fn(),
  resetMocks: jest.fn()
}));

interface MockWebGLContext {
  getParameter: jest.Mock;
  MAX_TEXTURE_SIZE: number;
}

describe('Device Capabilities', () => {
  let mockGL: MockWebGLContext;
  let mockGetContext: jest.Mock;

  beforeEach(() => {
    // Setup WebGL mocks
    mockGL = {
      getParameter: jest.fn(),
      MAX_TEXTURE_SIZE: 0x0D33 // WebGL MAX_TEXTURE_SIZE constant
    };

    mockGetContext = jest.fn().mockReturnValue(mockGL);

    // Mock canvas creation and context
    const mockCanvas = {
      getContext: mockGetContext
    };

    jest.spyOn(document, 'createElement')
      .mockImplementation(() => mockCanvas as unknown as HTMLElement);

    // Mock performance.memory
    Object.defineProperty(window.performance, 'memory', {
      value: {
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
        totalJSHeapSize: 1 * 1024 * 1024 * 1024, // 1GB
        usedJSHeapSize: 500 * 1024 * 1024 // 500MB
      },
      configurable: true
    });

    // Mock navigator properties
    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      value: 4,
      configurable: true
    });

    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectDeviceCapabilities', () => {
    it('should detect WebGL capabilities', () => {
      mockGL.getParameter.mockReturnValue(8192);
      const capabilities = detectDeviceCapabilities();

      expect(capabilities.isWebGLAvailable).toBe(true);
      expect(capabilities.maxTextureSize).toBe(8192);
    });

    it('should handle missing WebGL', () => {
      mockGetContext.mockReturnValue(null);
      const capabilities = detectDeviceCapabilities();

      expect(capabilities.isWebGLAvailable).toBe(false);
      expect(capabilities.maxTextureSize).toBeUndefined();
    });

    it('should detect hardware concurrency', () => {
      const capabilities = detectDeviceCapabilities();
      expect(capabilities.hardwareConcurrency).toBe(4);
    });

    it('should handle missing hardware concurrency', () => {
      Object.defineProperty(window.navigator, 'hardwareConcurrency', {
        value: undefined,
        configurable: true
      });

      const capabilities = detectDeviceCapabilities();
      expect(capabilities.hardwareConcurrency).toBe(1);
    });

    it('should detect device pixel ratio', () => {
      const capabilities = detectDeviceCapabilities();
      expect(capabilities.devicePixelRatio).toBe(2);
    });
  });

  describe('meetsMinimumRequirements', () => {
    it('should return true for capable devices', () => {
      const capabilities: DeviceCapabilities = {
        isWebGLAvailable: true,
        isWebAssemblyAvailable: true,
        hardwareConcurrency: 2,
        devicePixelRatio: 1,
        touchPoints: 0
      };

      expect(meetsMinimumRequirements(capabilities)).toBe(true);
    });

    it('should return false when WebGL is not available', () => {
      const capabilities: DeviceCapabilities = {
        isWebGLAvailable: false,
        isWebAssemblyAvailable: true,
        hardwareConcurrency: 2,
        devicePixelRatio: 1,
        touchPoints: 0
      };

      expect(meetsMinimumRequirements(capabilities)).toBe(false);
    });

    it('should return false when WebAssembly is not available', () => {
      const capabilities: DeviceCapabilities = {
        isWebGLAvailable: true,
        isWebAssemblyAvailable: false,
        hardwareConcurrency: 2,
        devicePixelRatio: 1,
        touchPoints: 0
      };

      expect(meetsMinimumRequirements(capabilities)).toBe(false);
    });
  });

  describe('calculatePerformanceTier', () => {
    it('should calculate tier 3 for high-end devices', () => {
      const capabilities: DeviceCapabilities = {
        hardwareConcurrency: 8,
        memory: {
          jsHeapSizeLimit: 4 * 1024 * 1024 * 1024,
          totalJSHeapSize: 2 * 1024 * 1024 * 1024,
          usedJSHeapSize: 1 * 1024 * 1024 * 1024
        },
        isWebGLAvailable: true,
        maxTextureSize: 8192,
        isWebAssemblyAvailable: true,
        devicePixelRatio: 2,
        touchPoints: 5
      };

      expect(calculatePerformanceTier(capabilities)).toBe(3);
    });

    it('should calculate tier 0 for low-end devices', () => {
      const capabilities: DeviceCapabilities = {
        hardwareConcurrency: 1,
        isWebGLAvailable: false,
        isWebAssemblyAvailable: true,
        devicePixelRatio: 1,
        touchPoints: 0
      };

      expect(calculatePerformanceTier(capabilities)).toBe(0);
    });
  });

  describe('getRecommendedSettings', () => {
    it('should return ultra settings for high-end devices', () => {
      const capabilities: DeviceCapabilities = {
        hardwareConcurrency: 8,
        memory: {
          jsHeapSizeLimit: 4 * 1024 * 1024 * 1024,
          totalJSHeapSize: 2 * 1024 * 1024 * 1024,
          usedJSHeapSize: 1 * 1024 * 1024 * 1024
        },
        isWebGLAvailable: true,
        maxTextureSize: 8192,
        isWebAssemblyAvailable: true,
        devicePixelRatio: 2,
        touchPoints: 5
      };

      const settings = getRecommendedSettings(capabilities);
      expect(settings.quality).toBe('ultra');
      expect(settings.useWebGL2).toBe(true);
      expect(settings.workerCount).toBe(7);
    });

    it('should return low settings for low-end devices', () => {
      const capabilities: DeviceCapabilities = {
        hardwareConcurrency: 1,
        isWebGLAvailable: false,
        isWebAssemblyAvailable: true,
        devicePixelRatio: 1,
        touchPoints: 0
      };

      const settings = getRecommendedSettings(capabilities);
      expect(settings.quality).toBe('low');
      expect(settings.useWebGL2).toBe(false);
      expect(settings.workerCount).toBe(1);
      expect(settings.maxFields).toBe(25);
    });
  });
});
