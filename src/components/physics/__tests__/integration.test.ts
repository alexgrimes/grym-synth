import React from 'react';
import { PresetManager } from '../PresetManager';
import { AudioParameterBridge } from '../AudioParameterBridge';
import { GestureMapper } from '../GestureMapper';
import { PhysicsController } from '../PhysicsController';

describe('Physics System Integration', () => {
  let presetManager: PresetManager;
  let parameterBridge: AudioParameterBridge;
  let gestureMapper: GestureMapper;
  let physicsController: PhysicsController;

  const mockParameter = {
    id: 'test-freq',
    value: 440,
    min: 20,
    max: 20000,
    default: 440,
    type: 'continuous' as const,
    metadata: {
      name: 'Test Frequency',
      xenakisReference: 'Frequency modulation in Formalized Music'
    }
  };

  const createMockMouseEvent = (clientX: number, clientY: number): any => {
    return {
      clientX,
      clientY,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      nativeEvent: new MouseEvent('mousedown'),
      isDefaultPrevented: jest.fn(),
      isPropagationStopped: jest.fn(),
      persist: jest.fn(),
      bubbles: true,
      cancelable: true,
      currentTarget: document.createElement('div'),
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      target: document.createElement('div'),
      timeStamp: Date.now(),
      type: 'mousedown',
      altKey: false,
      button: 0,
      buttons: 1,
      ctrlKey: false,
      getModifierState: jest.fn(),
      metaKey: false,
      movementX: 0,
      movementY: 0,
      pageX: clientX,
      pageY: clientY,
      relatedTarget: null,
      screenX: clientX,
      screenY: clientY,
      shiftKey: false,
      // Add missing properties
      detail: 0,
      view: window
    };
  };

  beforeEach(() => {
    presetManager = new PresetManager();

    // Use a shared mock for parameter updates
    const mockParameterUpdate = jest.fn().mockResolvedValue(undefined);
    physicsController = new PhysicsController({
      onParameterUpdate: mockParameterUpdate
    });

    // Create mock audio engine
    const mockAudioEngine = {
      setParameter: jest.fn().mockResolvedValue(undefined),
      getParameter: jest.fn().mockResolvedValue(0),
      getAvailableParameters: jest.fn().mockResolvedValue([mockParameter]),
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

    const mockGestureField = jest.fn().mockResolvedValue(undefined);
    gestureMapper = new GestureMapper({
      onGestureField: mockGestureField,
      sensitivity: 1.0,
      maxFields: 10
    });
  });

  describe('End-to-End Parameter Flow', () => {
    it('should propagate gesture interactions to audio parameters', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const controller = new PhysicsController({
        onParameterUpdate: mockUpdate
      });

      // Register parameter with bridge
      parameterBridge.registerParameter(mockParameter, { x: 0, y: 0, z: 0 });
      controller.onParameterUpdate = mockUpdate;

      // Simulate gesture
      const gestureEvent = createMockMouseEvent(100, 100);
      await gestureMapper.handleTouch(gestureEvent);

      // Verify parameter updates
      expect(mockUpdate).toHaveBeenCalled();
      const updates = mockUpdate.mock.calls[0][0];
      expect(updates).toHaveProperty(mockParameter.id);
    });

    it('should maintain parameter constraints during transitions', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const controller = new PhysicsController({
        onParameterUpdate: mockUpdate
      });

      const testParameter = {
        ...mockParameter,
        id: 'test-param',
        value: 0.5,
        min: 0,
        max: 1,
        default: 0.5
      };

      parameterBridge.registerParameter(testParameter, { x: 0, y: 0, z: 0 });
      controller.onParameterUpdate = mockUpdate;

      // Create and apply preset
      const preset = presetManager.createPreset(
        'Test Preset',
        'Test Category',
        [{
          position: { x: 0, y: 0, z: 0 },
          strength: 2.0, // Intentionally high
          radius: 0.5,
          decay: 0.95
        }],
        [{
          id: testParameter.id,
          position: { x: 0, y: 0, z: 0 },
          value: 0.8
        }]
      );

      await controller.loadPreset(preset);

      // Check that parameter stays within bounds
      const allUpdates = mockUpdate.mock.calls.map(call => call[0]);
      allUpdates.forEach(update => {
        expect(update[testParameter.id]).toBeLessThanOrEqual(testParameter.max);
        expect(update[testParameter.id]).toBeGreaterThanOrEqual(testParameter.min);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should process parameter updates within latency threshold', async () => {
      const updates: number[] = [];
      const mockUpdate = jest.fn().mockImplementation(async (params) => {
        updates.push(performance.now());
      });

      const controller = new PhysicsController({
        onParameterUpdate: mockUpdate
      });

      // Simulate rapid gesture sequence
      for (let i = 0; i < 10; i++) {
        const event = createMockMouseEvent(100 + i * 10, 100 + i * 10);
        await gestureMapper.handleTouch(event);
      }

      // Verify update latency
      for (let i = 1; i < updates.length; i++) {
        const latency = updates[i] - updates[i - 1];
        expect(latency).toBeLessThan(200); // Max 200ms latency
      }
    });

    it('should maintain performance with multiple active fields', async () => {
      const startTime = performance.now();
      const fields = Array(10).fill(null).map((_, i) => ({
        position: { x: i * 0.1, y: 0, z: 0 },
        strength: 1.0,
        radius: 0.3,
        decay: 0.95
      }));

      // Add multiple fields rapidly
      for (const field of fields) {
        await physicsController.addField(field);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Verify total processing time
      expect(totalTime).toBeLessThan(100); // Max 100ms for 10 fields
    });
  });

  describe('Preset System Integration', () => {
    it('should smoothly transition between presets', async () => {
      const updateTimes: number[] = [];
      const mockUpdate = jest.fn().mockImplementation(async () => {
        updateTimes.push(performance.now());
      });

      const controller = new PhysicsController({
        onParameterUpdate: mockUpdate
      });

      // Create two presets
      const preset1 = presetManager.createPreset(
        'Preset 1',
        'Test',
        [{ position: { x: 0, y: 0, z: 0 }, strength: 0, radius: 0.5, decay: 0.95 }],
        []
      );

      const preset2 = presetManager.createPreset(
        'Preset 2',
        'Test',
        [{ position: { x: 1, y: 1, z: 1 }, strength: 1, radius: 1.0, decay: 0.90 }],
        []
      );

      // Perform transition
      await controller.transitionPresets(preset1, preset2, 500);

      // Verify smooth update rate
      for (let i = 1; i < updateTimes.length; i++) {
        const updateInterval = updateTimes[i] - updateTimes[i - 1];
        expect(updateInterval).toBeLessThan(32); // Minimum 30fps
      }
    });
  });
});
