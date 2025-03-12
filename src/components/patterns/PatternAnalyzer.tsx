import React, { useState } from 'react';
import { AudioAnalyzer } from '../../services/audio/AudioAnalyzer';
import { AudioAnalysisResult } from '../../types/AudioAnalysis';
import { CreatePatternOptions, PatternCategory, PatternLibrary } from '../../services/patterns/PatternLibrary';
import { SavePatternModal } from './SavePatternModal';
import './PatternAnalyzer.css';

interface PatternAnalyzerProps {
  audioEngine: any; // Replace with proper AudioEngine type once available
  onAnalysisComplete: (analysis: AudioAnalysisResult) => void;
}

export const PatternAnalyzer: React.FC<PatternAnalyzerProps> = ({
  audioEngine,
  onAnalysisComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const audioAnalyzer = new AudioAnalyzer();
  const patternLibrary = new PatternLibrary();

  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setCurrentStage('Initializing analysis');

    try {
      // Get current audio from engine
      const audioData = audioEngine.getCurrentAudio();

      // Progress callback
      const updateProgress = (percentage: number, stage: string) => {
        setProgress(percentage);
        setCurrentStage(stage);
      };

      // Run analysis
      const result = await audioAnalyzer.analyzeAudio(audioData, updateProgress);

      // Set result
      setAnalysisResult(result);

      // Notify parent
      onAnalysisComplete(result);

    } catch (error) {
      console.error('Error analyzing audio:', error);

      // Show error message
      setCurrentStage('Analysis failed. Please try again.');

    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveClick = () => {
    setIsSaveModalOpen(true);
  };

  const handleSavePattern = async (options: {
    name: string;
    description: string;
    category: PatternCategory;
    tags: string[];
  }) => {
    if (!analysisResult) return;

    try {
      // Create pattern options
      const patternOptions: CreatePatternOptions = {
        name: options.name,
        description: options.description,
        category: options.category,
        tags: options.tags,
        spectralAnalysis: analysisResult.spectromorphAnalysis,
        parameters: analysisResult.parameters,
        waveform: analysisResult.waveform
      };

      // Save pattern
      await patternLibrary.savePattern(patternOptions);

      // Close modal
      setIsSaveModalOpen(false);

      // Reset analysis result
      setAnalysisResult(null);

    } catch (error) {
      console.error('Error saving pattern:', error);
    }
  };

  return (
    <div className="pattern-analyzer">
      <div className="analyzer-header">
        <h2>Pattern Analyzer</h2>
        <div className="analyzer-controls">
          <button
            className="analyze-button"
            onClick={handleAnalyzeClick}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Current Audio'}
          </button>

          {analysisResult && (
            <button
              className="save-button"
              onClick={handleSaveClick}
            >
              Save as Pattern
            </button>
          )}
        </div>
      </div>

      {isAnalyzing && (
        <div className="analysis-progress">
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-stage">{currentStage}</div>
        </div>
      )}

      {analysisResult && !isAnalyzing && (
        <div className="analysis-result">
          <div className="result-section">
            <h3>Spectral Characteristics</h3>
            <div className="result-grid">
              <div className="result-item">
                <span className="result-label">Spectral Motion:</span>
                <span className="result-value">
                  {analysisResult.spectromorphAnalysis.spectralMotion.type}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Typology:</span>
                <span className="result-value">
                  {analysisResult.spectromorphAnalysis.spectralTypology.type}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Morphological Phase:</span>
                <span className="result-value">
                  {analysisResult.spectromorphAnalysis.morphologicalModel.phase}
                </span>
              </div>
            </div>
          </div>

          <div className="result-section">
            <h3>Dominant Parameters</h3>
            <div className="parameters-list">
              {Object.entries(analysisResult.parameters)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([key, value]) => (
                  <div key={key} className="parameter-item">
                    <div className="parameter-label">
                      {key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </div>
                    <div className="parameter-value-container">
                      <div
                        className="parameter-value-bar"
                        style={{ width: `${value * 100}%` }}
                      />
                      <span className="parameter-value">{value.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="result-section">
            <h3>Waveform</h3>
            <div className="waveform-preview">
              {analysisResult.waveform.map((value, index) => (
                <div
                  key={index}
                  className="waveform-bar"
                  style={{ height: `${value * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {isSaveModalOpen && analysisResult && (
        <SavePatternModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSavePattern}
          suggestedCategory={getSuggestedCategory(analysisResult)}
          suggestedTags={getSuggestedTags(analysisResult)}
        />
      )}
    </div>
  );
};

// Helper functions for suggested categories and tags
function getSuggestedCategory(analysisResult: AudioAnalysisResult): PatternCategory {
  const { spectromorphAnalysis } = analysisResult;

  // Determine category based on spectral characteristics
  if (spectromorphAnalysis.spectralTypology.type === 'noise') {
    return 'textural';
  } else if (spectromorphAnalysis.spectralTypology.type === 'note') {
    return 'harmonic';
  } else if (spectromorphAnalysis.spectralMotion.type === 'oscillation' ||
             spectromorphAnalysis.spectralMotion.type === 'iteration') {
    return 'rhythmic';
  } else if (spectromorphAnalysis.morphologicalModel.complexity > 0.7) {
    return 'spectral';
  } else if (spectromorphAnalysis.temporalGesture.streaming > 0.7) {
    return 'atmospheric';
  } else if (spectromorphAnalysis.spectralMotion.intensity > 0.7) {
    return 'granular';
  } else {
    return 'stochastic';
  }
}

function getSuggestedTags(analysisResult: AudioAnalysisResult): string[] {
  const tags: string[] = [];
  const { spectromorphAnalysis } = analysisResult;

  // Add tags based on spectral motion
  tags.push(spectromorphAnalysis.spectralMotion.type);

  // Add tags based on typology
  tags.push(spectromorphAnalysis.spectralTypology.type);

  // Add tags based on morphological model
  tags.push(spectromorphAnalysis.morphologicalModel.phase);

  // Add intensity-based tags
  if (spectromorphAnalysis.spectralMotion.intensity > 0.7) {
    tags.push('intense');
  } else if (spectromorphAnalysis.spectralMotion.intensity < 0.3) {
    tags.push('subtle');
  }

  // Add complexity-based tags
  if (spectromorphAnalysis.morphologicalModel.complexity > 0.7) {
    tags.push('complex');
  } else if (spectromorphAnalysis.morphologicalModel.complexity < 0.3) {
    tags.push('simple');
  }

  return tags;
}
