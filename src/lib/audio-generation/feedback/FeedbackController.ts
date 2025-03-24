import { EventEmitter } from 'events';
import { XenakisLDMParams } from '../xenakisldm-client';
import { MathematicalStructure } from '../types';
import { AudioAnalysisResult } from '../../../types/AudioAnalysis';

/**
 * Response from feedback evaluation
 */
export interface FeedbackResult {
  adjustments: Record<string, number> | null;
  status: 'continuing' | 'terminated' | 'converged' | 'oscillating';
  reason: string;
  referToLLM: boolean;
  metrics?: {
    convergenceScore: number;
    oscillationDetected: boolean;
    iterationCount: number;
    deviationMagnitude: number;
  };
}

/**
 * Parameter adjustment instruction
 */
export interface ParameterAdjustment {
  parameter: string;
  value: number;
  confidence: number;
}

/**
 * Deviation between expected and actual values
 */
export interface Deviation {
  parameter: string;
  expected: number;
  actual: number;
  magnitude: number;
}

/**
 * LLM decision about feedback continuation
 */
export interface LLMFeedbackDecision {
  action: 'continue' | 'terminate' | 'adjust';
  reasoning: string;
  adjustedParams?: XenakisLDMParams;
  suggestedIterations?: number;
  feedbackSensitivity?: number;
}

/**
 * Feedback state tracking
 */
export interface FeedbackState {
  iterations: number;
  deviationHistory: number[][];
  parameterHistory: XenakisLDMParams[];
  llmInterventions: Array<{
    iteration: number;
    decision: LLMFeedbackDecision;
    timestamp: number;
  }>;
  currentStatus: string;
  structureHistory?: MathematicalStructure[];
  analysisHistory?: AudioAnalysisResult[];
}

/**
 * Configuration for the FeedbackController
 */
export interface FeedbackControllerConfig {
  maxIterations?: number;
  convergenceThreshold?: number;
  oscillationThreshold?: number;
  learningRate?: number;
  minParameterStep?: number;
  maxParameterStep?: number;
  minDeviationForAction?: number;
  referToLLMThreshold?: number;
}

/**
 * Controls the feedback loop between mathematical structures and audio results
 * 
 * The FeedbackController is responsible for:
 * 1. Analyzing deviations between expected and actual audio outputs
 * 2. Determining appropriate parameter adjustments
 * 3. Detecting feedback loop issues (oscillation, divergence)
 * 4. Managing termination conditions
 * 5. Deciding when to delegate decisions to the reasoning LLM
 */
export class FeedbackController extends EventEmitter {
  private maxIterations: number;
  private convergenceThreshold: number;
  private oscillationThreshold: number;
  private learningRate: number;
  private minParameterStep: number;
  private maxParameterStep: number;
  private minDeviationForAction: number;
  private referToLLMThreshold: number;
  
  private currentIteration: number = 0;
  private previousDeviations: number[] = [];
  private deviationHistory: number[][] = [];
  private parameterHistory: XenakisLDMParams[] = [];
  private oscillationCounter: number = 0;
  private lastAdjustments: Record<string, number> = {};
  
  constructor(config: FeedbackControllerConfig = {}) {
    super();
    
    // Initialize configuration with defaults
    this.maxIterations = config.maxIterations || 3;
    this.convergenceThreshold = config.convergenceThreshold || 0.05;
    this.oscillationThreshold = config.oscillationThreshold || 0.8;
    this.learningRate = config.learningRate || 0.5;
    this.minParameterStep = config.minParameterStep || 0.02;
    this.maxParameterStep = config.maxParameterStep || 0.25;
    this.minDeviationForAction = config.minDeviationForAction || 0.1;
    this.referToLLMThreshold = config.referToLLMThreshold || 0.7;
  }
  
  /**
   * Process feedback and determine next steps
   * 
   * @param deviations Array of deviation magnitudes
   * @param structure Current mathematical structure
   * @param params Current parameters
   * @param analysis Current audio analysis
   */
  processFeedback(
    deviations: number[],
    structure: MathematicalStructure,
    params: XenakisLDMParams,
    analysis: AudioAnalysisResult
  ): FeedbackResult {
    this.currentIteration++;
    this.deviationHistory.push([...deviations]);
    this.parameterHistory.push({...params});
    
    // Calculate aggregate deviation
    const averageDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations);
    
    // Store metrics for result
    const metrics = {
      convergenceScore: this.calculateConvergenceScore(deviations),
      oscillationDetected: this.isOscillating(deviations),
      iterationCount: this.currentIteration,
      deviationMagnitude: averageDeviation
    };
    
    // Break condition 1: Maximum iterations reached
    if (this.currentIteration >= this.maxIterations) {
      return {
        adjustments: null,
        status: 'terminated',
        reason: 'max_iterations_reached',
        referToLLM: true,
        metrics
      };
    }
    
    // Break condition 2: Convergence detected
    if (this.hasConverged(deviations)) {
      return {
        adjustments: null,
        status: 'converged',
        reason: 'below_threshold',
        referToLLM: false,
        metrics
      };
    }
    
    // Break condition 3: Oscillation detected
    if (metrics.oscillationDetected) {
      // When oscillation is detected, we apply dampened adjustments
      // and refer to LLM for a strategic decision
      return {
        adjustments: this.calculateDampenedAdjustments(deviations, structure, params, analysis),
        status: 'oscillating',
        reason: 'parameter_oscillation',
        referToLLM: true,
        metrics
      };
    }
    
    // Check if deviations are significant enough to warrant action
    if (maxDeviation < this.minDeviationForAction) {
      return {
        adjustments: null,
        status: 'converged',
        reason: 'deviations_negligible',
        referToLLM: false,
        metrics
      };
    }
    
    // Store current deviations for next iteration
    this.previousDeviations = deviations;
    
    // Decide if we should refer to LLM based on deviation magnitude and iteration count
    const complexityFactor = structure.structures ? Object.keys(structure.structures).length : 1;
    const shouldReferToLLM = (
      maxDeviation > this.referToLLMThreshold ||
      (this.currentIteration > 1 && complexityFactor > 2) ||
      averageDeviation > this.referToLLMThreshold * 0.8
    );
    
    // Continue feedback loop with calculated adjustments
    return {
      adjustments: this.calculateAdjustments(deviations, structure, params, analysis),
      status: 'continuing',
      reason: 'adjustments_needed',
      referToLLM: shouldReferToLLM,
      metrics
    };
  }
  
  /**
   * Check if the feedback loop has converged
   */
  private hasConverged(deviations: number[]): boolean {
    const averageDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
    return averageDeviation < this.convergenceThreshold;
  }
  
  /**
   * Calculate convergence score (0-1, higher is better)
   */
  private calculateConvergenceScore(deviations: number[]): number {
    const averageDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
    // Scale so that 0 deviation = 1.0 score, and deviation >= 0.5 = 0.0 score
    return Math.max(0, 1 - (averageDeviation / 0.5));
  }
  
  /**
   * Detect oscillation in parameter adjustments
   */
  private isOscillating(deviations: number[]): boolean {
    // Need at least 3 iterations to detect oscillation
    if (this.deviationHistory.length < 3) return false;
    
    // Check for sign changes in parameter adjustments
    let oscillationCount = 0;
    let totalChecks = 0;
    
    // Compare directions of change for the last 3 iterations
    const lastAdjustments = Object.keys(this.lastAdjustments);
    for (const param of lastAdjustments) {
      if (this.parameterHistory.length < 3) continue;
      
      const current = this.parameterHistory[this.parameterHistory.length - 1][param as keyof XenakisLDMParams];
      const previous = this.parameterHistory[this.parameterHistory.length - 2][param as keyof XenakisLDMParams];
      const beforePrevious = this.parameterHistory[this.parameterHistory.length - 3][param as keyof XenakisLDMParams];
      
      if (typeof current !== 'number' || typeof previous !== 'number' || typeof beforePrevious !== 'number') {
        continue;
      }
      
      const currentDirection = Math.sign(current - previous);
      const previousDirection = Math.sign(previous - beforePrevious);
      
      totalChecks++;
      
      // If directions are opposite, count as oscillation
      if (currentDirection !== 0 && previousDirection !== 0 && currentDirection !== previousDirection) {
        oscillationCount++;
      }
    }
    
    // Calculate oscillation ratio
    const oscillationRatio = totalChecks > 0 ? oscillationCount / totalChecks : 0;
    
    // Detect oscillation if ratio exceeds threshold
    if (oscillationRatio > this.oscillationThreshold) {
      this.oscillationCounter++;
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate parameter adjustments based on deviations
   */
  private calculateAdjustments(
    deviations: number[],
    structure: MathematicalStructure,
    params: XenakisLDMParams,
    analysis: AudioAnalysisResult
  ): Record<string, number> {
    const adjustments: Record<string, number> = {};
    
    // Apply specific parameter adjustments based on the structure type and deviations
    if (structure.type === 'stochastic' && params.stochastic) {
      // Adjust stochastic parameters based on spectral analysis
      const spectralSpreadDev = this.calculateSpecificDeviation(
        analysis.spectromorphAnalysis.spectralFeatures.spread,
        2000 * params.stochastic.density!
      );
      
      // Adjust density parameter
      adjustments['stochastic.density'] = this.clampParameterStep(
        spectralSpreadDev * this.learningRate
      );
      
      // Adjust randomness parameter based on spectral flatness
      const flatnessDev = this.calculateSpecificDeviation(
        analysis.spectromorphAnalysis.spectralFeatures.flatness,
        params.stochastic.randomness! 
      );
      
      adjustments['stochastic.randomness'] = this.clampParameterStep(
        flatnessDev * this.learningRate
      );
    }
    
    if (structure.type === 'sieve' && params.sieve) {
      // Adjust sieve parameters based on dominant frequencies
      const dominantFreqCount = analysis.dominantFrequencies.length;
      const expectedModuliCount = params.sieve.moduli?.length || 3;
      const moduliCountDev = this.calculateSpecificDeviation(dominantFreqCount, expectedModuliCount);
      
      // Suggest moduli count adjustment (this will be handled by the mapper)
      adjustments['sieve.moduliCount'] = Math.sign(moduliCountDev) * this.minParameterStep;
    }
    
    if (structure.type === 'gameTheory' && params.gameTheory) {
      // Adjust game theory parameters based on temporal gesture
      const streaming = analysis.spectromorphAnalysis.temporalGesture.streaming;
      const flocking = analysis.spectromorphAnalysis.temporalGesture.flocking;
      
      // Adjust equilibrium weight based on streaming quality
      const equilibriumDev = this.calculateSpecificDeviation(
        streaming,
        params.gameTheory.equilibriumWeight!
      );
      
      adjustments['gameTheory.equilibriumWeight'] = this.clampParameterStep(
        equilibriumDev * this.learningRate
      );
      
      // Adjust randomization based on flocking quality
      const randomizationDev = this.calculateSpecificDeviation(
        1 - flocking, // Invert flocking - high flocking = low randomization
        params.gameTheory.randomization!
      );
      
      adjustments['gameTheory.randomization'] = this.clampParameterStep(
        randomizationDev * this.learningRate
      );
    }
    
    // Add adjustments for granular parameters if applicable
    if (params.granular) {
      const grainDensityDev = this.calculateSpecificDeviation(
        analysis.spectromorphAnalysis.temporalGesture.flocking,
        params.granular.density!
      );
      
      adjustments['granular.density'] = this.clampParameterStep(
        grainDensityDev * this.learningRate
      );
      
      // Adjust grain size based on spectral width
      const grainSizeDev = this.calculateSpecificDeviation(
        analysis.spectromorphAnalysis.spectralFeatures.spread / 5000, // Normalize
        params.granular.grainSize! / 100 // Normalize to 0-1 range
      );
      
      // Scale adjustment to grain size range
      adjustments['granular.grainSize'] = this.clampParameterStep(
        grainSizeDev * this.learningRate
      ) * 100; // Scale back to ms
    }
    
    // Store adjustments for oscillation detection
    this.lastAdjustments = {...adjustments};
    
    return adjustments;
  }
  
  /**
   * Calculate dampened adjustments when oscillation is detected
   */
  private calculateDampenedAdjustments(
    deviations: number[],
    structure: MathematicalStructure,
    params: XenakisLDMParams,
    analysis: AudioAnalysisResult
  ): Record<string, number> {
    // Get regular adjustments
    const regularAdjustments = this.calculateAdjustments(deviations, structure, params, analysis);
    
    // Apply damping factor based on oscillation counter
    const dampingFactor = 1 / (1 + this.oscillationCounter * 0.5);
    
    // Apply damping to all adjustments
    const dampenedAdjustments: Record<string, number> = {};
    for (const [param, value] of Object.entries(regularAdjustments)) {
      dampenedAdjustments[param] = value * dampingFactor;
    }
    
    return dampenedAdjustments;
  }
  
  /**
   * Calculate the deviation between expected and actual values
   */
  private calculateSpecificDeviation(actual: number, expected: number): number {
    return actual - expected;
  }
  
  /**
   * Clamp parameter step to min/max range
   */
  private clampParameterStep(step: number): number {
    const absStep = Math.abs(step);
    const clampedAbsStep = Math.max(this.minParameterStep, Math.min(absStep, this.maxParameterStep));
    return Math.sign(step) * clampedAbsStep;
  }
  
  /**
   * Reset the feedback controller for a new generation
   */
  public reset(): void {
    this.currentIteration = 0;
    this.previousDeviations = [];
    this.deviationHistory = [];
    this.parameterHistory = [];
    this.oscillationCounter = 0;
    this.lastAdjustments = {};
  }
  
  /**
   * Get current feedback state
   */
  public getFeedbackState(): FeedbackState {
    return {
      iterations: this.currentIteration,
      deviationHistory: this.deviationHistory,
      parameterHistory: this.parameterHistory,
      llmInterventions: [], // Populated by the parent class
      currentStatus: this.currentIteration === 0 ? 'initial' : 
                     this.hasConverged(this.previousDeviations) ? 'converged' : 
                     this.isOscillating(this.previousDeviations) ? 'oscillating' : 
                     'in_progress'
    };
  }
  
  /**
   * Get feedback statistics
   */
  public getStatistics(): any {
    const deviationTrend = this.calculateDeviationTrend();
    return {
      iterations: this.currentIteration,
      averageDeviation: this.previousDeviations.length > 0 ? 
        this.previousDeviations.reduce((sum, val) => sum + val, 0) / this.previousDeviations.length : 0,
      deviationTrend: deviationTrend.direction,
      deviationTrendMagnitude: deviationTrend.magnitude,
      oscillationCount: this.oscillationCounter,
      converged: this.hasConverged(this.previousDeviations)
    };
  }
  
  /**
   * Calculate the trend in deviations
   */
  private calculateDeviationTrend(): { direction: 'increasing' | 'decreasing' | 'stable'; magnitude: number } {
    if (this.deviationHistory.length < 2) {
      return { direction: 'stable', magnitude: 0 };
    }
    
    // Calculate average deviation for last two iterations
    const currentAvg = this.deviationHistory[this.deviationHistory.length - 1]
      .reduce((sum, val) => sum + val, 0) / this.deviationHistory[this.deviationHistory.length - 1].length;
    
    const previousAvg = this.deviationHistory[this.deviationHistory.length - 2]
      .reduce((sum, val) => sum + val, 0) / this.deviationHistory[this.deviationHistory.length - 2].length;
    
    const difference = currentAvg - previousAvg;
    const magnitude = Math.abs(difference);
    
    if (magnitude < 0.01) {
      return { direction: 'stable', magnitude };
    } else if (difference > 0) {
      return { direction: 'increasing', magnitude };
    } else {
      return { direction: 'decreasing', magnitude };
    }
  }
}