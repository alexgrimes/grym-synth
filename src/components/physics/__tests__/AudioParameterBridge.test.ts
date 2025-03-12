import { AudioParameterBridge, XenakisLDM } from '../AudioParameterBridge';
import { PhysicsController } from '../PhysicsController';
import { Vector3D } from '../../parameters/types/StochasticTypes';

// Mock the PhysicsController
jest.mock('../PhysicsController', () => {
  return {
    PhysicsController: jest.fn().mockImplementation(() => {
      const eventHandlers: Record<string, Array<(...args: any[]) => void>> = {};

      return {
        on: jest.fn((event: string, handler: (...args: any[]) => void) => {
          if (!eventHandlers[event]) {
            eventHandlers[event] = [];
          }
          eventHandlers[event].push(handler);
        }),
        off: jest.fn(),
        emit: jest.fn((event: string, ...args: any[]) => {
          if (eventHandlers[event]) {
            eventHandlers[event].forEach(handler => handler(...args));
          }
        }),
        addField: jest.fn().mockImplementation(async (fieldData) => {
          const fieldId = `field_${Date.now()}`;
          const field = { id: fieldId, ...fieldData };

          // Emit the fieldAdded event
          if (eventHandlers['fieldAdded']) {
            eventHandlers['fieldAdded'].forEach(handler => handler(field));
          }

          return fieldId;
        }),
        updatePhysics: jest.fn().mockResolvedValue(undefined),
        clearFields: jest.fn(),
        getPerformanceReport: jest.fn().mockReturnValue('Mock performance report')
      };
    })
  };
});

// Mock XenakisLDM audio engine
const createMockXenakisLDM = (): jest.Mocked<XenakisLDM> => {
  return {
    setParameter: jest.fn().mockResolvedValue(undefined),
    getParameter: jest.fn().mockResolvedValue(0.5),
    getAvailableParameters: jest.fn().mockResolvedValue([
      {
        id: 'frequency',
        value: 440,
        min: 20,
        max: 20000,
        default: 440,
        type: 'continuous',
        metadata: {
          name: 'Frequency',
          group: 'frequency',
          description: 'Main oscillator frequency'
        }
      },
      {
        id: 'amplitude',
        value: 0.8,
        min: 0,
        max: 1,
        default: 0.8,
        type: 'continuous',
        metadata: {
          name: 'Amplitude',
          group: 'amplitude',
          description: 'Main oscillator amplitude'
        }
      },
      {
        id: 'decay',
        value: 0.5,
        min: 0.1,
        max: 10,
        default: 0.5,
        type: 'continuous',
        metadata: {
          name: 'Decay Time',
          group: 'time',
          description: 'Envelope decay time'
        }
      }
    ]),
    startAudio: jest.fn().mockResolvedValue(undefined),
    stopAudio: jest.fn().mockResolvedValue(undefined),
    setStochasticDistribution: jest.fn().mockResolvedValue(undefined),
    setSpectralEnvelope: jest.fn().mockResolvedValue(undefined),
    setMarkovChain: jest.fn().mockResolvedValue(undefined),
    getAudioAnalysis: jest.fn().mockResolvedValue({
      spectralCentroid: 0.6,
      spectralFlux: 0.3,
      rms: 0.7,
      zeroCrossingRate: 0.2
    })
  } as unknown as jest.Mocked<XenakisLDM>;
};

describe('AudioParameterBridge', () => {
  let physicsController: PhysicsController;
  let audioEngine: jest.Mocked<XenakisLDM>;
  let bridge: AudioParameterBridge;

  beforeEach(async () => {
    jest.clearAllMocks();
    physicsController = new PhysicsController({ onParameterUpdate: jest.fn() });
    audioEngine = createMockXenakisLDM();
    bridge = new AudioParameterBridge(physicsController, audioEngine);

    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    bridge.stopSyncLoop();
  });

  test('initializes with available parameters from audio engine', async () => {
    expect(audioEngine.getAvailableParameters).toHaveBeenCalled();

    // Check that parameters were registered
    const visualizationData = bridge.getVisualizationData();
    expect(visualizationData.parameters.length).toBe(3);
    expect(visualizationData.parameters[0].id).toBe('frequency');
    expect(visualizationData.parameters[1].id).toBe('amplitude');
    expect(visualizationData.parameters[2].id).toBe('decay');
  });

  test('updates parameters when fields are added', async () => {
    // Add a field
    const fieldData = {
      position: { x: 0.5, y: 0.5, z: 0.5 },
      strength: 0.8,
      radius: 0.6,
      decay: 0.9
    };

    await physicsController.addField(fieldData);

    // Wait for updates to propagate
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that parameters were updated
    expect(audioEngine.setParameter).toHaveBeenCalled();
  });

  test('creates bidirectional mapping between audio analysis and field properties', async () => {
    // Add a field
    const fieldId = await physicsController.addField({
      position: { x: 0.5, y: 0.5, z: 0.5 },
      strength: 0.8,
      radius: 0.6,
      decay: 0.9
    });

    // Create bidirectional mapping
    bridge.createBidirectionalMapping('spectralCentroid', 'radius', fieldId, 0.5);

    // Simulate audio analysis update
    bridge.emit('audioAnalysisUpdated', {
      spectralCentroid: 0.8,
      spectralFlux: 0.3,
      rms: 0.7,
      zeroCrossingRate: 0.2
    });

    // Wait for updates to propagate
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that field properties were updated based on audio analysis
    const visualizationData = bridge.getVisualizationData();
    const updatedField = visualizationData.fields.find(f => f.id === fieldId);

    expect(updatedField).toBeDefined();
    if (updatedField) {
      // The radius should be updated based on spectralCentroid * scaleFactor
      // spectralCentroid (0.8) * scaleFactor (0.5) = 0.4
      expect(updatedField.radius).toBeCloseTo(0.4, 1);
    }
  });

  test('maps and unmaps parameters to fields', async () => {
    // Add a field
    const fieldId = await physicsController.addField({
      position: { x: 0.5, y: 0.5, z: 0.5 },
      strength: 0.8,
      radius: 0.6,
      decay: 0.9
    });

    // Map a parameter to the field
    const result = bridge.mapParameterToField('frequency', fieldId);
    expect(result).toBe(true);

    // Check that the parameter is in the field's affected parameters
    const visualizationData = bridge.getVisualizationData();
    const field = visualizationData.fields.find(f => f.id === fieldId);
    expect(field?.affectedParameterCount).toBe(1);

    // Unmap the parameter
    const unmapResult = bridge.unmapParameterFromField('frequency', fieldId);
    expect(unmapResult).toBe(true);

    // Check that the parameter is no longer in the field's affected parameters
    const updatedVisualizationData = bridge.getVisualizationData();
    const updatedField = updatedVisualizationData.fields.find(f => f.id === fieldId);
    expect(updatedField?.affectedParameterCount).toBe(0);
  });

  test('applies parameter updates to audio engine', async () => {
    // Add a field that will affect parameters
    await physicsController.addField({
      position: { x: 0.5, y: 0.5, z: 0.5 },
      strength: 0.8,
      radius: 0.9, // Large radius to affect all parameters
      decay: 0.9
    });

    // Wait for updates to propagate
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that parameters were updated in the audio engine
    expect(audioEngine.setParameter).toHaveBeenCalledTimes(3); // Once for each parameter
    expect(audioEngine.setParameter).toHaveBeenCalledWith('frequency', expect.any(Number));
    expect(audioEngine.setParameter).toHaveBeenCalledWith('amplitude', expect.any(Number));
    expect(audioEngine.setParameter).toHaveBeenCalledWith('decay', expect.any(Number));
  });

  test('handles latency compensation for parameter updates', async () => {
    // Add a field
    await physicsController.addField({
      position: { x: 0.5, y: 0.5, z: 0.5 },
      strength: 0.8,
      radius: 0.9,
      decay: 0.9
    });

    // Wait for updates to propagate
    await new Promise(resolve => setTimeout(resolve, 50));

    // Get parameter values
    const parameterValues = bridge.getParameterValues();

    // Check that all parameters have values
    expect(parameterValues.size).toBe(3);
    expect(parameterValues.has('frequency')).toBe(true);
    expect(parameterValues.has('amplitude')).toBe(true);
    expect(parameterValues.has('decay')).toBe(true);
  });

  test('resets all fields and parameters', async () => {
    // Add a field
    await physicsController.addField({
      position: { x: 0.5, y: 0.5, z: 0.5 },
      strength: 0.8,
      radius: 0.6,
      decay: 0.9
    });

    // Wait for updates to propagate
    await new Promise(resolve => setTimeout(resolve, 50));

    // Reset the bridge
    bridge.reset();

    // Check that fields were cleared
    const visualizationData = bridge.getVisualizationData();
    expect(visualizationData.fields.length).toBe(0);
  });
});
