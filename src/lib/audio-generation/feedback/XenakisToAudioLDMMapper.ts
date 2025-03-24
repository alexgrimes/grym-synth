import { MathematicalIntegrationLayer } from '../math';
import { AudioAnalysisResult, SpectroMorphAnalysis } from '../../../types/AudioAnalysis';
import { XenakisLDMParams, AudioLDMParams } from '../xenakisldm-client';
import { MathematicalStructure } from '../types';
import { FeedbackController, ParameterAdjustment } from './FeedbackController';
import { EventEmitter } from 'events';

/**
 * Interface for the audio analyzer
 */
interface AudioAnalyzer {
  analyzeAudio(
    audioData: Float32Array | AudioBuffer,
    onProgress?: (percentage: number, stage: string) => void
  ): Promise<AudioAnalysisResult>;
}

/**
 * Mapping profile for domain-specific parameter mappings
 */
export interface MappingProfile {
  name: string;
  description: string;
  targetDomains: string[];
  parameterMappings: ParameterMapping[];
  perceptualAdjustments: PerceptualAdjustment[];
  semanticInterpretation?: SemanticInterpretation;
}

/**
 * Mapping between parameters in different domains
 */
export interface ParameterMapping {
  sourceParameter: string;
  targetParameter: string;
  transformFunction: (value: any, context: any) => any;
  bidirectional: boolean;
  weight: number;
}

/**
 * Perceptual adjustment function
 */
export interface PerceptualAdjustment {
  targetParameter: string;
  adjustmentFunction: (value: any, context: any) => any;
  description: string;
  weight: number;
}

/**
 * Semantic interpretation of parameters
 */
export interface SemanticInterpretation {
  categories: string[];
  mappingFunctions: Record<string, (description: string, context: any) => Record<string, any>>;
}

/**
 * Time-based parameter evolution
 */
export interface TimeBasedParameters {
  timePoints: number[];
  parameterValues: Record<string, any>[];
  duration: number;
  smoothingFactor: number;
}

/**
 * Process for parameter evolution
 */
export interface EvolutionProcess {
  type: 'linear' | 'exponential' | 'sinusoidal' | 'random' | 'stepped';
  parameterIds: string[];
  startValues: Record<string, number>;
  endValues: Record<string, number>;
  controlPoints?: Record<string, {time: number; value: number}[]>;
  smoothingFactor: number;
}

/**
 * Context for semantic mapping
 */
export interface SemanticContext {
  recentPrompts?: string[];
  recentAnalyses?: AudioAnalysisResult[];
  targetStyle?: string;
  musicalParameters?: Record<string, any>;
}

/**
 * Spectral envelope description
 */
export interface SpectralEnvelope {
  frequencies: number[];
  magnitudes: number[];
  phases?: number[];
}

/**
 * Mathematical adjustments
 */
export interface MathematicalAdjustments {
  parameterAdjustments: Record<string, number>;
  structuralChanges?: Record<string, any>;
  confidenceScore: number;
  explanation?: string;
}

/**
 * Configuration for XenakisToAudioLDMMapper
 */
export interface XenakisToAudioLDMMapperConfig {
  enableFeedback?: boolean;
  enableSpectralMapping?: boolean;
  enableSemanticMapping?: boolean;
  enablePerceptualAdjustments?: boolean;
  defaultMappingProfile?: string;
  feedbackIterations?: number;
  adaptToSystemLoad?: boolean;
}

/**
 * Class that maps between XenakisLDM mathematical structures and AudioLDM parameters
 * Implements bidirectional feedback and sophisticated parameter mapping
 */
export class XenakisToAudioLDMMapper extends EventEmitter {
  private mathematicalIntegrationLayer: MathematicalIntegrationLayer;
  private audioAnalyzer: AudioAnalyzer;
  private mappingProfiles: Map<string, MappingProfile> = new Map();
  private feedbackController: FeedbackController;
  private config: XenakisToAudioLDMMapperConfig;
  private defaultProfile: string;
  
  constructor(
    mathematicalIntegrationLayer: MathematicalIntegrationLayer,
    audioAnalyzer: AudioAnalyzer,
    config: XenakisToAudioLDMMapperConfig = {}
  ) {
    super();
    this.mathematicalIntegrationLayer = mathematicalIntegrationLayer;
    this.audioAnalyzer = audioAnalyzer;
    
    // Initialize configuration with defaults
    this.config = {
      enableFeedback: true,
      enableSpectralMapping: true,
      enableSemanticMapping: true,
      enablePerceptualAdjustments: true,
      defaultMappingProfile: 'standard',
      feedbackIterations: 3,
      adaptToSystemLoad: true,
      ...config
    };
    
    this.defaultProfile = this.config.defaultMappingProfile || 'standard';
    
    // Initialize mapping profiles
    this.initializeMappingProfiles();
    
    // Initialize feedback controller
    this.feedbackController = new FeedbackController({
      maxIterations: this.config.feedbackIterations,
      convergenceThreshold: 0.05,
      oscillationThreshold: 0.8
    });
  }
  
  /**
   * Initialize default mapping profiles
   */
  private initializeMappingProfiles(): void {
    // Standard mapping profile
    this.registerMappingProfile({
      name: 'standard',
      description: 'Standard mapping between mathematical structures and audio parameters',
      targetDomains: ['stochastic', 'sieve', 'gameTheory', 'setTheory'],
      parameterMappings: [
        // Stochastic to Audio mapping
        {
          sourceParameter: 'stochastic.density',
          targetParameter: 'prompt.texture',
          transformFunction: (density: number, context: any) => {
            // Map density to texture description
            if (density < 0.3) return 'sparse texture, discrete events';
            if (density > 0.7) return 'dense texture, continuous sound mass';
            return 'moderate density, balanced texture';
          },
          bidirectional: false,
          weight: 0.8
        },
        {
          sourceParameter: 'stochastic.randomness',
          targetParameter: 'prompt.consistency',
          transformFunction: (randomness: number, context: any) => {
            // Map randomness to consistency description
            if (randomness < 0.3) return 'predictable patterns, consistent rhythm';
            if (randomness > 0.7) return 'unpredictable, chaotic variations';
            return 'semi-regular patterns, organized variations';
          },
          bidirectional: false,
          weight: 0.7
        },
        // Game Theory to Audio mapping
        {
          sourceParameter: 'gameTheory.equilibriumWeight',
          targetParameter: 'prompt.stability',
          transformFunction: (weight: number, context: any) => {
            // Map equilibrium weight to stability description
            if (weight < 0.3) return 'unstable, evolving texture';
            if (weight > 0.7) return 'stable, balanced sound';
            return 'gradually evolving sound, moderate stability';
          },
          bidirectional: false,
          weight: 0.6
        },
        // Set Theory to Audio mapping
        {
          sourceParameter: 'setTheory.baseSet',
          targetParameter: 'prompt.tonality',
          transformFunction: (baseSet: number[], context: any) => {
            // Analyze the pitch class set for tonality
            const setSize = baseSet.length;
            if (setSize <= 3) return 'simple harmonies, clear tonality';
            if (setSize >= 8) return 'complex harmonies, atonal qualities';
            return 'moderately complex harmonics, extended tonality';
          },
          bidirectional: false,
          weight: 0.9
        },
        // Granular to Audio mapping
        {
          sourceParameter: 'granular.grainSize',
          targetParameter: 'prompt.texture',
          transformFunction: (grainSize: number, context: any) => {
            // Map grain size to texture description
            if (grainSize < 10) return 'micro-granular texture, glitchy';
            if (grainSize > 50) return 'macro-granular, fragmented sounds';
            return 'granular texture, grainy quality';
          },
          bidirectional: false,
          weight: 0.75
        }
      ],
      perceptualAdjustments: [
        {
          targetParameter: 'guidance_scale',
          adjustmentFunction: (baseValue: number, context: any) => {
            // Adjust guidance scale based on randomness
            const randomness = context.params?.stochastic?.randomness || 0.5;
            return baseValue * (1 + (randomness - 0.5) * 0.4); // ±20% adjustment
          },
          description: 'Adjusts guidance scale based on randomness parameter',
          weight: 0.5
        },
        {
          targetParameter: 'prompt',
          adjustmentFunction: (basePrompt: string, context: any) => {
            // Enhance prompt with mathematical characteristics
            const mathematicalTerms = [];
            
            // Add descriptors based on each mathematical domain
            if (context.params?.stochastic) {
              const distributionType = context.params.stochastic.distributionType;
              switch (distributionType) {
                case 'poisson':
                  mathematicalTerms.push('stochastic distribution of elements');
                  break;
                case 'cauchy':
                  mathematicalTerms.push('extreme variations in sonic density');
                  break;
                case 'logistic':
                  mathematicalTerms.push('balanced probabilistic patterns');
                  break;
                case 'exponential':
                  mathematicalTerms.push('decaying sonic intensity');
                  break;
              }
            }
            
            if (context.params?.gameTheory) {
              mathematicalTerms.push('evolving strategic patterns');
            }
            
            if (context.params?.setTheory) {
              mathematicalTerms.push('structured harmonic relationships');
            }
            
            if (context.params?.sieve) {
              mathematicalTerms.push('systematically filtered frequencies');
            }
            
            if (mathematicalTerms.length > 0) {
              const mathematicalDescription = mathematicalTerms.join(', ');
              if (!basePrompt.includes(mathematicalDescription)) {
                return `${basePrompt}, ${mathematicalDescription}`;
              }
            }
            
            return basePrompt;
          },
          description: 'Enhances prompt with mathematical characteristics',
          weight: 0.9
        }
      ]
    });
    
    // Spectral mapping profile
    this.registerMappingProfile({
      name: 'spectral',
      description: 'Mapping focused on spectral characteristics',
      targetDomains: ['stochastic', 'sieve', 'gameTheory', 'setTheory'],
      parameterMappings: [
        // Stochastic to spectral mapping
        {
          sourceParameter: 'stochastic.density',
          targetParameter: 'spectral.regions',
          transformFunction: (density: number, context: any) => {
            // Create spectral regions based on density
            const count = Math.floor(density * 8) + 1; // 1-9 regions
            const regions = [];
            
            for (let i = 0; i < count; i++) {
              const position = i / count;
              regions.push({
                centerFreq: 100 + position * 8000, // 100Hz to 8100Hz
                bandwidth: 500 + density * 1000,   // 500Hz to 1500Hz
                gain: 0.5 + Math.sin(position * Math.PI) * 0.5 // Gain curve
              });
            }
            
            return regions;
          },
          bidirectional: true,
          weight: 0.9
        },
        // Set theory to spectral mapping
        {
          sourceParameter: 'setTheory.baseSet',
          targetParameter: 'spectral.motionType',
          transformFunction: (baseSet: number[], context: any) => {
            // Determine motion type based on set structure
            const setSize = baseSet.length;
            if (setSize <= 3) return 'static';
            if (setSize >= 8) return 'random';
            if (setSize % 2 === 0) return 'oscillation';
            return 'linear';
          },
          bidirectional: false,
          weight: 0.7
        }
      ],
      perceptualAdjustments: [
        {
          targetParameter: 'spectral.motionRate',
          adjustmentFunction: (baseValue: number, context: any) => {
            // Adjust motion rate based on stochastic randomness
            const randomness = context.params?.stochastic?.randomness || 0.5;
            return baseValue * (0.5 + randomness); // Scale by randomness
          },
          description: 'Adjusts spectral motion rate based on randomness parameter',
          weight: 0.8
        }
      ]
    });
    
    // Semantic mapping profile
    this.registerMappingProfile({
      name: 'semantic',
      description: 'Mapping based on semantic musical concepts',
      targetDomains: ['stochastic', 'sieve', 'gameTheory', 'setTheory'],
      parameterMappings: [
        // No direct mappings, uses semantic interpretation
      ],
      perceptualAdjustments: [],
      semanticInterpretation: {
        categories: ['texture', 'density', 'harmony', 'rhythm', 'timbre'],
        mappingFunctions: {
          texture: (description: string, context: any) => {
            // Map texture descriptions to parameters
            if (description.includes('granular')) {
              return {
                'granular.density': 0.7,
                'granular.grainSize': 20
              };
            } else if (description.includes('smooth')) {
              return {
                'stochastic.randomness': 0.2,
                'prompt': context.params.prompt + ', smooth texture'
              };
            }
            return {};
          },
          harmony: (description: string, context: any) => {
            // Map harmony descriptions to parameters
            if (description.includes('atonal')) {
              return {
                'setTheory.operation': 'complement',
                'prompt': context.params.prompt + ', atonal harmonies'
              };
            } else if (description.includes('tonal')) {
              return {
                'setTheory.operation': 'intersection',
                'prompt': context.params.prompt + ', tonal harmonies'
              };
            }
            return {};
          }
        }
      }
    });
  }
  
  /**
   * Register a new mapping profile
   */
  registerMappingProfile(profile: MappingProfile): void {
    this.mappingProfiles.set(profile.name, profile);
  }
  
  /**
   * Map from mathematical structures to AudioLDM parameters
   */
  mapToAudioLDMParams(
    mathematicalStructure: MathematicalStructure,
    baseParams: AudioLDMParams
  ): AudioLDMParams {
    // Select appropriate mapping profile based on structure type and context
    const profile = this.selectMappingProfile(mathematicalStructure, baseParams);
    
    // Apply domain-specific mapping functions
    const mappedParams = this.applyDomainMapping(mathematicalStructure, baseParams, profile);
    
    // Apply perceptual adjustments if enabled
    const finalParams = this.config.enablePerceptualAdjustments
      ? this.applyPerceptualAdjustments(mappedParams, profile, { params: mappedParams, structure: mathematicalStructure })
      : mappedParams;
      
    return finalParams;
  }
  
  /**
   * Select appropriate mapping profile based on structure and context
   */
  private selectMappingProfile(
    mathematicalStructure: MathematicalStructure,
    baseParams: AudioLDMParams
  ): MappingProfile {
    // Check if there's a parameter mapping profile specified
    if (baseParams['mappingProfile'] && this.mappingProfiles.has(baseParams['mappingProfile'] as string)) {
      return this.mappingProfiles.get(baseParams['mappingProfile'] as string)!;
    }
    
    // Select profile based on structure type
    const structureType = mathematicalStructure.type;
    
    // Analyze structure complexity
    const complexity = this.analyzeStructureComplexity(mathematicalStructure);
    
    // Spectral mapping for complex structures if enabled
    if (complexity > 0.7 && this.config.enableSpectralMapping && this.mappingProfiles.has('spectral')) {
      return this.mappingProfiles.get('spectral')!;
    }
    
    // Semantic mapping if enabled and prompt is complex
    if (
      this.config.enableSemanticMapping && 
      this.mappingProfiles.has('semantic') && 
      baseParams.prompt && 
      baseParams.prompt.length > 50
    ) {
      return this.mappingProfiles.get('semantic')!;
    }
    
    // Default to standard mapping profile
    return this.mappingProfiles.get(this.defaultProfile)!;
  }
  
  /**
   * Analyze the complexity of a mathematical structure
   */
  private analyzeStructureComplexity(structure: MathematicalStructure): number {
    let complexity = 0;
    
    // Base complexity on number of active generators
    if (structure.structures) {
      complexity += Object.keys(structure.structures).length * 0.2;
    }
    
    // Add complexity for time evolution data
    if (structure.timeEvolution) {
      complexity += Object.keys(structure.timeEvolution).length * 0.1;
    }
    
    // Add complexity for visualization data
    if (structure.visualization) {
      complexity += 0.2;
    }
    
    // Specific structure type factors
    switch (structure.type) {
      case 'gameTheory':
        complexity += 0.3;
        break;
      case 'setTheory':
        complexity += 0.2;
        break;
      case 'stochastic':
        complexity += 0.1;
        break;
    }
    
    // Normalize to 0-1 range
    return Math.min(1, complexity);
  }
  
  /**
   * Apply domain-specific mappings from mathematical structure to AudioLDM parameters
   */
  private applyDomainMapping(
    structure: MathematicalStructure,
    baseParams: AudioLDMParams,
    profile: MappingProfile
  ): AudioLDMParams {
    const result = { ...baseParams };
    const context = { structure, baseParams };
    
    // Extract parameter values from mathematical structure
    const parameterValues: Record<string, any> = this.extractParameterValues(structure);
    
    // Apply each mapping that's applicable
    for (const mapping of profile.parameterMappings) {
      const sourceKey = mapping.sourceParameter;
      const targetKey = mapping.targetParameter;
      
      // Check if source parameter exists in our extracted values
      if (sourceKey in parameterValues) {
        const sourceValue = parameterValues[sourceKey];
        
        // Apply transformation function
        const targetValue = mapping.transformFunction(sourceValue, context);
        
        // Apply transformed value to target parameter
        this.setNestedProperty(result, targetKey, targetValue);
      }
    }
    
    // Apply prompt enhancements for mathematical structure type
    this.enhancePromptForStructure(result, structure);
    
    return result;
  }
  
  /**
   * Apply perceptual adjustments to the mapped parameters
   */
  private applyPerceptualAdjustments(
    params: AudioLDMParams,
    profile: MappingProfile,
    context: any
  ): AudioLDMParams {
    const result = { ...params };
    
    // Apply each perceptual adjustment
    for (const adjustment of profile.perceptualAdjustments) {
      const targetKey = adjustment.targetParameter;
      
      // Get the current value or use a default
      const currentValue = this.getNestedProperty(result, targetKey);
      
      if (currentValue !== undefined) {
        // Apply adjustment function
        const adjustedValue = adjustment.adjustmentFunction(currentValue, context);
        
        // Set adjusted value
        this.setNestedProperty(result, targetKey, adjustedValue);
      }
    }
    
    return result;
  }
  
  /**
   * Extract parameter values from a mathematical structure
   */
  private extractParameterValues(structure: MathematicalStructure): Record<string, any> {
    const result: Record<string, any> = {
      'type': structure.type
    };
    
    // Extract generator-specific parameters
    if (structure.parameters) {
      // Stochastic parameters
      if (structure.parameters.stochastic) {
        result['stochastic.distributionType'] = structure.parameters.stochastic.distributionType;
        result['stochastic.density'] = structure.parameters.stochastic.density;
        result['stochastic.randomness'] = structure.parameters.stochastic.randomness;
      }
      
      // Sieve parameters
      if (structure.parameters.sieve) {
        result['sieve.moduli'] = structure.parameters.sieve.moduli;
        result['sieve.residues'] = structure.parameters.sieve.residues;
        result['sieve.transformations'] = structure.parameters.sieve.transformations;
      }
      
      // Game theory parameters
      if (structure.parameters.gameTheory) {
        result['gameTheory.payoffMatrix'] = structure.parameters.gameTheory.payoffMatrix;
        result['gameTheory.equilibriumWeight'] = structure.parameters.gameTheory.equilibriumWeight;
        result['gameTheory.randomization'] = structure.parameters.gameTheory.randomization;
      }
      
      // Set theory parameters
      if (structure.parameters.setTheory) {
        result['setTheory.baseSet'] = structure.parameters.setTheory.baseSet;
        result['setTheory.operation'] = structure.parameters.setTheory.operation;
        result['setTheory.transposition'] = structure.parameters.setTheory.transposition;
      }
      
      // Granular parameters
      if (structure.parameters.granular) {
        result['granular.grainSize'] = structure.parameters.granular.grainSize;
        result['granular.density'] = structure.parameters.granular.density;
        result['granular.randomization'] = structure.parameters.granular.randomization;
      }
    }
    
    // Extract results from specific structures
    if (structure.structures) {
      for (const [generatorType, generatorResult] of Object.entries(structure.structures)) {
        switch (generatorType) {
          case 'stochastic':
            if (generatorResult.type) {
              result['stochastic.distributionType'] = generatorResult.type;
            }
            break;
          case 'setTheory':
            if (generatorResult.resultSet && generatorResult.resultSet.pitchClasses) {
              result['setTheory.resultSet'] = generatorResult.resultSet.pitchClasses;
            }
            break;
          case 'gameTheory':
            if (generatorResult.finalStrategies) {
              result['gameTheory.finalStrategies'] = generatorResult.finalStrategies;
            }
            break;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Enhance prompt with mathematical structure descriptions
   */
  private enhancePromptForStructure(params: AudioLDMParams, structure: MathematicalStructure): void {
    if (!params.prompt) return;
    
    const enhancementTerms: string[] = [];
    
    // Add structure-specific terms
    switch (structure.type) {
      case 'stochastic':
        enhancementTerms.push('stochastic variations');
        break;
      case 'sieve':
        enhancementTerms.push('structured patterns');
        break;
      case 'gameTheory':
        enhancementTerms.push('evolving dynamics');
        break;
      case 'setTheory':
        enhancementTerms.push('harmonic structures');
        break;
    }
    
    // Add terms for cross-generator operations
    if (structure.structures && Object.keys(structure.structures).length > 1) {
      enhancementTerms.push('integrated mathematical processes');
    }
    
    // Add enhancement to prompt if not already included
    if (enhancementTerms.length > 0) {
      const enhancementPhrase = enhancementTerms.join(', ');
      if (!params.prompt.includes(enhancementPhrase)) {
        params.prompt = `${params.prompt}, ${enhancementPhrase}`;
      }
    }
  }
  
  /**
   * Process audio analysis results to create feedback for mathematical parameters
   */
  async processFeedback(
    audioAnalysis: AudioAnalysisResult,
    originalStructure: MathematicalStructure,
    params: XenakisLDMParams
  ): Promise<MathematicalAdjustments> {
    // Extract relevant features from audio analysis
    const features = this.extractRelevantFeatures(audioAnalysis);
    
    // Calculate deviations between expected and actual features
    const deviations = this.calculateDeviations(features, originalStructure, params);
    
    // Process feedback using the controller
    const feedbackResult = this.feedbackController.processFeedback(
      Object.values(deviations).map(d => d.magnitude),
      originalStructure,
      params,
      audioAnalysis
    );
    
    // Create adjustment object
    const adjustments: MathematicalAdjustments = {
      parameterAdjustments: feedbackResult.adjustments || {},
      confidenceScore: feedbackResult.metrics?.convergenceScore || 0.5
    };
    
    // Add explanation for the adjustments
    if (feedbackResult.status !== 'converged') {
      const explanations: string[] = [];
      
      // Add explanations for each significant deviation
      for (const [param, deviation] of Object.entries(deviations)) {
        if (deviation.magnitude > 0.1) {
          explanations.push(
            `${param}: expected ${deviation.expected.toFixed(2)}, got ${deviation.actual.toFixed(2)}`
          );
        }
      }
      
      // Add status explanation
      switch (feedbackResult.status) {
        case 'oscillating':
          explanations.push('Parameter oscillation detected, applying dampened adjustments.');
          break;
        case 'terminated':
          explanations.push('Maximum feedback iterations reached.');
          break;
        case 'continuing':
          explanations.push('Continuing feedback loop with new adjustments.');
          break;
      }
      
      adjustments.explanation = explanations.join('\n');
    }
    
    return adjustments;
  }
  
  /**
   * Extract relevant features from audio analysis
   */
  private extractRelevantFeatures(audioAnalysis: AudioAnalysisResult): Record<string, number> {
    const features: Record<string, number> = {};
    
    // Extract spectral features
    const spectral = audioAnalysis.spectromorphAnalysis.spectralFeatures;
    features['spectralCentroid'] = spectral.centroid / 10000; // Normalize to 0-1
    features['spectralSpread'] = spectral.spread / 2000;      // Normalize to 0-1
    features['spectralFlatness'] = spectral.flatness;
    
    // Extract morphological features
    const morphology = audioAnalysis.spectromorphAnalysis.morphologicalModel;
    features['energyProfile'] = morphology.energy;
    features['complexity'] = morphology.complexity;
    
    // Extract temporal features
    const temporal = audioAnalysis.spectromorphAnalysis.temporalGesture;
    features['streaming'] = temporal.streaming;
    features['flocking'] = temporal.flocking;
    features['turbulence'] = temporal.turbulence;
    
    // Extract spectral motion features
    const motion = audioAnalysis.spectromorphAnalysis.spectralMotion;
    features['motionIntensity'] = motion.intensity;
    features['motionRate'] = motion.rate;
    
    // Extract typology features
    const typology = audioAnalysis.spectromorphAnalysis.spectralTypology;
    features['noiseLevel'] = typology.position;
    features['stability'] = typology.stability;
    
    return features;
  }
  
  /**
   * Calculate deviations between expected and actual features
   */
  private calculateDeviations(
    features: Record<string, number>,
    structure: MathematicalStructure,
    params: XenakisLDMParams
  ): Record<string, { expected: number; actual: number; magnitude: number }> {
    const deviations: Record<string, { expected: number; actual: number; magnitude: number }> = {};
    
    // Calculate expected features based on structure type and parameters
    const expectedFeatures = this.calculateExpectedFeatures(structure, params);
    
    // Calculate deviations for each feature
    for (const [key, expected] of Object.entries(expectedFeatures)) {
      if (features[key] !== undefined) {
        const actual = features[key];
        const magnitude = Math.abs(actual - expected);
        
        deviations[key] = { expected, actual, magnitude };
      }
    }
    
    return deviations;
  }
  
  /**
   * Calculate expected features based on mathematical structure
   */
  private calculateExpectedFeatures(
    structure: MathematicalStructure,
    params: XenakisLDMParams
  ): Record<string, number> {
    const expected: Record<string, number> = {};
    
    // Calculate expected features based on structure type
    switch (structure.type) {
      case 'stochastic':
        if (params.stochastic) {
          // Stochastic distribution should affect spectral spread and flatness
          expected['spectralSpread'] = 0.2 + params.stochastic.density! * 0.7;
          expected['spectralFlatness'] = 0.4 + params.stochastic.randomness! * 0.6;
          expected['turbulence'] = params.stochastic.randomness! * 0.8;
          
          // Distribution type affects other features
          if (params.stochastic.distributionType === 'poisson') {
            expected['flocking'] = 0.7;
            expected['stability'] = 0.4;
          } else if (params.stochastic.distributionType === 'cauchy') {
            expected['flocking'] = 0.3;
            expected['stability'] = 0.2;
          } else if (params.stochastic.distributionType === 'logistic') {
            expected['flocking'] = 0.5;
            expected['stability'] = 0.6;
          } else if (params.stochastic.distributionType === 'exponential') {
            expected['flocking'] = 0.4;
            expected['stability'] = 0.5;
          }
        }
        break;
        
      case 'gameTheory':
        if (params.gameTheory) {
          // Game theory should affect streaming and stability
          expected['streaming'] = params.gameTheory.equilibriumWeight! * 0.7 + 0.2;
          expected['stability'] = params.gameTheory.equilibriumWeight! * 0.8;
          expected['motionRate'] = 0.3 + params.gameTheory.randomization! * 0.7;
        }
        break;
        
      case 'setTheory':
        if (params.setTheory) {
          // Set theory should affect complexity and spectral features
          const setSize = params.setTheory.baseSet?.length || 0;
          expected['complexity'] = Math.min(1, setSize / 12);
          expected['spectralCentroid'] = 0.4 + (setSize / 24); // Normalized
        }
        break;
        
      case 'sieve':
        if (params.sieve) {
          // Sieves should affect spectral features
          const moduliCount = params.sieve.moduli?.length || 0;
          expected['spectralFlatness'] = 0.3 + (moduliCount / 10);
          expected['noiseLevel'] = 0.2 + (moduliCount / 5);
        }
        break;
    }
    
    // Add granular-specific expectations
    if (params.granular) {
      expected['flocking'] = params.granular.density! * 0.9;
      expected['complexity'] = 0.3 + params.granular.randomization! * 0.6;
    }
    
    return expected;
  }
  
  /**
   * Create parameter evolution over time based on mathematical processes
   */
  createParameterEvolution(
    initialParams: AudioLDMParams,
    evolutionProcess: EvolutionProcess,
    duration: number
  ): TimeBasedParameters {
    // Generate time points based on evolution process
    const timePoints = this.generateTimePoints(evolutionProcess, duration);
    
    // Calculate parameter values at each time point
    const parameterValues: Record<string, any>[] = timePoints.map(time => 
      this.calculateParametersAtTime(initialParams, evolutionProcess, time, duration)
    );
    
    // Apply smoothing for perceptual continuity
    return this.applySmoothing(timePoints, parameterValues, evolutionProcess.smoothingFactor);
  }
  
  /**
   * Generate time points for parameter evolution
   */
  private generateTimePoints(evolutionProcess: EvolutionProcess, duration: number): number[] {
    const points: number[] = [];
    let count: number;
    
    // Determine number of points based on process type
    switch (evolutionProcess.type) {
      case 'linear':
        count = 10;
        break;
      case 'exponential':
        count = 20;
        break;
      case 'sinusoidal':
        count = 30;
        break;
      case 'random':
        count = 40;
        break;
      case 'stepped':
        count = evolutionProcess.controlPoints 
          ? Math.max(...Object.values(evolutionProcess.controlPoints).map(points => points.length))
          : 5;
        break;
      default:
        count = 10;
    }
    
    // Generate evenly spaced points
    for (let i = 0; i <= count; i++) {
      points.push(i / count * duration);
    }
    
    return points;
  }
  
  /**
   * Calculate parameter values at a specific time point
   */
  private calculateParametersAtTime(
    initialParams: AudioLDMParams,
    evolutionProcess: EvolutionProcess,
    time: number,
    duration: number
  ): Record<string, any> {
    const result: Record<string, any> = { ...initialParams };
    const normalizedTime = time / duration; // 0 to 1
    
    // Process each parameter
    for (const parameterId of evolutionProcess.parameterIds) {
      const startValue = evolutionProcess.startValues[parameterId] || 0;
      const endValue = evolutionProcess.endValues[parameterId] || 0;
      let value: number;
      
      // Calculate value based on evolution type
      switch (evolutionProcess.type) {
        case 'linear':
          value = startValue + (endValue - startValue) * normalizedTime;
          break;
          
        case 'exponential':
          value = startValue + (endValue - startValue) * Math.pow(normalizedTime, 2);
          break;
          
        case 'sinusoidal':
          value = startValue + (endValue - startValue) * (Math.sin(normalizedTime * Math.PI * 2) + 1) / 2;
          break;
          
        case 'random':
          // Seed the random value so it's consistent each time
          const randomBasis = Math.sin(normalizedTime * 100) * 10000;
          const randomFactor = (Math.sin(randomBasis) + 1) / 2;
          value = startValue + (endValue - startValue) * randomFactor;
          break;
          
        case 'stepped':
          // Use control points if available
          if (evolutionProcess.controlPoints && evolutionProcess.controlPoints[parameterId]) {
            const points = evolutionProcess.controlPoints[parameterId];
            // Find the closest control point
            let closestPoint = points[0];
            for (const point of points) {
              if (Math.abs(point.time - normalizedTime) < Math.abs(closestPoint.time - normalizedTime)) {
                closestPoint = point;
              }
            }
            value = closestPoint.value;
          } else {
            // Default to linear if no control points
            value = startValue + (endValue - startValue) * normalizedTime;
          }
          break;
          
        default:
          value = startValue + (endValue - startValue) * normalizedTime;
      }
      
      // Set the value
      this.setNestedProperty(result, parameterId, value);
    }
    
    return result;
  }
  
  /**
   * Apply smoothing to parameter evolution
   */
  private applySmoothing(
    timePoints: number[],
    parameterValues: Record<string, any>[],
    smoothingFactor: number
  ): TimeBasedParameters {
    // If smoothing is disabled, return as-is
    if (smoothingFactor <= 0) {
      return {
        timePoints,
        parameterValues,
        duration: timePoints[timePoints.length - 1],
        smoothingFactor
      };
    }
    
    // Apply smoothing to numeric parameters
    const smoothedValues: Record<string, any>[] = [];
    
    // For each time point
    for (let i = 0; i < parameterValues.length; i++) {
      const current = parameterValues[i];
      const smoothed: Record<string, any> = {};
      
      // Process each parameter
      for (const [key, value] of Object.entries(current)) {
        if (typeof value === 'number') {
          // For numeric values, apply weighted average with neighbors
          let sum = value;
          let weight = 1;
          
          // Look at previous values
          for (let j = 1; j <= 2; j++) {
            if (i - j >= 0) {
              const prevValue = parameterValues[i - j][key];
              if (typeof prevValue === 'number') {
                const prevWeight = smoothingFactor / j;
                sum += prevValue * prevWeight;
                weight += prevWeight;
              }
            }
          }
          
          // Look at future values
          for (let j = 1; j <= 2; j++) {
            if (i + j < parameterValues.length) {
              const nextValue = parameterValues[i + j][key];
              if (typeof nextValue === 'number') {
                const nextWeight = smoothingFactor / j;
                sum += nextValue * nextWeight;
                weight += nextWeight;
              }
            }
          }
          
          // Calculate weighted average
          smoothed[key] = sum / weight;
        } else {
          // For non-numeric values, keep as-is
          smoothed[key] = value;
        }
      }
      
      smoothedValues.push(smoothed);
    }
    
    return {
      timePoints,
      parameterValues: smoothedValues,
      duration: timePoints[timePoints.length - 1],
      smoothingFactor
    };
  }
  
  /**
   * Map mathematical structures to spectral characteristics
   */
  mapToSpectralDomain(
    mathematicalStructure: MathematicalStructure,
    baseSpectralEnvelope: SpectralEnvelope
  ): SpectralEnvelope {
    // Create a copy of the base envelope
    const result: SpectralEnvelope = {
      frequencies: [...baseSpectralEnvelope.frequencies],
      magnitudes: [...baseSpectralEnvelope.magnitudes],
      phases: baseSpectralEnvelope.phases ? [...baseSpectralEnvelope.phases] : undefined
    };
    
    // Apply structure-specific transformations
    switch (mathematicalStructure.type) {
      case 'stochastic':
        this.applyStochasticSpectralTransformation(result, mathematicalStructure);
        break;
      case 'setTheory':
        this.applySetTheorySpectralTransformation(result, mathematicalStructure);
        break;
      case 'sieve':
        this.applySieveSpectralTransformation(result, mathematicalStructure);
        break;
      case 'gameTheory':
        this.applyGameTheorySpectralTransformation(result, mathematicalStructure);
        break;
    }
    
    return result;
  }
  
  /**
   * Apply stochastic transformations to spectral envelope
   */
  private applyStochasticSpectralTransformation(
    envelope: SpectralEnvelope,
    structure: MathematicalStructure
  ): void {
    // Extract stochastic parameters
    const stochasticParams = structure.parameters?.stochastic;
    if (!stochasticParams) return;
    
    const density = stochasticParams.density || 0.5;
    const randomness = stochasticParams.randomness || 0.3;
    const distributionType = stochasticParams.distributionType || 'poisson';
    
    // Apply spectral transformations based on distribution type
    switch (distributionType) {
      case 'poisson':
        // Poisson creates clustered energy peaks
        for (let i = 0; i < envelope.magnitudes.length; i++) {
          // Create spectral clusters with poisson-like distribution
          const randomValue = Math.random();
          const influence = Math.exp(-randomValue / (density * 0.5)) * randomness;
          envelope.magnitudes[i] *= (1 + influence);
        }
        break;
        
      case 'cauchy':
        // Cauchy creates resonant peaks with long tails
        for (let i = 0; i < envelope.magnitudes.length; i++) {
          const normalized = i / envelope.magnitudes.length;
          const resonance = 1 / (1 + Math.pow((normalized - 0.5) / (0.1 * density), 2));
          envelope.magnitudes[i] *= (1 + resonance * randomness);
        }
        break;
        
      case 'exponential':
        // Exponential creates decaying spectral profile
        for (let i = 0; i < envelope.magnitudes.length; i++) {
          const normalized = i / envelope.magnitudes.length;
          const decay = Math.exp(-normalized / density);
          envelope.magnitudes[i] *= (decay + (1 - decay) * (1 - randomness));
        }
        break;
        
      case 'logistic':
        // Logistic creates balanced spectral distribution
        for (let i = 0; i < envelope.magnitudes.length; i++) {
          const normalized = i / envelope.magnitudes.length;
          const logistic = 1 / (1 + Math.exp(-(normalized - 0.5) / (density * 0.2)));
          envelope.magnitudes[i] *= (logistic * 0.8 + 0.2 + randomness * 0.3 * (Math.random() - 0.5));
        }
        break;
    }
  }
  
  /**
   * Apply set theory transformations to spectral envelope
   */
  private applySetTheorySpectralTransformation(
    envelope: SpectralEnvelope,
    structure: MathematicalStructure
  ): void {
    // Extract set theory parameters
    const setTheoryParams = structure.parameters?.setTheory;
    if (!setTheoryParams) return;
    
    const baseSet = setTheoryParams.baseSet || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const operation = setTheoryParams.operation || 'union';
    
    // Apply spectral transformations based on pitch class sets
    // Convert pitch classes to frequency ratios (using equal temperament)
    const frequencyRatios = baseSet.map(pc => Math.pow(2, pc / 12));
    
    // Apply harmonic structure to spectral envelope
    for (let i = 0; i < envelope.magnitudes.length; i++) {
      const normalized = i / envelope.magnitudes.length;
      const frequency = envelope.frequencies[i];
      
      // Check if this frequency is harmonically related to the pitch classes
      let harmonicRelationship = 0;
      for (const ratio of frequencyRatios) {
        // Calculate how closely this frequency matches a harmonic of the pitch class
        const octaveRatio = frequency / (440 * ratio); // Normalize to A4 = 440Hz
        const octaveLog = Math.log2(octaveRatio);
        const octaveDistance = Math.abs(octaveLog - Math.round(octaveLog));
        
        // Calculate influence based on harmonic proximity
        const influence = Math.exp(-octaveDistance * 10);
        harmonicRelationship = Math.max(harmonicRelationship, influence);
      }
      
      // Apply harmonic relationship to magnitude
      switch (operation) {
        case 'union':
          // Boost frequencies related to any pitch class
          envelope.magnitudes[i] *= (1 + harmonicRelationship);
          break;
        case 'intersection':
          // Only boost frequencies related to multiple pitch classes
          envelope.magnitudes[i] *= harmonicRelationship;
          break;
        case 'complement':
          // Invert the spectrum - boost frequencies not related to pitch classes
          envelope.magnitudes[i] *= (2 - harmonicRelationship);
          break;
      }
    }
  }
  
  /**
   * Apply sieve transformations to spectral envelope
   */
  private applySieveSpectralTransformation(
    envelope: SpectralEnvelope,
    structure: MathematicalStructure
  ): void {
    // Extract sieve parameters
    const sieveParams = structure.parameters?.sieve;
    if (!sieveParams) return;
    
    const moduli = sieveParams.moduli || [2, 3, 5];
    const residues = sieveParams.residues || [0, 1, 2];
    
    // Apply sieve filtering to spectrum
    for (let i = 0; i < envelope.magnitudes.length; i++) {
      // Check if this frequency bin passes through the sieve
      let passesFilter = false;
      
      for (let j = 0; j < moduli.length; j++) {
        const modulus = moduli[j];
        const residue = residues[j >= residues.length ? 0 : j]; // Use first residue if not enough
        
        // If the bin index modulo the modulus equals the residue, it passes
        if (i % modulus === residue) {
          passesFilter = true;
          break;
        }
      }
      
      // Apply filtering
      if (!passesFilter) {
        envelope.magnitudes[i] *= 0.2; // Attenuate frequencies that don't pass
      }
    }
  }
  
  /**
   * Apply game theory transformations to spectral envelope
   */
  private applyGameTheorySpectralTransformation(
    envelope: SpectralEnvelope,
    structure: MathematicalStructure
  ): void {
    // Extract game theory parameters
    const gameTheoryParams = structure.parameters?.gameTheory;
    if (!gameTheoryParams) return;
    
    const equilibriumWeight = gameTheoryParams.equilibriumWeight || 0.5;
    const randomization = gameTheoryParams.randomization || 0.3;
    
    // Apply game theory dynamics to spectral evolution
    // Divide spectrum into "players" (frequency bands)
    const numPlayers = 3; // Simplified for demonstration
    const bandSize = Math.floor(envelope.magnitudes.length / numPlayers);
    
    // Create spectral bands that compete/cooperate
    for (let player = 0; player < numPlayers; player++) {
      const startIdx = player * bandSize;
      const endIdx = (player + 1) * bandSize;
      
      // Calculate band energy
      let bandEnergy = 0;
      for (let i = startIdx; i < endIdx && i < envelope.magnitudes.length; i++) {
        bandEnergy += envelope.magnitudes[i];
      }
      
      // Apply game theory dynamics
      const equilibriumFactor = 0.5 + (Math.random() - 0.5) * randomization;
      const scaleFactor = equilibriumWeight * equilibriumFactor + (1 - equilibriumWeight);
      
      // Apply to band
      for (let i = startIdx; i < endIdx && i < envelope.magnitudes.length; i++) {
        envelope.magnitudes[i] *= scaleFactor;
      }
    }
  }
  
  /**
   * Translate between natural language descriptions and parameters
   */
  translateSemanticDescription(
    description: string,
    context: SemanticContext
  ): {
    mathematicalStructure: MathematicalStructure,
    audioLDMParams: AudioLDMParams
  } {
    // Find the appropriate mapping profile with semantic interpretation
    let profile = this.mappingProfiles.get('semantic');
    
    // Fall back to standard if semantic profile not found
    if (!profile || !profile.semanticInterpretation) {
      profile = this.mappingProfiles.get(this.defaultProfile)!;
    }
    
    // Create base parameters
    const audioLDMParams: AudioLDMParams = {
      prompt: description,
      duration: 5,
      guidance_scale: 7.5
    };
    
    // Create base mathematical structure
    const mathematicalStructure: MathematicalStructure = {
      type: 'stochastic', // Default type
      parameters: {
        stochastic: {
          distributionType: 'poisson',
          density: 0.5,
          randomness: 0.3
        }
      },
      timeEvolution: {
        density: [0.5],
        randomness: [0.3]
      }
    };
    
    // If we have semantic interpretation, use it
    if (profile.semanticInterpretation) {
      const semantic = profile.semanticInterpretation;
      
      // Process each category
      for (const category of semantic.categories) {
        if (semantic.mappingFunctions[category]) {
          const mappingFunction = semantic.mappingFunctions[category];
          const params = mappingFunction(description, context);
          
          // Apply parameters
          for (const [key, value] of Object.entries(params)) {
            if (key.startsWith('prompt')) {
              audioLDMParams.prompt = value as string;
            } else {
              // Update mathematical structure parameters
              const parts = key.split('.');
              if (parts.length === 2) {
                const domain = parts[0];
                const param = parts[1];
                
                // Ensure domain exists in structure
                if (!mathematicalStructure.parameters) {
                  mathematicalStructure.parameters = {};
                }
                
                // Create domain if it doesn't exist
                if (!mathematicalStructure.parameters[domain]) {
                  mathematicalStructure.parameters[domain] = {};
                }
                
                // Set parameter
                (mathematicalStructure.parameters[domain] as any)[param] = value;
                
                // Update structure type if this is the main domain
                if (['stochastic', 'sieve', 'gameTheory', 'setTheory'].includes(domain)) {
                  mathematicalStructure.type = domain as any;
                }
              }
            }
          }
        }
      }
    }
    
    return {
      mathematicalStructure,
      audioLDMParams
    };
  }
  
  /**
   * Get a property from a nested object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Set a property in a nested object using dot notation
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}