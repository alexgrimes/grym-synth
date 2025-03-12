import { XenakisLDM } from '../AudioParameterBridge';
import type { StochasticParameter, SpectralParameter, MarkovParameter } from '../../parameters/types/StochasticTypes';

/**
 * Mock implementation of the XenakisLDM audio engine for testing and development
 * This is a simplified version that doesn't use the Web Audio API
 */
export class MockXenakisLDM implements XenakisLDM {
  private parameters: Map<string, {
    value: number;
    min: number;
    max: number;
    default: number;
    type: 'continuous' | 'discrete' | 'trigger';
    metadata?: {
      name: string;
      description?: string;
      group?: string;
      xenakisReference?: string;
    };
  }>;

  private isPlaying: boolean = false;
  private analysisData: Record<string, number> = {
    spectralCentroid: 0.5,
    spectralFlux: 0.3,
    rms: 0.7,
    zeroCrossingRate: 0.2,
    peak: 0.8,
    energy: 0.6
  };
  private analysisUpdateInterval: number | null = null;

  constructor() {
    this.parameters = new Map();

    // Initialize with some default parameters
    this.initializeDefaultParameters();
  }

  /**
   * Initialize default parameters for testing
   */
  private initializeDefaultParameters(): void {
    // Frequency parameters
    this.parameters.set('frequency1', {
      value: 440,
      min: 20,
      max: 2000,
      default: 440,
      type: 'continuous',
      metadata: {
        name: 'Frequency 1',
        description: 'Main oscillator frequency',
        group: 'frequency'
      }
    });

    this.parameters.set('frequency2', {
      value: 880,
      min: 20,
      max: 2000,
      default: 880,
      type: 'continuous',
      metadata: {
        name: 'Frequency 2',
        description: 'Secondary oscillator frequency',
        group: 'frequency'
      }
    });

    // Amplitude parameters
    this.parameters.set('amplitude1', {
      value: 0.5,
      min: 0,
      max: 1,
      default: 0.5,
      type: 'continuous',
      metadata: {
        name: 'Amplitude 1',
        description: 'Main oscillator amplitude',
        group: 'amplitude'
      }
    });

    this.parameters.set('amplitude2', {
      value: 0.3,
      min: 0,
      max: 1,
      default: 0.3,
      type: 'continuous',
      metadata: {
        name: 'Amplitude 2',
        description: 'Secondary oscillator amplitude',
        group: 'amplitude'
      }
    });

    // Time parameters
    this.parameters.set('attack', {
      value: 0.1,
      min: 0.01,
      max: 2,
      default: 0.1,
      type: 'continuous',
      metadata: {
        name: 'Attack',
        description: 'Envelope attack time',
        group: 'time'
      }
    });

    this.parameters.set('release', {
      value: 0.5,
      min: 0.01,
      max: 5,
      default: 0.5,
      type: 'continuous',
      metadata: {
        name: 'Release',
        description: 'Envelope release time',
        group: 'time'
      }
    });

    // Stochastic parameters
    this.parameters.set('density', {
      value: 0.5,
      min: 0,
      max: 1,
      default: 0.5,
      type: 'continuous',
      metadata: {
        name: 'Density',
        description: 'Event density for stochastic processes',
        group: 'stochastic',
        xenakisReference: 'Formalized Music, Chapter 1'
      }
    });

    this.parameters.set('randomness', {
      value: 0.3,
      min: 0,
      max: 1,
      default: 0.3,
      type: 'continuous',
      metadata: {
        name: 'Randomness',
        description: 'Randomness factor for stochastic processes',
        group: 'stochastic',
        xenakisReference: 'Formalized Music, Chapter 1'
      }
    });
  }

  /**
   * Set a parameter value
   */
  async setParameter(parameterId: string, value: number): Promise<void> {
    const param = this.parameters.get(parameterId);
    if (!param) {
      console.warn(`Parameter ${parameterId} not found`);
      return;
    }

    // Clamp value to parameter range
    const clampedValue = Math.max(param.min, Math.min(param.max, value));
    param.value = clampedValue;

    // Update analysis data based on parameter changes
    if (this.isPlaying) {
      this.updateAnalysisData();
    }
  }

  /**
   * Get a parameter value
   */
  async getParameter(parameterId: string): Promise<number> {
    const param = this.parameters.get(parameterId);
    if (!param) {
      console.warn(`Parameter ${parameterId} not found`);
      return 0;
    }

    return param.value;
  }

  /**
   * Get all available parameters
   */
  async getAvailableParameters(): Promise<any[]> {
    return Array.from(this.parameters.entries()).map(([id, param]) => ({
      id,
      ...param
    }));
  }

  /**
   * Start audio playback (simulated)
   */
  async startAudio(): Promise<void> {
    if (this.isPlaying) return;

    try {
      // Start simulated audio
      this.isPlaying = true;

      // Start analysis data updates
      this.startAnalysisUpdates();

      console.log('Mock audio started');
    } catch (error) {
      console.error('Error starting mock audio:', error);
      throw error;
    }
  }

  /**
   * Stop audio playback (simulated)
   */
  async stopAudio(): Promise<void> {
    if (!this.isPlaying) return;

    try {
      // Stop simulated audio
      this.isPlaying = false;

      // Stop analysis data updates
      this.stopAnalysisUpdates();

      console.log('Mock audio stopped');
    } catch (error) {
      console.error('Error stopping mock audio:', error);
      throw error;
    }
  }

  /**
   * Start periodic updates of analysis data
   */
  private startAnalysisUpdates(): void {
    // Clear any existing interval
    this.stopAnalysisUpdates();

    // Update analysis data every 100ms
    this.analysisUpdateInterval = window.setInterval(() => {
      this.updateAnalysisData();
    }, 100);
  }

  /**
   * Stop periodic updates of analysis data
   */
  private stopAnalysisUpdates(): void {
    if (this.analysisUpdateInterval !== null) {
      clearInterval(this.analysisUpdateInterval);
      this.analysisUpdateInterval = null;
    }
  }

  /**
   * Update analysis data based on current parameter values
   */
  private updateAnalysisData(): void {
    // Get current parameter values
    const frequency1 = this.parameters.get('frequency1')?.value || 440;
    const frequency2 = this.parameters.get('frequency2')?.value || 880;
    const amplitude1 = this.parameters.get('amplitude1')?.value || 0.5;
    const amplitude2 = this.parameters.get('amplitude2')?.value || 0.3;
    const density = this.parameters.get('density')?.value || 0.5;
    const randomness = this.parameters.get('randomness')?.value || 0.3;

    // Normalize frequency to 0-1 range for visualization
    const normalizedFreq1 = (frequency1 - 20) / (2000 - 20);
    const normalizedFreq2 = (frequency2 - 20) / (2000 - 20);

    // Update analysis data with some simulated relationships to parameters
    this.analysisData = {
      // Spectral centroid correlates with frequency
      spectralCentroid: (normalizedFreq1 * 0.6 + normalizedFreq2 * 0.4) * 0.8 + Math.random() * 0.2,

      // Spectral flux correlates with randomness
      spectralFlux: randomness * 0.7 + Math.random() * 0.3,

      // RMS correlates with amplitude
      rms: (amplitude1 * 0.7 + amplitude2 * 0.3) * 0.9 + Math.random() * 0.1,

      // Zero crossing rate correlates with frequency and randomness
      zeroCrossingRate: (normalizedFreq1 * 0.5 + randomness * 0.5) * 0.8 + Math.random() * 0.2,

      // Peak correlates with amplitude
      peak: Math.max(amplitude1, amplitude2) * 0.9 + Math.random() * 0.1,

      // Energy correlates with density and amplitude
      energy: (density * 0.5 + (amplitude1 + amplitude2) * 0.25) * 0.8 + Math.random() * 0.2
    };
  }

  /**
   * Set stochastic distribution for a parameter
   */
  async setStochasticDistribution(
    parameterId: string,
    distribution: StochasticParameter['distribution']
  ): Promise<void> {
    console.log(`Setting stochastic distribution for ${parameterId}:`, distribution);
    // In a real implementation, this would configure the stochastic processes
  }

  /**
   * Set spectral envelope for a parameter
   */
  async setSpectralEnvelope(
    parameterId: string,
    envelope: SpectralParameter['envelope']
  ): Promise<void> {
    console.log(`Setting spectral envelope for ${parameterId}:`, envelope);
    // In a real implementation, this would configure the spectral processing
  }

  /**
   * Set Markov chain for a parameter
   */
  async setMarkovChain(
    parameterId: string,
    states: MarkovParameter['states'],
    transitionMatrix: MarkovParameter['transitionMatrix']
  ): Promise<void> {
    console.log(`Setting Markov chain for ${parameterId}:`, { states, transitionMatrix });
    // In a real implementation, this would configure the Markov processes
  }

  /**
   * Get audio analysis data
   */
  async getAudioAnalysis(): Promise<{
    spectralCentroid: number;
    spectralFlux: number;
    rms: number;
    zeroCrossingRate: number;
    [key: string]: number;
  }> {
    if (!this.isPlaying) {
      return {
        spectralCentroid: 0,
        spectralFlux: 0,
        rms: 0,
        zeroCrossingRate: 0
      };
    }

    // Ensure all required properties are present
    const result = {
      ...this.analysisData,
      // Add defaults in case they're missing
      spectralCentroid: this.analysisData.spectralCentroid || 0,
      spectralFlux: this.analysisData.spectralFlux || 0,
      rms: this.analysisData.rms || 0,
      zeroCrossingRate: this.analysisData.zeroCrossingRate || 0
    };

    return result;
  }
}

export default MockXenakisLDM;
