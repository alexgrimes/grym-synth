/**
 * Mock implementation of the XenakisLDM audio engine for testing
 */
import { XenakisLDM } from '../components/physics/AudioParameterBridge';
import type {
  StochasticParameter,
  SpectralParameter,
  MarkovParameter
} from '../components/parameters/types/StochasticTypes';

export class MockAudioEngine implements XenakisLDM {
  private parameters: Map<string, number> = new Map();
  private audioRunning: boolean = false;
  private analysisInterval: number | null = null;

  constructor() {
    // Initialize with some default parameters
    this.initializeDefaultParameters();
  }

  private initializeDefaultParameters() {
    // Frequency parameters
    for (let i = 0; i < 8; i++) {
      const freq = 100 * Math.pow(2, i);
      this.parameters.set(`freq_${i}`, freq);
    }

    // Amplitude parameters
    for (let i = 0; i < 5; i++) {
      this.parameters.set(`amp_${i}`, 0.5);
    }

    // Filter parameters
    this.parameters.set('filter_cutoff', 1000);
    this.parameters.set('filter_resonance', 0.5);
    this.parameters.set('filter_type', 0);

    // Effect parameters
    this.parameters.set('delay_time', 0.3);
    this.parameters.set('delay_feedback', 0.4);
    this.parameters.set('reverb_size', 0.6);
    this.parameters.set('reverb_damping', 0.5);
  }

  async setParameter(parameterId: string, value: number): Promise<void> {
    this.parameters.set(parameterId, value);
    return Promise.resolve();
  }

  async getParameter(parameterId: string): Promise<number> {
    return Promise.resolve(this.parameters.get(parameterId) || 0);
  }

  async getAvailableParameters(): Promise<any[]> {
    const result = [];

    // Create parameter objects for all parameters
    for (const [id, value] of this.parameters.entries()) {
      let min = 0;
      let max = 1;
      let group = 'general';
      let name = id;

      // Set appropriate ranges and metadata based on parameter type
      if (id.startsWith('freq_')) {
        min = 20;
        max = 20000;
        group = 'frequency';
        name = `Frequency ${id.split('_')[1]}`;
      } else if (id.startsWith('amp_')) {
        min = 0;
        max = 1;
        group = 'amplitude';
        name = `Amplitude ${id.split('_')[1]}`;
      } else if (id.startsWith('filter_')) {
        if (id === 'filter_cutoff') {
          min = 20;
          max = 20000;
        }
        group = 'filter';
        name = id.replace('filter_', 'Filter ').replace(/\b\w/g, l => l.toUpperCase());
      } else if (id.startsWith('delay_') || id.startsWith('reverb_')) {
        group = 'effects';
        name = id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      result.push({
        id,
        value,
        min,
        max,
        default: value,
        type: 'continuous',
        metadata: {
          name,
          group,
          description: `Parameter ${name}`,
          xenakisReference: 'Formalized Music'
        }
      });
    }

    return Promise.resolve(result);
  }

  async startAudio(): Promise<void> {
    this.audioRunning = true;

    // Start sending periodic analysis updates
    if (this.analysisInterval === null) {
      this.analysisInterval = window.setInterval(() => {
        // This would trigger audio analysis in a real implementation
        // For the mock, we'll just generate random values
      }, 100);
    }

    return Promise.resolve();
  }

  async stopAudio(): Promise<void> {
    this.audioRunning = false;

    if (this.analysisInterval !== null) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    return Promise.resolve();
  }

  async setStochasticDistribution(
    parameterId: string,
    distribution: StochasticParameter['distribution']
  ): Promise<void> {
    // In a real implementation, this would configure the audio engine
    // to use the specified stochastic distribution for the parameter
    return Promise.resolve();
  }

  async setSpectralEnvelope(
    parameterId: string,
    envelope: SpectralParameter['envelope']
  ): Promise<void> {
    // In a real implementation, this would configure the audio engine
    // to use the specified spectral envelope for the parameter
    return Promise.resolve();
  }

  async setMarkovChain(
    parameterId: string,
    states: MarkovParameter['states'],
    transitionMatrix: MarkovParameter['transitionMatrix']
  ): Promise<void> {
    // In a real implementation, this would configure the audio engine
    // to use the specified Markov chain for the parameter
    return Promise.resolve();
  }

  async getAudioAnalysis(): Promise<{
    spectralCentroid: number;
    spectralFlux: number;
    rms: number;
    zeroCrossingRate: number;
    [key: string]: number;
  }> {
    // Generate mock audio analysis data
    // In a real implementation, this would analyze the audio signal

    return Promise.resolve({
      spectralCentroid: 0.3 + Math.random() * 0.4,
      spectralFlux: Math.random() * 0.5,
      rms: 0.2 + Math.random() * 0.3,
      zeroCrossingRate: Math.random() * 0.2,
      spectralFlatness: Math.random() * 0.7,
      spectralSpread: 0.3 + Math.random() * 0.4,
      spectralRolloff: 0.5 + Math.random() * 0.3
    });
  }

  async getRawAudioData(): Promise<Float32Array> {
    // Generate mock audio data
    // In a real implementation, this would return the raw audio buffer

    const buffer = new Float32Array(2048);

    // Generate a simple sine wave with some noise
    for (let i = 0; i < buffer.length; i++) {
      const time = i / 44100;

      // Base sine wave
      buffer[i] = Math.sin(2 * Math.PI * 440 * time);

      // Add some harmonics
      buffer[i] += 0.5 * Math.sin(2 * Math.PI * 880 * time);
      buffer[i] += 0.25 * Math.sin(2 * Math.PI * 1320 * time);

      // Add some noise
      buffer[i] += (Math.random() * 2 - 1) * 0.1;

      // Normalize
      buffer[i] *= 0.5;
    }

    return Promise.resolve(buffer);
  }

  // Additional Xenakis technique methods

  async setGranularParameters(
    parameterId: string,
    grainSize: number,
    density: number,
    randomization: number
  ): Promise<void> {
    // In a real implementation, this would configure granular synthesis
    return Promise.resolve();
  }

  async setStochasticWalk(
    parameterId: string,
    stepSize: number,
    bounds: [number, number],
    tendency: number
  ): Promise<void> {
    // In a real implementation, this would configure random walk
    return Promise.resolve();
  }

  async setGameTheoryModel(
    parameterIds: string[],
    payoffMatrix: number[][],
    strategyWeights: number[]
  ): Promise<void> {
    // In a real implementation, this would configure game theory model
    return Promise.resolve();
  }
}
