import React, { useState, useEffect } from 'react';
import { AudioPattern, PatternFeedback } from '../types/audio';
import { PatternVisualizationLayer } from './visualization/PatternVisualizationLayer';
import { PatternCorrectionPanel } from './feedback/PatternCorrectionPanel';
import { ConfidenceThresholdControl } from './controls/ConfidenceThresholdControl';
import { PatternEvolutionView } from './visualization/PatternEvolutionView';
import { PatternRepository } from '../services/storage/PatternRepository';
import { PatternFeedbackService } from '../services/feedback/PatternFeedbackService';
import { HealthMonitor } from '../services/monitoring/HealthMonitor';

interface AudioPatternAnalyzerProps {
  audioUrl: string;
  audioBuffer: AudioBuffer;
  patternRepository: PatternRepository;
  feedbackService: PatternFeedbackService;
  healthMonitor: HealthMonitor;
  onAnalysisComplete?: (patterns: AudioPattern[]) => void;
}

export const AudioPatternAnalyzer: React.FC<AudioPatternAnalyzerProps> = ({
  audioUrl,
  audioBuffer,
  patternRepository,
  feedbackService,
  healthMonitor,
  onAnalysisComplete
}) => {
  // State
  const [patterns, setPatterns] = useState<AudioPattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [isEditingPattern, setIsEditingPattern] = useState<boolean>(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);
  const [showLowConfidencePatterns, setShowLowConfidencePatterns] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showingEvolution, setShowingEvolution] = useState<boolean>(false);
  const [patternVersions, setPatternVersions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Available pattern types
  const patternTypes = [
    'harmonic',
    'percussive',
    'melodic',
    'speech',
    'noise',
    'ambient',
    'tonal',
    'transient'
  ];
  
  // Calculate effective confidence threshold
  const effectiveThreshold = showLowConfidencePatterns ? 0.1 : confidenceThreshold;
  
  // Load patterns when component mounts or audioUrl changes
  useEffect(() => {
    loadPatterns();
  }, [audioUrl]);
  
  // Load patterns from repository
  const loadPatterns = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      const loadedPatterns = await patternRepository.queryPatterns({
        sourceId: audioUrl,
        sortBy: 'startTime',
        sortDirection: 'asc'
      });
      
      setPatterns(loadedPatterns);
      
      healthMonitor.recordMetric('analyzer.patterns.loaded', {
        count: loadedPatterns.length,
        audioUrl
      });
      
      if (onAnalysisComplete) {
        onAnalysisComplete(loadedPatterns);
      }
    } catch (error) {
      const message = `Failed to load patterns: ${error instanceof Error ? error.message : String(error)}`;
      setError(message);
      
      healthMonitor.recordMetric('analyzer.patterns.load_error', {
        audioUrl,
        error: String(error)
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Handle pattern selection
  const handlePatternClick = (pattern: AudioPattern) => {
    setSelectedPatternId(pattern.id);
    setIsEditingPattern(false);
    setShowingEvolution(false);
    
    healthMonitor.recordMetric('analyzer.pattern.selected', {
      patternId: pattern.id,
      patternType: pattern.type,
      confidence: pattern.confidence
    });
  };
  
  // Start editing a pattern
  const handleEditPattern = () => {
    setIsEditingPattern(true);
    setShowingEvolution(false);
  };
  
  // Show pattern evolution history
  const handleShowEvolution = async () => {
    if (!selectedPatternId) return;
    
    setIsEditingPattern(false);
    setShowingEvolution(true);
    
    // Load pattern versions (mock data for now)
    // In a real implementation, this would come from your pattern history storage
    const selectedPattern = patterns.find(p => p.id === selectedPatternId);
    if (!selectedPattern) return;
    
    const mockVersions = [
      {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        pattern: { ...selectedPattern, confidence: 0.6 },
        source: 'ai',
        notes: 'Initial detection'
      },
      {
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        pattern: { ...selectedPattern, confidence: 0.7, type: 'percussive' },
        source: 'system',
        notes: 'Updated based on similar patterns'
      },
      {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        pattern: selectedPattern,
        source: 'user',
        notes: 'User correction'
      }
    ];
    
    setPatternVersions(mockVersions);
  };
  
  // Save pattern corrections
  const handleSaveCorrections = async (updatedPattern: AudioPattern) => {
    try {
      await patternRepository.updatePattern(updatedPattern.id, updatedPattern);
      
      // Create feedback object from changes
      const originalPattern = patterns.find(p => p.id === updatedPattern.id);
      if (!originalPattern) throw new Error('Original pattern not found');
      
      const feedback: PatternFeedback = {
        isCorrect: false,
        correctedType: updatedPattern.type !== originalPattern.type ? updatedPattern.type : undefined,
        correctedTimeRange: 
          updatedPattern.startTime !== originalPattern.startTime || 
          updatedPattern.endTime !== originalPattern.endTime
            ? { 
                start: updatedPattern.startTime, 
                end: updatedPattern.endTime 
              }
            : undefined,
        correctedFrequencyRange:
          updatedPattern.frequencyRange.low !== originalPattern.frequencyRange.low ||
          updatedPattern.frequencyRange.high !== originalPattern.frequencyRange.high
            ? {
                low: updatedPattern.frequencyRange.low,
                high: updatedPattern.frequencyRange.high
              }
            : undefined,
        userConfidence: updatedPattern.confidence,
        affectSimilarPatterns: true
      };
      
      // Submit feedback
      await feedbackService.submitFeedback(updatedPattern.id, feedback);
      
      // Update local state
      setPatterns(prevPatterns => 
        prevPatterns.map(p => 
          p.id === updatedPattern.id ? updatedPattern : p
        )
      );
      
      // Exit editing mode
      setIsEditingPattern(false);
      
      healthMonitor.recordMetric('analyzer.pattern.updated', {
        patternId: updatedPattern.id,
        oldType: originalPattern.type,
        newType: updatedPattern.type
      });
    } catch (error) {
      healthMonitor.recordMetric('analyzer.pattern.update_error', {
        patternId: updatedPattern.id,
        error: String(error)
      });
      
      throw error;
    }
  };
  
  // Calculate visualization dimensions based on container
  const visualizationWidth = 800;
  const visualizationHeight = 300;
  
  // Calculate time and frequency ranges
  const timeRange: [number, number] = [0, audioBuffer.duration];
  const frequencyRange: [number, number] = [20, 20000]; // Hz
  
  // Get selected pattern
  const selectedPattern = selectedPatternId 
    ? patterns.find(p => p.id === selectedPatternId)
    : null;
  
  return (
    <div className="audio-pattern-analyzer bg-gray-100 p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Main visualization container */}
      <div className="visualization-container bg-white rounded-lg shadow-md p-4 mb-6">
        <div 
          className="visualization-area relative"
          style={{ 
            width: visualizationWidth, 
            height: visualizationHeight
          }}
        >
          {/* This would contain your waveform/spectrogram visualization component */}
          <div className="spectrogram-placeholder absolute inset-0 bg-gray-900" />
          
          {/* Pattern visualization layer */}
          <PatternVisualizationLayer
            patterns={patterns}
            width={visualizationWidth}
            height={visualizationHeight}
            timeRange={timeRange}
            frequencyRange={frequencyRange}
            selectedPatternId={selectedPatternId || undefined}
            confidenceThreshold={effectiveThreshold}
            onPatternClick={handlePatternClick}
            healthMonitor={healthMonitor}
          />
        </div>
        
        {/* Controls for confidence threshold */}
        <ConfidenceThresholdControl
          confidenceThreshold={confidenceThreshold}
          onConfidenceThresholdChange={setConfidenceThreshold}
          showLowConfidencePatterns={showLowConfidencePatterns}
          onShowLowConfidencePatternsChange={setShowLowConfidencePatterns}
        />
      </div>
      
      {/* Pattern details and editing */}
      {selectedPattern && (
        <div className="pattern-details bg-white rounded-lg shadow-md p-4">
          {!isEditingPattern && !showingEvolution && (
            <div className="selected-pattern-info">
              <h3 className="text-lg font-semibold mb-4">Selected Pattern</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm"><strong>Type:</strong> {selectedPattern.type}</p>
                  <p className="text-sm">
                    <strong>Time Range:</strong> {selectedPattern.startTime.toFixed(2)}s - {selectedPattern.endTime.toFixed(2)}s
                  </p>
                </div>
                <div>
                  <p className="text-sm">
                    <strong>Frequency Range:</strong> {selectedPattern.frequencyRange.low}Hz - {selectedPattern.frequencyRange.high}Hz
                  </p>
                  <p className="text-sm">
                    <strong>Confidence:</strong> {(selectedPattern.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleEditPattern}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit Pattern
                </button>
                <button
                  onClick={handleShowEvolution}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Show Evolution
                </button>
              </div>
            </div>
          )}
          
          {selectedPattern && isEditingPattern && (
            <PatternCorrectionPanel
              pattern={selectedPattern}
              onSaveCorrections={handleSaveCorrections}
              onCancel={() => setIsEditingPattern(false)}
              availablePatternTypes={patternTypes}
            />
          )}
          
          {selectedPattern && showingEvolution && (
            <PatternEvolutionView
              patternId={selectedPattern.id}
              patternVersions={patternVersions}
              width={visualizationWidth}
              height={200}
              onVersionSelect={(version) => console.log('Selected version:', version)}
            />
          )}
        </div>
      )}
      
      {!selectedPattern && !isAnalyzing && (
        <div className="bg-white rounded-lg shadow-md p-4 text-center text-gray-600">
          <p>Select a pattern to view details and provide feedback.</p>
        </div>
      )}
      
      {isAnalyzing && (
        <div className="bg-white rounded-lg shadow-md p-4 text-center text-gray-600">
          <p>Analyzing audio patterns...</p>
        </div>
      )}
    </div>
  );
};