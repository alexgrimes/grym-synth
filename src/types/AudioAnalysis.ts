export type SpectralMotionType =
  | 'linear'        // Continuous motion in one direction
  | 'parabola'      // Curved motion that changes direction once
  | 'oscillation'   // Reciprocal motion between two poles
  | 'undulation'    // Irregular reciprocal motion
  | 'iteration'     // Regular repetition
  | 'turbulence';   // Erratic motion with irregular breaks

export type SpectralTypology =
  | 'note'          // Harmonic spectrum with fundamental
  | 'node'          // Non-harmonic but coherent sound
  | 'noise';        // Inharmonic, scattered spectrum

export type MorphologicalModel =
  | 'onset'         // Initiation of sound
  | 'continuant'    // Sustained phase
  | 'termination';  // Conclusion of sound

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
  spectralFeatures: {
    centroid: number;    // Spectral centroid (brightness)
    spread: number;      // Spectral spread
    rolloff: number;     // Frequency rolloff
    flatness: number;    // Spectral flatness
  };
}

export interface AudioAnalysisResult {
  spectromorphAnalysis: SpectroMorphAnalysis;
  dominantFrequencies: number[];
  parameters: Record<string, number>;
  waveform: number[];
  duration: number;
  peakAmplitude: number;
  rms: number;
}
