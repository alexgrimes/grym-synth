import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock types that match Web Audio API interfaces
interface MockAudioNode {
  connect: jest.Mock;
  disconnect?: jest.Mock;
}

interface MockOscillatorNode extends MockAudioNode {
  start: jest.Mock;
  stop: jest.Mock;
  frequency: { value: number };
}

interface MockGainNode extends MockAudioNode {
  gain: { value: number };
}

interface MockBiquadFilterNode extends MockAudioNode {
  frequency: { value: number };
  Q: { value: number };
  type: BiquadFilterType;
}

interface MockAnalyserNode extends MockAudioNode {
  fftSize: number;
  getByteTimeDomainData: jest.Mock;
  getByteFrequencyData: jest.Mock;
}

interface MockAudioContext {
  createOscillator: () => MockOscillatorNode;
  createGain: () => MockGainNode;
  createBiquadFilter: () => MockBiquadFilterNode;
  createAnalyser: () => MockAnalyserNode;
  destination: AudioDestinationNode;
  state: AudioContextState;
  resume: () => Promise<void>;
}

// Create mock implementations
const mockOscillator: MockOscillatorNode = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { value: 440 },
};

const mockGainNode: MockGainNode = {
  connect: jest.fn(),
  gain: { value: 0.5 },
};

const mockBiquadFilter: MockBiquadFilterNode = {
  connect: jest.fn(),
  frequency: { value: 1000 },
  Q: { value: 1 },
  type: 'lowpass',
};

const mockAnalyser: MockAnalyserNode = {
  connect: jest.fn(),
  fftSize: 2048,
  getByteTimeDomainData: jest.fn(),
  getByteFrequencyData: jest.fn(),
};

// Create properly typed mock functions
const createMockOscillator = () =>
  jest.fn<() => MockOscillatorNode>().mockImplementation(() => mockOscillator);

const createMockGain = () =>
  jest.fn<() => MockGainNode>().mockImplementation(() => mockGainNode);

const createMockBiquadFilter = () =>
  jest.fn<() => MockBiquadFilterNode>().mockImplementation(() => mockBiquadFilter);

const createMockAnalyser = () =>
  jest.fn<() => MockAnalyserNode>().mockImplementation(() => mockAnalyser);

const createMockResume = () =>
  jest.fn<() => Promise<void>>().mockImplementation(() => Promise.resolve());

// Create mock AudioContext with explicit return types
const mockAudioContext: MockAudioContext = {
  createOscillator: createMockOscillator(),
  createGain: createMockGain(),
  createBiquadFilter: createMockBiquadFilter(),
  createAnalyser: createMockAnalyser(),
  destination: {} as AudioDestinationNode,
  state: 'running',
  resume: createMockResume(),
};

// Mock global AudioContext
(global as any).AudioContext = jest.fn(() => mockAudioContext);

describe('Audio Processing Chain', () => {
  let audioContext: MockAudioContext;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create new AudioContext for each test
    audioContext = new (global as any).AudioContext();
  });

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });

  test('initializes AudioContext successfully', async () => {
    expect(audioContext).toBeDefined();
    expect(audioContext.state).toBe('running');

    // Test resume functionality
    await audioContext.resume();
    expect(audioContext.resume).toHaveBeenCalled();
  });

  test('processes audio through complete chain', async () => {
    // Create audio nodes with explicit typing
    const oscillator: MockOscillatorNode = audioContext.createOscillator();
    const gainNode: MockGainNode = audioContext.createGain();
    const filter: MockBiquadFilterNode = audioContext.createBiquadFilter();
    const analyser: MockAnalyserNode = audioContext.createAnalyser();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(analyser);
    analyser.connect(audioContext.destination);

    // Verify connections
    expect(oscillator.connect).toHaveBeenCalledWith(gainNode);
    expect(gainNode.connect).toHaveBeenCalledWith(filter);
    expect(filter.connect).toHaveBeenCalledWith(analyser);
    expect(analyser.connect).toHaveBeenCalledWith(audioContext.destination);

    // Start audio processing
    oscillator.start();
    expect(oscillator.start).toHaveBeenCalled();

    // Verify oscillator frequency
    expect(oscillator.frequency.value).toBe(440); // Default A4 note
  });

  test('applies effects correctly', async () => {
    // Create and configure effects chain with explicit typing
    const gainNode: MockGainNode = audioContext.createGain();
    const filter: MockBiquadFilterNode = audioContext.createBiquadFilter();

    // Test gain settings
    gainNode.gain.value = 0.5;
    expect(gainNode.gain.value).toBe(0.5);

    // Test filter settings
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1;

    expect(filter.type).toBe('lowpass');
    expect(filter.frequency.value).toBe(1000);
    expect(filter.Q.value).toBe(1);

    // Connect effects
    gainNode.connect(filter);
    expect(gainNode.connect).toHaveBeenCalledWith(filter);
  });
});
