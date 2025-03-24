import { EventEmitter } from 'events';
import { GrymSynthHealthMonitor } from '../../monitoring/GrymSynthHealthMonitor';
import { 
  XenakisLDMClient, 
  XenakisLDMParams, 
  XenakisLDMResponse,
  XenakisGenerationProgress
} from '../xenakisldm-client';
import { AudioAnalyzer } from '../../../services/audio/AudioAnalyzer';
import { XenakisToAudioLDMMapper } from './XenakisToAudioLDMMapper';
import { FeedbackController, FeedbackResult, LLMFeedbackDecision } from './FeedbackController';
import { MathematicalStructure } from '../types';

/**
 * Configuration for XenakisLDMWithFeedback
 */
export interface XenakisLDMWithFeedbackConfig {
  maxFeedbackIterations?: number;
  enableAutomaticFeedback?: boolean;
  enableLLMReasoning?: boolean;
  visualizeFeedbackProcess?: boolean;
  convergenceThreshold?: number;
  adaptToHealth?: boolean;
}

/**
 * Progress update during feedback-enhanced generation
 */
export interface FeedbackEnhancedProgress extends XenakisGenerationProgress {
  feedbackIteration?: number;
  feedbackStatus?: string;
  deviations?: Record<string, number>;
  adjustments?: Record<string, number>;
  processingStage?: 'generation' | 'analysis' | 'feedback' | 'adjustment';
}

/**
 * Function type for LLM reasoning callback
 */
type LLMReasoningCallback = (
  audioAnalysis: any,
  structure: MathematicalStructure,
  deviations: number[],
  context: any
) => Promise<LLMFeedbackDecision>;

/**
 * Extends XenakisLDMClient with bidirectional feedback loop capabilities
 */
export class XenakisLDMWithFeedback extends EventEmitter {
  private xenakisLDMClient: XenakisLDMClient;
  private audioAnalyzer: AudioAnalyzer;
  private feedbackController: FeedbackController;
  private mapper: XenakisToAudioLDMMapper;
  private healthMonitor?: GrymSynthHealthMonitor;
  private config: XenakisLDMWithFeedbackConfig;
  private reasoningLLM?: LLMReasoningCallback;
  
  constructor(
    xenakisLDMClient: XenakisLDMClient,
    audioAnalyzer: AudioAnalyzer,
    config: XenakisLDMWithFeedbackConfig = {},
    healthMonitor?: GrymSynthHealthMonitor
  ) {
    super();
    
    this.xenakisLDMClient = xenakisLDMClient;
    this.audioAnalyzer = audioAnalyzer;
    this.healthMonitor = healthMonitor;
    
    // Default configuration
    this.config = {
      maxFeedbackIterations: 3,
      enableAutomaticFeedback: true,
      enableLLMReasoning: false,
      visualizeFeedbackProcess: true,
      convergenceThreshold: 0.05,
      adaptToHealth: true,
      ...config
    };
    
    // Initialize feedback controller
    this.feedbackController = new FeedbackController({
      maxIterations: this.config.maxFeedbackIterations,
      convergenceThreshold: this.config.convergenceThreshold
    });
    
    // Initialize parameter mapper
    this.mapper = new XenakisToAudioLDMMapper(
      this.xenakisLDMClient.getMathIntegrationLayer(),
      this.audioAnalyzer,
      {
        enableFeedback: true,
        adaptToSystemLoad: this.config.adaptToHealth
      }
    );
  }
  
  /**
   * Set the LLM reasoning callback for advanced feedback decisions
   */
  setReasoningLLM(callback: LLMReasoningCallback): void {
    this.reasoningLLM = callback;
    this.config.enableLLMReasoning = true;
  }
  
  /**
   * Generate audio with feedback-based refinement
   */
  async generateAudioWithFeedback(
    params: XenakisLDMParams,
    onProgress?: (progress: FeedbackEnhancedProgress) => void
  ): Promise<XenakisLDMResponse> {
    // Reset feedback controller state
    this.feedbackController.reset();
    
    let currentParams = { ...params };
    let iterations = 0;
    const maxIterations = this.config.maxFeedbackIterations || 3;
    const feedbackHistory: FeedbackResult[] = [];
    let finalResponse: XenakisLDMResponse | null = null;
    
    // Record generation start if health monitoring is enabled
    if (this.healthMonitor) {
      this.healthMonitor.recordOperationStart('feedbackGeneration', {
        maxIterations,
        initialParameters: JSON.stringify(params),
        timestamp: Date.now()
      });
    }
    
    try {
      while (iterations < maxIterations) {
        // Update progress
        if (onProgress) {
          onProgress({
            percentComplete: (iterations / maxIterations) * 30, // First 30% for initial generation
            step: iterations + 1,
            totalSteps: maxIterations,
            processingStage: 'generation',
            feedbackIteration: iterations,
            feedbackStatus: iterations === 0 ? 'initial' : 'refinement'
          });
        }
        
        // Generate audio with current parameters
        const result = await this.xenakisLDMClient.generateAudio(
          currentParams,
          // Forward progress updates with additional feedback context
          progress => {
            if (onProgress) {
              onProgress({
                ...progress,
                feedbackIteration: iterations,
                processingStage: 'generation',
                feedbackStatus: iterations === 0 ? 'initial' : 'refinement'
              });
            }
          }
        );
        
        // Store final response after first generation
        if (iterations === 0) {
          finalResponse = result;
        }
        
        // Check if feedback is disabled
        if (!this.config.enableAutomaticFeedback) {
          return result;
        }
        
        // Update progress for analysis phase
        if (onProgress) {
          onProgress({
            percentComplete: 30 + (iterations / maxIterations) * 20, // 30-50% for analysis
            step: iterations + 1,
            totalSteps: maxIterations,
            processingStage: 'analysis',
            feedbackIteration: iterations
          });
        }
        
        // Analyze audio to extract features
        const audioBuffer = await this.createAudioBufferFromResponse(result);
        const audioAnalysis = await this.audioAnalyzer.analyzeAudio(
          audioBuffer,
          (percentage, stage) => {
            if (onProgress) {
              onProgress({
                percentComplete: 30 + (iterations / maxIterations) * 20 + percentage * 0.2, 
                step: iterations + 1,
                totalSteps: maxIterations,
                processingStage: 'analysis',
                feedbackIteration: iterations,
                estimatedTimeRemaining: (maxIterations - iterations) * 5000 // Rough estimate
              });
            }
          }
        );
        
        // Update progress for feedback phase
        if (onProgress) {
          onProgress({
            percentComplete: 50 + (iterations / maxIterations) * 25, // 50-75% for feedback
            step: iterations + 1,
            totalSteps: maxIterations,
            processingStage: 'feedback',
            feedbackIteration: iterations
          });
        }
        
        // Process feedback
        const structure = result.mathematicalStructure as MathematicalStructure;
        const deviations = this.extractDeviations(audioAnalysis, structure);
        
        const feedbackResult = this.feedbackController.processFeedback(
          Object.values(deviations),
          structure,
          currentParams,
          audioAnalysis
        );
        
        feedbackHistory.push(feedbackResult);
        
        // Emit feedback event
        this.emit('feedback', {
          iteration: iterations,
          feedbackResult,
          audioAnalysis,
          structure,
          params: currentParams
        });
        
        // Update progress with feedback results
        if (onProgress) {
          onProgress({
            percentComplete: 50 + (iterations / maxIterations) * 25 + 10, 
            step: iterations + 1,
            totalSteps: maxIterations,
            processingStage: 'feedback',
            feedbackIteration: iterations,
            feedbackStatus: feedbackResult.status,
            deviations: deviations as any,
            adjustments: feedbackResult.adjustments || {}
          });
        }
        
        // Check if we need LLM reasoning
        if (this.config.enableLLMReasoning && this.reasoningLLM && feedbackResult.referToLLM) {
          // LLM decision point
          const llmDecision = await this.reasoningLLM(
            audioAnalysis,
            structure,
            Object.values(deviations),
            {
              originalParams: params,
              currentParams,
              feedbackHistory,
              currentResult: result
            }
          );
          
          if (llmDecision.action === 'terminate') {
            // LLM decided to terminate feedback loop
            break;
          } else if (llmDecision.action === 'adjust') {
            // Apply LLM-suggested parameter adjustments
            currentParams = llmDecision.adjustedParams || currentParams;
          }
        } else if (feedbackResult.status === 'converged' || feedbackResult.status === 'terminated') {
          // Automatic termination conditions reached
          break;
        } else {
          // Apply automated adjustments
          if (feedbackResult.adjustments) {
            currentParams = this.applyAdjustments(currentParams, feedbackResult.adjustments);
          }
        }
        
        // Update progress for adjustment phase
        if (onProgress) {
          onProgress({
            percentComplete: 75 + (iterations / maxIterations) * 25, // 75-100% for adjustment
            step: iterations + 1,
            totalSteps: maxIterations,
            processingStage: 'adjustment',
            feedbackIteration: iterations,
            adjustments: feedbackResult.adjustments || {}
          });
        }
        
        iterations++;
      }
      
      // Ensure we have a response to return
      if (!finalResponse) {
        throw new Error('No valid response generated during feedback process');
      }
      
      // Enhance response with feedback information
      const enhancedResponse: XenakisLDMResponse = {
        ...finalResponse,
        processingTime: finalResponse.processingTime + (iterations * 1000), // Add feedback time
      };
      
      // Add feedback metadata to the response
      (enhancedResponse as any).feedbackMetadata = {
        iterations,
        convergence: feedbackHistory.length > 0 ? 
          feedbackHistory[feedbackHistory.length - 1].metrics?.convergenceScore : 0,
        adjustments: feedbackHistory.map(fb => fb.adjustments)
      };
      
      // Record successful operation completion if health monitoring is enabled
      if (this.healthMonitor) {
        this.healthMonitor.recordOperationComplete(
          'feedbackGeneration',
          Date.now(),
          true,
          {
            iterations,
            finalParameters: JSON.stringify(currentParams),
            convergence: feedbackHistory.length > 0 ? 
              feedbackHistory[feedbackHistory.length - 1].metrics?.convergenceScore : 0
          }
        );
      }
      
      return enhancedResponse;
    } catch (error) {
      // Record failed operation if health monitoring is enabled
      if (this.healthMonitor) {
        this.healthMonitor.recordOperationComplete(
          'feedbackGeneration',
          Date.now(),
          false,
          {
            iterations,
            error: (error as Error).message
          }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Apply parameter adjustments from feedback
   */
  private applyAdjustments(
    params: XenakisLDMParams,
    adjustments: Record<string, number>
  ): XenakisLDMParams {
    const result = { ...params };
    
    // Apply each adjustment with limits
    for (const [paramName, adjustment] of Object.entries(adjustments)) {
      // Handle nested parameters using dot notation
      const parts = paramName.split('.');
      if (parts.length === 2) {
        const domain = parts[0];
        const parameter = parts[1];
        
        // Ensure domain exists
        if (!result[domain as keyof XenakisLDMParams]) {
          result[domain as keyof XenakisLDMParams] = {};
        }
        
        const domainParams = result[domain as keyof XenakisLDMParams] as Record<string, any>;
        
        // Get current value and limits for the parameter
        const currentValue = domainParams[parameter] || 0;
        const maxChange = this.getMaxChangeForParameter(domain, parameter, currentValue);
        
        // Apply limited adjustment
        const limitedAdjustment = Math.max(-maxChange, Math.min(maxChange, adjustment));
        domainParams[parameter] = Math.max(0, Math.min(1, currentValue + limitedAdjustment));
      }
    }
    
    return result;
  }
  
  /**
   * Get the maximum allowed change for a parameter
   */
  private getMaxChangeForParameter(domain: string, parameter: string, currentValue: number): number {
    // Default maximum change is 20% of the parameter range
    let maxChange = 0.2;
    
    // Adjust max change based on domain and parameter
    switch (`${domain}.${parameter}`) {
      // Stochastic parameters
      case 'stochastic.density':
        maxChange = 0.1; // 10% max change
        break;
      case 'stochastic.randomness':
        maxChange = 0.15; // 15% max change
        break;
        
      // Game theory parameters
      case 'gameTheory.equilibriumWeight':
        maxChange = 0.1; // 10% max change
        break;
      case 'gameTheory.randomization':
        maxChange = 0.15; // 15% max change
        break;
        
      // Granular parameters
      case 'granular.density':
        maxChange = 0.15; // 15% max change
        break;
      case 'granular.grainSize':
        // For grain size (in ms), use absolute units
        return 10; // 10ms max change
        
      // Set theory parameters can change more significantly
      case 'setTheory.referenceTonesWeight':
        maxChange = 0.25; // 25% max change
        break;
        
      // Default to 20% for unknown parameters
      default:
        maxChange = 0.2;
    }
    
    return maxChange;
  }
  
  /**
   * Extract deviations from audio analysis
   */
  private extractDeviations(
    audioAnalysis: any,
    structure: MathematicalStructure
  ): Record<string, number> {
    const deviations: Record<string, number> = {};
    const type = structure.type;
    
    // Extract spectral deviations
    const spectral = audioAnalysis.spectromorphAnalysis.spectralFeatures;
    deviations['spectralCentroid'] = this.normalizeDeviation(spectral.centroid, 2000, 5000);
    deviations['spectralSpread'] = this.normalizeDeviation(spectral.spread, 500, 2000);
    deviations['spectralFlatness'] = this.normalizeDeviation(spectral.flatness, 0.3, 0.7);
    
    // Extract morphological deviations
    const morphology = audioAnalysis.spectromorphAnalysis.morphologicalModel;
    deviations['energy'] = this.normalizeDeviation(morphology.energy, 0.4, 0.7);
    deviations['complexity'] = this.normalizeDeviation(morphology.complexity, 0.3, 0.8);
    
    // Add structure-specific deviations
    if (type === 'stochastic' && structure.parameters.stochastic) {
      const density = structure.parameters.stochastic.density || 0.5;
      deviations['density'] = this.normalizeDeviation(spectral.spread / 2000, density);
    }
    
    if (type === 'gameTheory' && structure.parameters.gameTheory) {
      const randomization = structure.parameters.gameTheory.randomization || 0.3;
      deviations['randomization'] = this.normalizeDeviation(
        audioAnalysis.spectromorphAnalysis.temporalGesture.turbulence,
        randomization
      );
    }
    
    if (type === 'granular' && structure.parameters.granular) {
      const density = structure.parameters.granular.density || 0.5;
      deviations['granularDensity'] = this.normalizeDeviation(
        audioAnalysis.spectromorphAnalysis.temporalGesture.flocking,
        density
      );
    }
    
    return deviations;
  }
  
  /**
   * Normalize a deviation value to 0-1 range
   */
  private normalizeDeviation(actual: number, expected: number, maxValue?: number): number {
    if (maxValue !== undefined) {
      // Scale both values to 0-1 range
      const normalizedActual = Math.min(1, Math.max(0, actual / maxValue));
      const normalizedExpected = Math.min(1, Math.max(0, expected / maxValue));
      return Math.abs(normalizedActual - normalizedExpected);
    } else {
      // Direct comparison for already normalized values
      return Math.abs(actual - expected);
    }
  }
  
  /**
   * Create an AudioBuffer from a response for analysis
   */
  private async createAudioBufferFromResponse(response: XenakisLDMResponse): Promise<Float32Array | AudioBuffer> {
    // In a real implementation, this would convert the audio data
    // For now, we'll simulate with random data
    if (response.audioData) {
      return response.audioData;
    }
    
    // Create simulated audio data
    const duration = response.duration || 5;
    const sampleRate = 44100;
    const numSamples = Math.ceil(duration * sampleRate);
    const audioData = new Float32Array(numSamples);
    
    // Fill with simulated audio data
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Create some simulated audio based on response parameters
      const amplitude = 0.5 + 0.2 * Math.sin(t * 2);
      const frequency = 440 + 100 * Math.sin(t * 0.5);
      
      audioData[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
      
      // Add some noise
      audioData[i] += (Math.random() - 0.5) * 0.1;
    }
    
    return audioData;
  }
  
  /**
   * Get the underlying XenakisLDM client
   */
  getXenakisLDMClient(): XenakisLDMClient {
    return this.xenakisLDMClient;
  }
  
  /**
   * Get the mapper
   */
  getMapper(): XenakisToAudioLDMMapper {
    return this.mapper;
  }
  
  /**
   * Get the feedback controller
   */
  getFeedbackController(): FeedbackController {
    return this.feedbackController;
  }
  
  /**
   * Update the configuration
   */
  updateConfig(config: Partial<XenakisLDMWithFeedbackConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    // Update feedback controller settings
    if (config.maxFeedbackIterations || config.convergenceThreshold) {
      this.feedbackController = new FeedbackController({
        maxIterations: this.config.maxFeedbackIterations,
        convergenceThreshold: this.config.convergenceThreshold
      });
    }
  }
}