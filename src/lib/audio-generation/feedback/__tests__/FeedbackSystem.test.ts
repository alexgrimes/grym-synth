import { FeedbackController } from '../FeedbackController';
import { XenakisToAudioLDMMapper } from '../XenakisToAudioLDMMapper';
import { XenakisLDMWithFeedback } from '../XenakisLDMWithFeedback';
import { MathematicalStructure } from '../../types';
import { XenakisLDMParams } from '../../xenakisldm-client';

// Mock dependencies
jest.mock('../../math');
jest.mock('../../../monitoring/GrymSynthHealthMonitor');
jest.mock('../../../../services/audio/AudioAnalyzer');

describe('Bidirectional Feedback System', () => {
  // Test FeedbackController
  describe('FeedbackController', () => {
    let feedbackController: FeedbackController;
    let mockStructure: MathematicalStructure;
    let mockParams: XenakisLDMParams;
    let mockAnalysis: any;
    
    beforeEach(() => {
      feedbackController = new FeedbackController({
        maxIterations: 3,
        convergenceThreshold: 0.05
      });
      
      // Create mock mathematical structure
      mockStructure = {
        type: 'stochastic',
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
      
      // Create mock params
      mockParams = {
        prompt: 'Test prompt',
        stochastic: {
          distributionType: 'poisson',
          density: 0.5,
          randomness: 0.3
        }
      };
      
      // Create mock analysis result
      mockAnalysis = {
        spectromorphAnalysis: {
          spectralFeatures: {
            centroid: 2000,
            spread: 1000,
            flatness: 0.5
          },
          morphologicalModel: {
            phase: 'continuant',
            energy: 0.6,
            complexity: 0.4
          },
          temporalGesture: {
            streaming: 0.5,
            flocking: 0.6,
            turbulence: 0.3
          },
          spectralMotion: {
            type: 'linear',
            intensity: 0.5,
            rate: 0.4
          },
          spectralTypology: {
            type: 'node',
            position: 0.5,
            stability: 0.6
          }
        },
        dominantFrequencies: [200, 400, 800],
        parameters: {},
        waveform: [],
        duration: 5,
        peakAmplitude: 0.8,
        rms: 0.4
      };
    });
    
    test('should process feedback and return appropriate result', () => {
      // Test initial feedback
      const deviations = [0.2, 0.15, 0.1, 0.05];
      const result1 = feedbackController.processFeedback(
        deviations, mockStructure, mockParams, mockAnalysis
      );
      
      // First iteration should continue
      expect(result1.status).toBe('continuing');
      expect(result1.adjustments).toBeTruthy();
      
      // Reset for clear test
      feedbackController.reset();
      
      // Test convergence
      const smallDeviations = [0.03, 0.02, 0.01, 0.04];
      const result2 = feedbackController.processFeedback(
        smallDeviations, mockStructure, mockParams, mockAnalysis
      );
      
      // Should converge with small deviations
      expect(result2.status).toBe('converged');
      expect(result2.adjustments).toBeNull();
      
      // Reset for clear test
      feedbackController.reset();
      
      // Test max iterations
      feedbackController.processFeedback(deviations, mockStructure, mockParams, mockAnalysis);
      feedbackController.processFeedback(deviations, mockStructure, mockParams, mockAnalysis);
      const result3 = feedbackController.processFeedback(deviations, mockStructure, mockParams, mockAnalysis);
      
      // Should terminate after max iterations
      expect(result3.status).toBe('terminated');
      expect(result3.reason).toBe('max_iterations_reached');
    });
    
    test('should calculate appropriate parameter adjustments', () => {
      const deviations = [0.2, 0.15, 0.1, 0.05];
      const result = feedbackController.processFeedback(
        deviations, mockStructure, mockParams, mockAnalysis
      );
      
      // Should produce parameter adjustments
      expect(result.adjustments).toBeTruthy();
      
      // With stochastic structure, should adjust density and randomness
      if (result.adjustments) {
        expect(result.adjustments['stochastic.density']).toBeDefined();
        expect(result.adjustments['stochastic.randomness']).toBeDefined();
      }
    });
    
    test('should reset state correctly', () => {
      // Process feedback to change state
      feedbackController.processFeedback(
        [0.2, 0.15], mockStructure, mockParams, mockAnalysis
      );
      
      // Get state and verify it changed
      const state1 = feedbackController.getFeedbackState();
      expect(state1.iterations).toBe(1);
      
      // Reset state
      feedbackController.reset();
      
      // Verify reset worked
      const state2 = feedbackController.getFeedbackState();
      expect(state2.iterations).toBe(0);
      expect(state2.deviationHistory).toHaveLength(0);
    });
  });
  
  // Brief tests for the mapper
  describe('XenakisToAudioLDMMapper', () => {
    let mapper: XenakisToAudioLDMMapper;
    let mockMathLayer: any;
    let mockAudioAnalyzer: any;
    let mockStructure: MathematicalStructure;
    
    beforeEach(() => {
      mockMathLayer = {
        combineGenerators: jest.fn(),
        initialize: jest.fn().mockResolvedValue(undefined)
      };
      
      mockAudioAnalyzer = {
        analyzeAudio: jest.fn().mockResolvedValue({
          spectromorphAnalysis: {
            spectralFeatures: {
              centroid: 2000,
              spread: 1000,
              flatness: 0.5
            }
          }
        })
      };
      
      mapper = new XenakisToAudioLDMMapper(
        mockMathLayer as any,
        mockAudioAnalyzer as any
      );
      
      mockStructure = {
        type: 'stochastic',
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
    });
    
    test('should map mathematical structure to AudioLDM parameters', () => {
      const baseParams = {
        prompt: 'Test prompt',
        duration: 5
      };
      
      const result = mapper.mapToAudioLDMParams(mockStructure, baseParams);
      
      // Should enhance prompt with structure descriptors
      expect(result.prompt).toContain('Test prompt');
      expect(result.prompt).toContain('stochastic');
    });
  });
});