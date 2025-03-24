import React, { useState, useEffect, useCallback } from 'react';
import { FeedbackVisualizationPanel } from './FeedbackVisualizationPanel';
import { FeedbackController, FeedbackResult, FeedbackState } from '../../lib/audio-generation/feedback/FeedbackController';
import { XenakisLDMClient, XenakisLDMParams } from '../../lib/audio-generation/xenakisldm-client';
import { XenakisLDMWithFeedback, FeedbackEnhancedProgress } from '../../lib/audio-generation/feedback/XenakisLDMWithFeedback';
import { MathematicalStructure } from '../../lib/audio-generation/types';
import { AudioAnalyzer } from '../../services/audio/AudioAnalyzer';
import { XenakisToAudioLDMMapper } from '../../lib/audio-generation/feedback/XenakisToAudioLDMMapper';

import './FeedbackVisualizationDemo.css';

// Mock necessary services for the demo
const mockServices = {
  createXenakisLDMClient: () => {
    return {
      generateAudio: async (params: any, onProgress?: any) => {
        // Simulate generation process with progress
        if (onProgress) {
          for (let i = 0; i <= 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            onProgress({
              percentComplete: i * 10,
              step: i,
              totalSteps: 10,
              message: `Generating audio (${i}/10)...`
            });
          }
        }
        
        // Return simulated result
        return {
          audioData: new Float32Array(44100 * 5), // 5 seconds of audio
          duration: 5,
          processingTime: 2500,
          mathematicalStructure: {
            type: params.structureType || 'stochastic',
            parameters: params,
            structures: {
              primary: {
                type: params.structureType || 'stochastic',
                values: Array(100).fill(0).map(() => Math.random())
              }
            }
          }
        };
      },
      getMathIntegrationLayer: () => ({
        generateStructure: async () => ({
          type: 'stochastic',
          parameters: {},
          structures: {}
        })
      })
    } as unknown as XenakisLDMClient;
  },
  
  createAudioAnalyzer: () => {
    return {
      analyzeAudio: async (audioBuffer: any, onProgress?: any) => {
        // Simulate analysis process with progress
        if (onProgress) {
          for (let i = 0; i <= 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            onProgress(i / 10, i === 10 ? 'complete' : 'processing');
          }
        }
        
        // Return simulated analysis result
        return {
          dominantFrequencies: [440, 880, 1320],
          spectromorphAnalysis: {
            spectralFeatures: {
              centroid: 2500 + Math.random() * 1000,
              spread: 800 + Math.random() * 500,
              flatness: 0.4 + Math.random() * 0.3,
              flux: 0.2 + Math.random() * 0.2
            },
            morphologicalModel: {
              energy: 0.5 + Math.random() * 0.3,
              complexity: 0.4 + Math.random() * 0.4,
              density: 0.3 + Math.random() * 0.5
            },
            temporalGesture: {
              streaming: 0.4 + Math.random() * 0.4,
              flocking: 0.3 + Math.random() * 0.5,
              turbulence: 0.2 + Math.random() * 0.6
            }
          }
        };
      }
    } as unknown as AudioAnalyzer;
  }
};

// Demo component for the feedback visualization system
const FeedbackVisualizationDemo: React.FC = () => {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({
    iterations: 0,
    deviationHistory: [],
    parameterHistory: [],
    llmInterventions: [],
    currentStatus: 'initial'
  });
  
  const [params, setParams] = useState<XenakisLDMParams>({
    structureType: 'stochastic',
    stochastic: {
      distribution: 'poisson',
      density: 0.5,
      randomness: 0.3
    },
    gameTheory: {
      iterations: 10,
      equilibriumWeight: 0.5,
      randomization: 0.3
    },
    granular: {
      density: 0.5,
      grainSize: 50
    }
  });
  
  const [currentStructure, setCurrentStructure] = useState<MathematicalStructure>({
    type: 'stochastic',
    parameters: params,
    structures: {}
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<FeedbackEnhancedProgress | null>(null);
  const [latestResult, setLatestResult] = useState<FeedbackResult | null>(null);
  const [feedbackSystem, setFeedbackSystem] = useState<XenakisLDMWithFeedback | null>(null);
  const [selectedStructureType, setSelectedStructureType] = useState('stochastic');
  const [enableAutoFeedback, setEnableAutoFeedback] = useState(true);
  const [enableLLMReasoning, setEnableLLMReasoning] = useState(false);
  const [maxIterations, setMaxIterations] = useState(3);
  
  // Initialize feedback system on component mount
  useEffect(() => {
    const xenakisClient = mockServices.createXenakisLDMClient();
    const audioAnalyzer = mockServices.createAudioAnalyzer();
    
    const system = new XenakisLDMWithFeedback(
      xenakisClient,
      audioAnalyzer,
      {
        maxFeedbackIterations: maxIterations,
        enableAutomaticFeedback: enableAutoFeedback,
        enableLLMReasoning: enableLLMReasoning,
        visualizeFeedbackProcess: true
      }
    );
    
    // Listen for feedback events
    system.on('feedback', (data: any) => {
      setLatestResult(data.feedbackResult);
      setFeedbackState(system.getFeedbackController().getFeedbackState());
    });
    
    setFeedbackSystem(system);
    
    return () => {
      // Clean up event listeners
      system.removeAllListeners();
    };
  }, [maxIterations, enableAutoFeedback, enableLLMReasoning]);
  
  // Update system configuration when settings change
  useEffect(() => {
    if (feedbackSystem) {
      feedbackSystem.updateConfig({
        maxFeedbackIterations: maxIterations,
        enableAutomaticFeedback: enableAutoFeedback,
        enableLLMReasoning: enableLLMReasoning
      });
    }
  }, [feedbackSystem, maxIterations, enableAutoFeedback, enableLLMReasoning]);
  
  // Update parameters based on structure type selection
  useEffect(() => {
    const newParams = { ...params, structureType: selectedStructureType };
    setParams(newParams);
    
    setCurrentStructure({
      type: selectedStructureType,
      parameters: newParams,
      structures: {}
    });
  }, [selectedStructureType]);
  
  // Handle audio generation with feedback
  const generateAudio = useCallback(async () => {
    if (!feedbackSystem || isGenerating) return;
    
    setIsGenerating(true);
    try {
      await feedbackSystem.generateAudioWithFeedback(params, (progress) => {
        setGenerationProgress(progress);
      });
      
      // Update feedback state after generation
      setFeedbackState(feedbackSystem.getFeedbackController().getFeedbackState());
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [feedbackSystem, params, isGenerating]);
  
  // Simulate a manual feedback cycle
  const simulateFeedbackCycle = useCallback(() => {
    if (!feedbackSystem) return;
    
    // Create simulated controller if needed
    const controller = feedbackSystem.getFeedbackController();
    
    // Create simulated structure and analysis
    const structure: MathematicalStructure = {
      type: selectedStructureType,
      parameters: params,
      structures: {
        primary: {
          type: selectedStructureType,
          values: Array(100).fill(0).map(() => Math.random())
        }
      }
    };
    
    // Simulate deviations to process
    const deviations = [
      0.3 + Math.random() * 0.3,
      0.2 + Math.random() * 0.2,
      0.1 + Math.random() * 0.4,
      0.15 + Math.random() * 0.25
    ];
    
    // Generate simulated audio analysis
    const analysis = {
      dominantFrequencies: [440, 880, 1320],
      spectromorphAnalysis: {
        spectralFeatures: {
          centroid: 2500 + Math.random() * 1000,
          spread: 800 + Math.random() * 500,
          flatness: 0.4 + Math.random() * 0.3,
          flux: 0.2 + Math.random() * 0.2
        },
        morphologicalModel: {
          energy: 0.5 + Math.random() * 0.3,
          complexity: 0.4 + Math.random() * 0.4,
          density: 0.3 + Math.random() * 0.5
        },
        temporalGesture: {
          streaming: 0.4 + Math.random() * 0.4,
          flocking: 0.3 + Math.random() * 0.5,
          turbulence: 0.2 + Math.random() * 0.6
        }
      }
    };
    
    // Process feedback and update state
    const result = controller.processFeedback(deviations, structure, params, analysis);
    setLatestResult(result);
    
    // If adjustments were suggested, apply them
    if (result.adjustments) {
      const newParams = { ...params };
      
      for (const [param, adjustment] of Object.entries(result.adjustments)) {
        // Handle nested params
        const parts = param.split('.');
        if (parts.length === 2) {
          const domain = parts[0] as keyof XenakisLDMParams;
          const parameter = parts[1];
          
          // Ensure domain exists
          if (!newParams[domain]) {
            newParams[domain] = {};
          }
          
          const domainParams = newParams[domain] as Record<string, any>;
          
          // Apply adjustment
          const currentValue = domainParams[parameter] || 0;
          domainParams[parameter] = Math.max(0, Math.min(1, currentValue + adjustment));
        }
      }
      
      setParams(newParams);
    }
    
    // Update feedback state
    setFeedbackState(controller.getFeedbackState());
    
    // Simulate LLM intervention if enabled
    if (enableLLMReasoning && Math.random() > 0.5) {
      // Add simulated LLM intervention
      const llmInterventions = [...feedbackState.llmInterventions];
      llmInterventions.push({
        iteration: controller.getFeedbackState().iterations,
        decision: {
          action: Math.random() > 0.3 ? 'continue' : 'adjust',
          reasoning: 'I analyzed the audio output and determined that the parameters need adjustment to better match the intended timbral characteristics.',
          adjustedParams: { ...params },
          suggestedIterations: 2
        },
        timestamp: Date.now()
      });
      
      setFeedbackState(prevState => ({
        ...prevState,
        llmInterventions
      }));
    }
  }, [feedbackSystem, params, selectedStructureType, enableLLMReasoning, feedbackState.llmInterventions]);
  
  // Handle manual parameter adjustments
  const handleAdjustmentApply = useCallback((adjustments: Record<string, number>) => {
    const newParams = { ...params };
    
    for (const [param, adjustment] of Object.entries(adjustments)) {
      // Handle nested params
      const parts = param.split('.');
      if (parts.length === 2) {
        const domain = parts[0] as keyof XenakisLDMParams;
        const parameter = parts[1];
        
        // Ensure domain exists
        if (!newParams[domain]) {
          newParams[domain] = {};
        }
        
        const domainParams = newParams[domain] as Record<string, any>;
        
        // Apply adjustment
        const currentValue = domainParams[parameter] || 0;
        domainParams[parameter] = Math.max(0, Math.min(1, currentValue + adjustment));
      }
    }
    
    setParams(newParams);
    
    // Add to parameter history
    setFeedbackState(prevState => ({
      ...prevState,
      parameterHistory: [...prevState.parameterHistory, newParams]
    }));
  }, [params]);
  
  // Reset feedback controller state
  const handleFeedbackReset = useCallback(() => {
    if (!feedbackSystem) return;
    
    feedbackSystem.getFeedbackController().reset();
    setFeedbackState({
      iterations: 0,
      deviationHistory: [],
      parameterHistory: [],
      llmInterventions: [],
      currentStatus: 'initial'
    });
    setLatestResult(null);
  }, [feedbackSystem]);
  
  // Render UI controls
  const renderControls = () => (
    <div className="feedback-demo-controls">
      <div className="control-section">
        <h3>Structure Type</h3>
        <select 
          value={selectedStructureType}
          onChange={(e) => setSelectedStructureType(e.target.value)}
          disabled={isGenerating}
        >
          <option value="stochastic">Stochastic Process</option>
          <option value="gameTheory">Game Theory</option>
          <option value="setTheory">Set Theory</option>
          <option value="sieve">Sieve Theory</option>
        </select>
      </div>
      
      <div className="control-section">
        <h3>Feedback Settings</h3>
        
        <label>
          <input 
            type="checkbox" 
            checked={enableAutoFeedback}
            onChange={(e) => setEnableAutoFeedback(e.target.checked)}
            disabled={isGenerating}
          />
          Enable Automatic Feedback
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={enableLLMReasoning}
            onChange={(e) => setEnableLLMReasoning(e.target.checked)}
            disabled={isGenerating}
          />
          Enable LLM Reasoning
        </label>
        
        <div className="numeric-control">
          <label>Max Iterations:</label>
          <input 
            type="number" 
            min={1} 
            max={10} 
            value={maxIterations}
            onChange={(e) => setMaxIterations(parseInt(e.target.value) || 3)}
            disabled={isGenerating}
          />
        </div>
      </div>
      
      <div className="control-section">
        <h3>Actions</h3>
        
        <button 
          onClick={generateAudio}
          disabled={isGenerating || !feedbackSystem}
          className="primary-btn"
        >
          {isGenerating ? 'Generating...' : 'Generate with Feedback'}
        </button>
        
        <button 
          onClick={simulateFeedbackCycle}
          disabled={isGenerating || !feedbackSystem}
          className="secondary-btn"
        >
          Simulate Feedback Cycle
        </button>
        
        <button 
          onClick={handleFeedbackReset}
          disabled={isGenerating || !feedbackSystem}
          className="reset-btn"
        >
          Reset Feedback
        </button>
      </div>
      
      {generationProgress && (
        <div className="progress-section">
          <h3>Generation Progress</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${generationProgress.percentComplete}%` }}
            ></div>
          </div>
          <div className="progress-info">
            <p>Stage: {generationProgress.processingStage || 'initializing'}</p>
            <p>Iteration: {generationProgress.feedbackIteration !== undefined ? 
              generationProgress.feedbackIteration : 'N/A'}</p>
            <p>Status: {generationProgress.feedbackStatus || 'pending'}</p>
          </div>
        </div>
      )}
    </div>
  );
  
  // Render parameters editor
  const renderParameterEditor = () => {
    // Helper function to render parameters for a specific domain
    const renderDomainParams = (domain: string, paramObject: Record<string, any>) => (
      <div className="param-domain">
        <h4>{domain}</h4>
        {Object.entries(paramObject).map(([key, value]) => (
          <div className="param-row" key={`${domain}-${key}`}>
            <label>{key}:</label>
            {typeof value === 'number' ? (
              <div className="param-slider">
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={value}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value);
                    const newParams = { ...params };
                    (newParams[domain as keyof XenakisLDMParams] as any)[key] = newValue;
                    setParams(newParams);
                  }}
                  disabled={isGenerating}
                />
                <span className="param-value">{value.toFixed(2)}</span>
              </div>
            ) : (
              <input 
                type="text"
                value={value as string}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const newParams = { ...params };
                  (newParams[domain as keyof XenakisLDMParams] as any)[key] = newValue;
                  setParams(newParams);
                }}
                disabled={isGenerating}
              />
            )}
          </div>
        ))}
      </div>
    );
    
    return (
      <div className="parameters-editor">
        <h3>XenakisLDM Parameters</h3>
        
        <div className="params-container">
          {params.stochastic && renderDomainParams('stochastic', params.stochastic)}
          {params.gameTheory && renderDomainParams('gameTheory', params.gameTheory)}
          {params.granular && renderDomainParams('granular', params.granular)}
          {params.setTheory && renderDomainParams('setTheory', params.setTheory)}
          {params.sieve && renderDomainParams('sieve', params.sieve)}
        </div>
      </div>
    );
  };
  
  return (
    <div className="feedback-visualization-demo">
      <div className="demo-layout">
        <div className="controls-panel">
          {renderControls()}
          {renderParameterEditor()}
        </div>
        
        <div className="visualization-panel">
          <FeedbackVisualizationPanel 
            feedbackState={feedbackState}
            onAdjustmentApply={handleAdjustmentApply}
            onFeedbackReset={handleFeedbackReset}
            width={800}
            height={600}
            showControls={true}
            latestResult={latestResult}
            currentStructure={currentStructure}
            originalParams={params}
            currentParams={params}
          />
        </div>
      </div>
    </div>
  );
};

export default FeedbackVisualizationDemo;