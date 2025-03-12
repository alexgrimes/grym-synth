import { SpectralRegion } from '../../visualization/types';

/**
 * Stochastic distribution types based on Xenakis' formalized music principles
 */
export type DistributionType = 'poisson' | 'cauchy' | 'logistic' | 'exponential';

export interface ElasticBarrier {
  min: number;
  max: number;
  stiffness: number; // Controls how strongly values are pushed back from extremes
}

export interface Vector3D {
  x: number; // Frequency domain
  y: number; // Amplitude domain
  z: number; // Time domain
}

export interface StochasticParameter {
  id: string;
  name: string;
  distribution: DistributionType;
  lambda: number;          // Mean rate for Poisson distribution
  barriers: ElasticBarrier;
  currentState: Vector3D;
  metadata?: {
    description?: string;
    xenakisReference?: string; // Reference to specific concept in Formalized Music
  };
}

export interface SpectralParameter {
  id: string;
  name: string;
  frequencies: number[];    // Frequency components
  amplitudes: number[];     // Amplitude values
  phases: number[];         // Phase relationships
  envelope: {
    attractions: Array<{
      position: Vector3D;
      strength: number;
      radius: number;
    }>;
    repulsions: Array<{
      position: Vector3D;
      strength: number;
      radius: number;
    }>;
  };
  regions?: SpectralRegion[]; // Link to visualization system
}

export interface MarkovState {
  id: string;
  parameters: Record<string, number>;
  metadata?: {
    description: string;
    perceptualQuality?: string;
  };
}

export interface MarkovParameter {
  id: string;
  name: string;
  states: MarkovState[];
  transitionMatrix: number[][]; // Probability matrix for state transitions
  currentStateId: string;
  historyLength: number;    // Length of state history to maintain
  stateHistory: string[];   // Array of state IDs
}

export interface GameTheoryParameter {
  id: string;
  name: string;
  payoffMatrix: number[][];
  players: Array<{
    id: string;
    name: string;
    strategy: number[];     // Current probability distribution over actions
    constraints?: {
      min: number;
      max: number;
    }[];
  }>;
  currentOutcome: {
    values: number[];
    equilibrium: boolean;
  };
}

export interface ParameterPreset {
  id: string;
  name: string;
  description?: string;
  category: string;
  perceptualQualities: string[];
  parameters: {
    stochastic: StochasticParameter[];
    spectral: SpectralParameter[];
    markov: MarkovParameter[];
    gameTheory: GameTheoryParameter[];
  };
  metadata: {
    author: string;
    createdAt: string;
    modifiedAt: string;
    tags: string[];
    xenakisReferences?: string[];
  };
}

export interface ParameterTransition {
  fromPreset: string;
  toPreset: string;
  duration: number;
  interpolationType: 'linear' | 'exponential' | 'stochastic';
  constraints?: {
    parameterPath: string;
    min: number;
    max: number;
  }[];
}

// Parameter space exploration types
export interface ParameterSpace {
  dimensions: Array<{
    id: string;
    name: string;
    min: number;
    max: number;
    step: number;
    scale: 'linear' | 'logarithmic' | 'exponential';
  }>;
  constraints: Array<{
    expression: string; // Mathematical expression defining the constraint
    description: string;
  }>;
  explorationHistory: Array<{
    position: number[];
    timestamp: string;
    quality: number;
    userFeedback?: string;
  }>;
}
