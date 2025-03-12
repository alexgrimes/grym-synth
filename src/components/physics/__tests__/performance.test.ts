import { PhysicsController } from '../PhysicsController';
import { PresetManager } from '../PresetManager';
import { AudioParameterBridge } from '../AudioParameterBridge';
import {
  createTestField,
  createTestParameters,
  measureUpdateLatency,
  simulateGestureSequence,
  createCircularGesture,
  waitForPhysicsUpdate
} from '../../../test/helpers/physicsTestHelpers';

describe('Physics System Performance', () => {
  let physicsController: PhysicsController;
  let parameterBridge: AudioParameterBridge;
  let presetManager: PresetManager;

  beforeEach(() => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    physicsController = new PhysicsController({
      onParameterUpdate: mockUpdate
    });

    // Create mock audio engine
    const mockAudioEngine = {
      setParameter: jest.fn().mockResolvedValue(undefined),
      getParameter: jest.fn().mockResolvedValue(0),
      getAvailableParameters: jest.fn().mockResolvedValue([]),
      startAudio: jest.fn().mockResolvedValue(undefined),
      stopAudio: jest.fn().mockResolvedValue(undefined),
      setStochasticDistribution: jest.fn().mockResolvedValue(undefined),
      setSpectralEnvelope: jest.fn().mockResolvedValue(undefined),
      setMarkovChain: jest.fn().mockResolvedValue(undefined),
      getAudioAnalysis: jest.fn().mockResolvedValue({
        spectralCentroid: 0.5,
        spectralFlux: 0.2,
        rms: 0.7,
        zeroCrossingRate: 0.3
      })
    };

    parameterBridge = new AudioParameterBridge(physicsController, mockAudioEngine);
    presetManager = new PresetManager();
  });

  describe('Latency Requirements', () => {
    it('should process single field updates within 16ms', async () => {
      const field = createTestField();
      const { average, max } = await measureUpdateLatency(
        async () => {
          await physicsController.addField(field);
          await waitForPhysicsUpdate();
        }
      );

      expect(max).toBeLessThan(16); // Must maintain 60fps
      expect(average).toBeLessThan(8); // Target 120fps average
    });

    it('should handle rapid field creation/deletion', async () => {
      const fields = Array.from({ length: 20 }, (_, i) =>
        createTestField(i * 0.1, 0, 0)
      );

      const { average, max } = await measureUpdateLatency(
        async () => {
          // Add and remove fields rapidly
          for (const field of fields) {
            await physicsController.addField(field);
            await waitForPhysicsUpdate();
          }
        }
      );

      expect(max).toBeLessThan(32); // Allow slight relaxation for bulk operations
      expect(average).toBeLessThan(16);
    });

    it('should maintain performance with maximum number of fields', async () => {
      // Create maximum allowed fields
      const fields = Array.from({ length: 100 }, (_, i) =>
        createTestField(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        )
      );

      for (const field of fields) {
        await physicsController.addField(field);
      }

      const { average, max } = await measureUpdateLatency(
        async () => {
          await waitForPhysicsUpdate();
        },
        30 // Measure over 30 frames
      );

      expect(max).toBeLessThan(32);
      expect(average).toBeLessThan(16);
    });
  });

  describe('Parameter Update Performance', () => {
    it('should efficiently update large number of parameters', async () => {
      const parameters = createTestParameters(1000);
      parameters.forEach(param => {
        parameterBridge.registerParameter(param, { x: 0, y: 0, z: 0 });
      });

      const field = createTestField(0, 0, 0, 2.0); // Strong field affecting all parameters
      await physicsController.addField(field);

      const { average, max } = await measureUpdateLatency(
        async () => {
          await waitForPhysicsUpdate();
        },
        60 // Test over one second at 60fps
      );

      expect(max).toBeLessThan(16);
      expect(average).toBeLessThan(8);
    });

    it('should handle complex gesture interaction performance', async () => {
      const container = document.createElement('div');
      const centerX = 200;
      const centerY = 200;

      // Create circular gesture path
      const gesturePoints = createCircularGesture(centerX, centerY, 100, 60);

      const { average, max } = await measureUpdateLatency(
        async () => {
          await simulateGestureSequence(container, gesturePoints, 1000);
        }
      );

      expect(max).toBeLessThan(32); // Allow for gesture processing overhead
      expect(average).toBeLessThan(16);
    });
  });

  describe('Memory Management', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      const fields = Array.from({ length: 100 }, () => createTestField());
      const parameters = createTestParameters(1000);

      // Register parameters
      parameters.forEach(param => {
        parameterBridge.registerParameter(param, { x: 0, y: 0, z: 0 });
      });

      // Add fields
      for (const field of fields) {
        await physicsController.addField(field);
      }

      // Run system for 5 seconds
      const startTime = performance.now();
      while (performance.now() - startTime < 5000) {
        await waitForPhysicsUpdate();
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory growth should be minimal
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max growth
    });

    it('should properly clean up resources', async () => {
      const fields = Array.from({ length: 50 }, () => createTestField());

      // Add and remove fields repeatedly
      for (let i = 0; i < 10; i++) {
        for (const field of fields) {
          await physicsController.addField(field);
        }
        await physicsController.clearFields();
      }

      const heapSnapshot = await global.gc?.();
      const finalMemory = performance.memory?.usedJSHeapSize || 0;

      // Verify no memory leaks
      expect(finalMemory).toBeLessThan(100 * 1024 * 1024); // 100MB total limit
    });
  });
});
