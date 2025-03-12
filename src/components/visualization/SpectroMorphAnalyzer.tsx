/**
 * GrymSynth Spectromorphology Integration
 *
 * This implementation demonstrates how to implement Denis Smalley's spectromorphology
 * concepts within the GrymSynth gravitational parameter interface.
 */

import { EventEmitter } from 'events';

// Core spectromorphological types based on Smalley's framework
export type SpectralMotionType =
  // Graduated continuants
  | 'linear'        // Continuous motion in one direction
  | 'parabola'      // Curved motion that changes direction once
  | 'oscillation'   // Reciprocal motion between two poles
  | 'undulation'    // Irregular reciprocal motion
  // Discontinuous variants
  | 'iteration'     // Regular repetition
  | 'turbulence'    // Erratic motion with irregular breaks

export type SpectralTypology =
  | 'note'          // Harmonic spectrum with fundamental
  | 'node'          // Non-harmonic but coherent sound
  | 'noise'         // Inharmonic, scattered spectrum

export type MorphologicalModel =
  | 'onset'         // Initiation of sound
  | 'continuant'    // Sustained phase
  | 'termination'   // Conclusion of sound

/**
 * Comprehensive analysis result from spectromorphological processing
 */
export interface SpectroMorphAnalysis {
  spectralMotion: {
    type: SpectralMotionType;
    intensity: number;   // 0-1 strength of motion pattern
    rate: number;        // Rate of change
  };
  spectralTypology: {
    type: SpectralTypology;
    position: number;    // Position on continuum (0=note, 1=noise)
    stability: number;   // Stability of spectral content
  };
  morphologicalModel: {
    phase: MorphologicalModel;
    energy: number;      // Energy profile (0-1)
    complexity: number;  // Spectral complexity
  };
  temporalGesture: {
    streaming: number;   // Unidirectional flow quality
    flocking: number;    // Group behavior quality
    turbulence: number;  // Chaotic quality
  };
}

interface FrequencyData {
  frequencies: number[];
  magnitudes: number[][];
  timePoints: number[];
  spectralCentroid: number[];
  spectralFlux: number[];
  spectralSpread: number[];
  spectralFlatness: number[];
  spectralRolloff: number[];
  zeroCrossingRate: number[];
}

/**
 * Core analyzer that processes audio data according to Smalley's framework
 */
export class SpectroMorphAnalyzer extends EventEmitter {
  private fftSize: number;
  private sampleRate: number;
  private lastAnalysis: SpectroMorphAnalysis | null = null;
  private analysisHistory: SpectroMorphAnalysis[] = [];
  private historySize: number = 10;

  constructor(fftSize: number = 2048, sampleRate: number = 44100) {
    super();
    this.fftSize = fftSize;
    this.sampleRate = sampleRate;
  }

  /**
   * Analyze raw audio data and extract spectromorphological features
   */
  public analyzeAudioData(buffer: Float32Array): SpectroMorphAnalysis {
    // Convert time domain to frequency domain
    const spectralData = this.performFFT(buffer);

    // Analyze spectral motion
    const spectralMotion = this.analyzeSpectralMotion(spectralData);

    // Determine spectral typology (note→node→noise)
    const spectralTypology = this.analyzeSpectralTypology(spectralData);

    // Analyze morphological model (onset/continuant/termination)
    const morphologicalModel = this.analyzeMorphologicalModel(buffer, spectralData);

    // Analyze temporal gesture characteristics
    const temporalGesture = this.analyzeTemporalGesture(spectralData);

    const analysis: SpectroMorphAnalysis = {
      spectralMotion,
      spectralTypology,
      morphologicalModel,
      temporalGesture
    };

    // Store analysis in history
    this.lastAnalysis = analysis;
    this.analysisHistory.push(analysis);
    if (this.analysisHistory.length > this.historySize) {
      this.analysisHistory.shift();
    }

    // Emit analysis event
    this.emit('analysisComplete', analysis);

    return analysis;
  }

  /**
   * Maps spectromorphological analysis to gravitational parameter system
   */
  public mapToParameters(analysis: SpectroMorphAnalysis): VoronoiParameterMapping {
    // Create parameter mapping based on analysis
    const mapping: VoronoiParameterMapping = {
      // Shape is influenced by spectral typology
      shape: {
        complexity: this.mapComplexity(analysis.spectralTypology),
        regularity: this.mapRegularity(analysis.spectralMotion),
        size: this.mapSize(analysis.morphologicalModel)
      },

      // Motion is derived from spectral motion characteristics
      motion: {
        type: this.mapMotionType(analysis.spectralMotion.type),
        rate: analysis.spectralMotion.rate,
        intensity: analysis.spectralMotion.intensity
      },

      // Field characteristics map to morphological model
      field: {
        strength: analysis.morphologicalModel.energy,
        radius: this.mapRadius(analysis.spectralTypology),
        attraction: this.mapAttraction(analysis.temporalGesture)
      },

      // Color mappings for visual representation
      color: this.generateColorMapping(analysis)
    };

    return mapping;
  }

  /**
   * Performs FFT on time-domain buffer
   */
  private performFFT(buffer: Float32Array): FrequencyData {
    // In a real implementation, this would use the Web Audio API's AnalyserNode
    // or a dedicated FFT library. For this example, we'll simulate the output.

    // Create simulated frequency data
    const frequencies: number[] = [];
    const magnitudes: number[][] = [];
    const timePoints: number[] = [];
    const spectralCentroid: number[] = [];
    const spectralFlux: number[] = [];
    const spectralSpread: number[] = [];
    const spectralFlatness: number[] = [];
    const spectralRolloff: number[] = [];
    const zeroCrossingRate: number[] = [];

    // Calculate frequency bins
    for (let i = 0; i < this.fftSize / 2; i++) {
      frequencies.push(i * this.sampleRate / this.fftSize);
    }

    // Simulate time points and magnitudes
    const frameCount = Math.floor(buffer.length / this.fftSize);
    for (let frame = 0; frame < frameCount; frame++) {
      timePoints.push(frame * this.fftSize / this.sampleRate);

      // Simulate magnitudes for this frame
      const frameMagnitudes: number[] = [];
      for (let i = 0; i < frequencies.length; i++) {
        // Create a simulated magnitude based on buffer values
        // In a real implementation, this would be the result of an FFT
        const startIdx = frame * this.fftSize;
        let sum = 0;
        for (let j = 0; j < this.fftSize && startIdx + j < buffer.length; j++) {
          sum += Math.abs(buffer[startIdx + j]);
        }
        const avgMagnitude = sum / this.fftSize;

        // Add some frequency-dependent shaping
        const freqFactor = 1.0 - (i / frequencies.length);
        frameMagnitudes.push(avgMagnitude * freqFactor);
      }
      magnitudes.push(frameMagnitudes);

      // Calculate spectral features for this frame
      spectralCentroid.push(this.calculateSpectralCentroid(frequencies, frameMagnitudes));
      spectralFlux.push(frame > 0 ? this.calculateSpectralFlux(magnitudes[frame - 1], frameMagnitudes) : 0);
      spectralSpread.push(this.calculateSpectralSpread(frequencies, frameMagnitudes, spectralCentroid[frame]));
      spectralFlatness.push(this.calculateSpectralFlatness(frameMagnitudes));
      spectralRolloff.push(this.calculateSpectralRolloff(frequencies, frameMagnitudes));

      // Calculate zero crossing rate
      const frameStart = frame * this.fftSize;
      let crossings = 0;
      for (let i = 1; i < this.fftSize && frameStart + i < buffer.length; i++) {
        if ((buffer[frameStart + i - 1] >= 0 && buffer[frameStart + i] < 0) ||
            (buffer[frameStart + i - 1] < 0 && buffer[frameStart + i] >= 0)) {
          crossings++;
        }
      }
      zeroCrossingRate.push(crossings / this.fftSize);
    }

    return {
      frequencies,
      magnitudes,
      timePoints,
      spectralCentroid,
      spectralFlux,
      spectralSpread,
      spectralFlatness,
      spectralRolloff,
      zeroCrossingRate
    };
  }

  /**
   * Calculate spectral centroid (brightness)
   */
  private calculateSpectralCentroid(frequencies: number[], magnitudes: number[]): number {
    let sumProduct = 0;
    let sumMagnitudes = 0;

    for (let i = 0; i < frequencies.length; i++) {
      sumProduct += frequencies[i] * magnitudes[i];
      sumMagnitudes += magnitudes[i];
    }

    return sumMagnitudes > 0 ? sumProduct / sumMagnitudes : 0;
  }

  /**
   * Calculate spectral flux (rate of change)
   */
  private calculateSpectralFlux(prevMagnitudes: number[], currMagnitudes: number[]): number {
    let sum = 0;

    for (let i = 0; i < currMagnitudes.length; i++) {
      const diff = currMagnitudes[i] - (i < prevMagnitudes.length ? prevMagnitudes[i] : 0);
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Calculate spectral spread (bandwidth)
   */
  private calculateSpectralSpread(frequencies: number[], magnitudes: number[], centroid: number): number {
    let sumProduct = 0;
    let sumMagnitudes = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const deviation = frequencies[i] - centroid;
      sumProduct += deviation * deviation * magnitudes[i];
      sumMagnitudes += magnitudes[i];
    }

    return sumMagnitudes > 0 ? Math.sqrt(sumProduct / sumMagnitudes) : 0;
  }

  /**
   * Calculate spectral flatness (noisiness)
   */
  private calculateSpectralFlatness(magnitudes: number[]): number {
    let geometricMean = 0;
    let arithmeticMean = 0;
    let nonZeroCount = 0;

    // Calculate geometric mean (product of all values raised to power of 1/n)
    let product = 1;
    for (let i = 0; i < magnitudes.length; i++) {
      if (magnitudes[i] > 0) {
        product *= magnitudes[i];
        arithmeticMean += magnitudes[i];
        nonZeroCount++;
      }
    }

    if (nonZeroCount === 0) return 0;

    geometricMean = Math.pow(product, 1 / nonZeroCount);
    arithmeticMean /= nonZeroCount;

    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  /**
   * Calculate spectral rolloff (frequency below which 85% of energy is contained)
   */
  private calculateSpectralRolloff(frequencies: number[], magnitudes: number[]): number {
    const totalEnergy = magnitudes.reduce((sum, val) => sum + val, 0);
    const rolloffThreshold = totalEnergy * 0.85;

    let cumulativeEnergy = 0;
    for (let i = 0; i < frequencies.length; i++) {
      cumulativeEnergy += magnitudes[i];
      if (cumulativeEnergy >= rolloffThreshold) {
        return frequencies[i];
      }
    }

    return frequencies[frequencies.length - 1];
  }

  /**
   * Analyzes spectral motion from frequency data
   */
  private analyzeSpectralMotion(spectralData: FrequencyData): SpectroMorphAnalysis['spectralMotion'] {
    // Analyze centroid movement over time
    const centroidMovement = this.analyzeFeatureMovement(spectralData.spectralCentroid);

    // Analyze flux to determine intensity of motion
    const fluxAvg = spectralData.spectralFlux.reduce((sum, val) => sum + val, 0) /
                   Math.max(1, spectralData.spectralFlux.length);

    // Normalize intensity to 0-1 range
    const intensity = Math.min(1, fluxAvg * 10);

    // Determine motion type based on centroid movement pattern
    let motionType: SpectralMotionType;

    if (centroidMovement.periodicity > 0.7) {
      // Regular oscillation
      motionType = 'oscillation';
    } else if (centroidMovement.periodicity > 0.4) {
      // Irregular oscillation
      motionType = 'undulation';
    } else if (centroidMovement.directionChanges < 2) {
      if (centroidMovement.curvature > 0.5) {
        // Curved motion
        motionType = 'parabola';
      } else {
        // Straight motion
        motionType = 'linear';
      }
    } else if (centroidMovement.regularity > 0.6) {
      // Regular repetition
      motionType = 'iteration';
    } else {
      // Erratic motion
      motionType = 'turbulence';
    }

    return {
      type: motionType,
      intensity,
      rate: centroidMovement.rate
    };
  }

  /**
   * Analyze movement patterns in a feature over time
   */
  private analyzeFeatureMovement(featureValues: number[]): {
    directionChanges: number;
    curvature: number;
    periodicity: number;
    regularity: number;
    rate: number;
  } {
    if (featureValues.length < 3) {
      return {
        directionChanges: 0,
        curvature: 0,
        periodicity: 0,
        regularity: 0,
        rate: 0.5
      };
    }

    // Count direction changes
    let directionChanges = 0;
    let prevDirection = featureValues[1] > featureValues[0] ? 1 : -1;

    for (let i = 2; i < featureValues.length; i++) {
      const direction = featureValues[i] > featureValues[i - 1] ? 1 : -1;
      if (direction !== prevDirection) {
        directionChanges++;
        prevDirection = direction;
      }
    }

    // Calculate normalized direction changes (0-1)
    const normalizedChanges = Math.min(1, directionChanges / (featureValues.length / 2));

    // Estimate curvature
    let curvatureSum = 0;
    for (let i = 1; i < featureValues.length - 1; i++) {
      const prev = featureValues[i - 1];
      const curr = featureValues[i];
      const next = featureValues[i + 1];

      // Simple second derivative approximation
      const secondDerivative = (next - curr) - (curr - prev);
      curvatureSum += Math.abs(secondDerivative);
    }
    const curvature = Math.min(1, curvatureSum / featureValues.length);

    // Estimate periodicity using autocorrelation
    const maxLag = Math.floor(featureValues.length / 2);
    let bestCorrelation = 0;
    let bestLag = 0;

    for (let lag = 1; lag < maxLag; lag++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < featureValues.length - lag; i++) {
        correlation += featureValues[i] * featureValues[i + lag];
        count++;
      }

      correlation = count > 0 ? correlation / count : 0;

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    // Normalize periodicity (0-1)
    const periodicity = bestCorrelation;

    // Calculate regularity based on variance of intervals between direction changes
    const intervals: number[] = [];
    let lastChangeIndex = 0;
    prevDirection = featureValues[1] > featureValues[0] ? 1 : -1;

    for (let i = 2; i < featureValues.length; i++) {
      const direction = featureValues[i] > featureValues[i - 1] ? 1 : -1;
      if (direction !== prevDirection) {
        intervals.push(i - lastChangeIndex);
        lastChangeIndex = i;
        prevDirection = direction;
      }
    }

    let regularity = 1.0;
    if (intervals.length > 1) {
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      let variance = 0;

      for (const interval of intervals) {
        variance += Math.pow(interval - avgInterval, 2);
      }

      variance /= intervals.length;

      // Convert variance to regularity (inverse relationship)
      regularity = 1.0 / (1.0 + variance / avgInterval);
    }

    // Calculate rate based on average interval
    const rate = intervals.length > 0 ?
      Math.min(1, 1.0 / (intervals.reduce((sum, val) => sum + val, 0) / intervals.length / 10)) :
      0.5;

    return {
      directionChanges: normalizedChanges,
      curvature,
      periodicity,
      regularity,
      rate
    };
  }

  /**
   * Analyzes spectral typology (note → node → noise continuum)
   */
  private analyzeSpectralTypology(spectralData: FrequencyData): SpectroMorphAnalysis['spectralTypology'] {
    // Calculate average flatness (indicator of noise vs. tone)
    const avgFlatness = spectralData.spectralFlatness.reduce((sum, val) => sum + val, 0) /
                       Math.max(1, spectralData.spectralFlatness.length);

    // Calculate average spread (indicator of bandwidth)
    const avgSpread = spectralData.spectralSpread.reduce((sum, val) => sum + val, 0) /
                     Math.max(1, spectralData.spectralSpread.length);

    // Calculate stability of spectral content
    const centroidStability = this.calculateStability(spectralData.spectralCentroid);
    const spreadStability = this.calculateStability(spectralData.spectralSpread);
    const stability = (centroidStability + spreadStability) / 2;

    // Position on note-node-noise continuum (0-1)
    // Combine flatness and spread to determine position
    const position = Math.min(1, (avgFlatness * 0.7) + (avgSpread * 0.3));

    // Determine typology based on position
    let type: SpectralTypology;
    if (position < 0.33) {
      type = 'note';
    } else if (position < 0.66) {
      type = 'node';
    } else {
      type = 'noise';
    }

    return {
      type,
      position,
      stability
    };
  }

  /**
   * Calculate stability of a feature over time
   */
  private calculateStability(featureValues: number[]): number {
    if (featureValues.length < 2) return 1.0;

    // Calculate variance
    const mean = featureValues.reduce((sum, val) => sum + val, 0) / featureValues.length;
    const variance = featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / featureValues.length;

    // Convert variance to stability (inverse relationship)
    // Normalize to 0-1 range
    return 1.0 / (1.0 + variance * 10);
  }

  /**
   * Analyzes morphological model (onset/continuant/termination)
   */
  private analyzeMorphologicalModel(buffer: Float32Array, spectralData: FrequencyData): SpectroMorphAnalysis['morphologicalModel'] {
    // Calculate amplitude envelope
    const frameSize = 512;
    const envelopeValues: number[] = [];

    for (let i = 0; i < buffer.length; i += frameSize) {
      let sum = 0;
      for (let j = 0; j < frameSize && i + j < buffer.length; j++) {
        sum += Math.abs(buffer[i + j]);
      }
      envelopeValues.push(sum / frameSize);
    }

    // Analyze envelope shape
    const envelopeShape = this.analyzeEnvelopeShape(envelopeValues);

    // Calculate spectral complexity
    const complexity = this.calculateSpectralComplexity(spectralData);

    return {
      phase: envelopeShape.phase,
      energy: envelopeShape.energy,
      complexity
    };
  }

  /**
   * Analyze amplitude envelope shape
   */
  private analyzeEnvelopeShape(envelope: number[]): {
    phase: MorphologicalModel;
    energy: number;
  } {
    if (envelope.length < 3) {
      return { phase: 'continuant', energy: 0.5 };
    }

    // Find peak amplitude and its position
    let peakValue = 0;
    let peakPosition = 0;

    for (let i = 0; i < envelope.length; i++) {
      if (envelope[i] > peakValue) {
        peakValue = envelope[i];
        peakPosition = i;
      }
    }

    // Normalize position to 0-1 range
    const normalizedPosition = peakPosition / envelope.length;

    // Determine phase based on peak position
    let phase: MorphologicalModel;

    if (normalizedPosition < 0.25) {
      // Peak near beginning
      phase = 'onset';
    } else if (normalizedPosition > 0.75) {
      // Peak near end
      phase = 'termination';
    } else {
      // Peak in middle
      phase = 'continuant';
    }

    // Calculate average energy
    const avgEnergy = envelope.reduce((sum, val) => sum + val, 0) / envelope.length;

    // Normalize energy to 0-1 range
    const energy = Math.min(1, avgEnergy * 5);

    return {
      phase,
      energy
    };
  }

  /**
   * Calculate spectral complexity
   */
  private calculateSpectralComplexity(spectralData: FrequencyData): number {
    // Combine multiple spectral features to estimate complexity

    // Average spectral spread (bandwidth)
    const avgSpread = spectralData.spectralSpread.reduce((sum, val) => sum + val, 0) /
                     Math.max(1, spectralData.spectralSpread.length);

    // Average spectral flux (change over time)
    const avgFlux = spectralData.spectralFlux.reduce((sum, val) => sum + val, 0) /
                   Math.max(1, spectralData.spectralFlux.length);

    // Average zero crossing rate (high frequency content)
    const avgZCR = spectralData.zeroCrossingRate.reduce((sum, val) => sum + val, 0) /
                  Math.max(1, spectralData.zeroCrossingRate.length);

    // Combine features with weights
    const complexity = (avgSpread * 0.4) + (avgFlux * 0.4) + (avgZCR * 0.2);

    // Normalize to 0-1 range
    return Math.min(1, complexity * 5);
  }

  /**
   * Analyzes temporal gesture characteristics
   */
  private analyzeTemporalGesture(spectralData: FrequencyData): SpectroMorphAnalysis['temporalGesture'] {
    // Analyze centroid movement for streaming quality
    const centroidMovement = this.analyzeFeatureMovement(spectralData.spectralCentroid);

    // Streaming: unidirectional flow quality
    // High when motion is linear with few direction changes
    const streaming = Math.max(0, 1 - centroidMovement.directionChanges) *
                     (1 - centroidMovement.periodicity);

    // Flocking: group behavior quality
    // High when there's coordinated movement with some periodicity
    const flocking = centroidMovement.regularity * centroidMovement.periodicity;

    // Turbulence: chaotic quality
    // High when there's irregular, unpredictable movement
    const turbulence = (1 - centroidMovement.regularity) * centroidMovement.directionChanges;

    return {
      streaming: Math.min(1, streaming),
      flocking: Math.min(1, flocking),
      turbulence: Math.min(1, turbulence)
    };
  }

  /**
   * Maps complexity from analysis to parameter system
   */
  private mapComplexity(typology: SpectroMorphAnalysis['spectralTypology']): number {
    // Map spectral position to shape complexity
    return Math.min(1, 0.2 + typology.position * 0.8);
  }

  /**
   * Maps regularity from motion analysis
   */
  private mapRegularity(motion: SpectroMorphAnalysis['spectralMotion']): number {
    // Different motion types have different regularity values
    const motionRegularityMap: Record<SpectralMotionType, number> = {
      'linear': 0.9,
      'parabola': 0.7,
      'oscillation': 0.8,
      'undulation': 0.5,
      'iteration': 0.6,
      'turbulence': 0.2
    };

    return motionRegularityMap[motion.type] * (1 - motion.intensity * 0.3);
  }

  /**
   * Maps size based on morphological model
   */
  private mapSize(model: SpectroMorphAnalysis['morphologicalModel']): number {
    // Map energy and phase to size parameter
    const phaseMultiplier = model.phase === 'onset' ? 0.7 :
                           model.phase === 'continuant' ? 1.0 : 0.5;

    return model.energy * phaseMultiplier;
  }

  /**
   * Maps motion type to parameter system
   */
  private mapMotionType(motionType: SpectralMotionType): ParameterMotionType {
    // Convert Smalley's motion types to parameter motion types
    const motionMap: Record<SpectralMotionType, ParameterMotionType> = {
      'linear': 'directional',
      'parabola': 'curved',
      'oscillation': 'pendular',
      'undulation': 'waveform',
      'iteration': 'pulsed',
      'turbulence': 'chaotic'
    };

    return motionMap[motionType];
  }

  /**
   * Maps radius based on spectral typology
   */
  private mapRadius(typology: SpectroMorphAnalysis['spectralTypology']): number {
    // Map spectral position and stability to field radius
    return 0.3 + (typology.position * 0.4) + (typology.stability * 0.3);
  }

  /**
   * Maps attraction parameters from temporal gesture
   */
  private mapAttraction(gesture: SpectroMorphAnalysis['temporalGesture']): number {
    // Calculate attraction based on streaming and flocking behaviors
    return (gesture.streaming * 0.3) + (gesture.flocking * 0.7);
  }

  /**
   * Generates color mapping from analysis
   */
  private generateColorMapping(analysis: SpectroMorphAnalysis): ColorMapping {
    // Generate colors based on spectral typology
    let primary: string;
    let secondary: string;

    // Color based on spectral typology
    switch (analysis.spectralTypology.type) {
      case 'note':
        // Harmonic sounds get cooler colors
        primary = `hsl(${220 + Math.round(analysis.spectralTypology.position * 40)}, 80%, 50%)`;
        secondary = `hsl(${240 + Math.round(analysis.spectralTypology.position * 40)}, 70%, 60%)`;
        break;
      case 'node':
        // Node sounds get neutral colors
        primary = `hsl(${180 + Math.round(analysis.spectralTypology.position * 60)}, 70%, 50%)`;
        secondary = `hsl(${200 + Math.round(analysis.spectralTypology.position * 60)}, 60%, 60%)`;
        break;
      case 'noise':
        // Noise sounds get warmer colors
        primary = `hsl(${0 + Math.round(analysis.spectralTypology.position * 60)}, 80%, 50%)`;
        secondary = `hsl(${20 + Math.round(analysis.spectralTypology.position * 60)}, 70%, 60%)`;
        break;
    }

    return {
      primary,
      secondary,
      intensity: analysis.morphologicalModel.energy
    };
  }

  /**
   * Get the most recent analysis
   */
  public getLastAnalysis(): SpectroMorphAnalysis | null {
    return this.lastAnalysis;
  }

  /**
   * Get analysis history
   */
  public getAnalysisHistory(): SpectroMorphAnalysis[] {
    return [...this.analysisHistory];
  }
}

/**
 * Interface for Voronoi-based parameter visualization
 */
export interface VoronoiParameterMapping {
  shape: {
    complexity: number;  // 0-1 complexity of voronoi cell
    regularity: number;  // 0-1 regularity of shape
    size: number;        // 0-1 relative size
  };
  motion: {
    type: ParameterMotionType;
    rate: number;        // 0-1 speed of motion
    intensity: number;   // 0-1 intensity of motion
  };
  field: {
    strength: number;    // 0-1 gravitational field strength
    radius: number;      // 0-1 relative field radius
    attraction: number;  // 0-1 attraction vs repulsion
  };
  color: ColorMapping;
}

/**
 * Types for parameter motion within the system
 */
export type ParameterMotionType =
  | 'directional'  // Steady movement in one direction
  | 'curved'       // Movement with directional change
  | 'pendular'     // Regular back-and-forth
  | 'waveform'     // Sinusoidal or complex waveform motion
  | 'pulsed'       // Regular pulses of motion
  | 'chaotic'      // Unpredictable motion patterns

export interface ColorMapping {
  primary: string;     // Primary color (hex or hsl)
  secondary: string;   // Secondary color (hex or hsl)
  intensity: number;   // 0-1 color intensity
}
