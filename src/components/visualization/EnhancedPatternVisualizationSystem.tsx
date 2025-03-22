import React, { useState, useEffect } from 'react';
import { InteractivePatternGraph } from './InteractivePatternGraph';
import { PatternSimilarityMatrix } from './PatternSimilarityMatrix';
import { EnhancedPatternEvolutionView } from './EnhancedPatternEvolutionView';
import { AudioPattern, PatternVersion } from '../../lib/types/audio';
import './EnhancedPatternVisualizationSystem.css';

interface EnhancedPatternVisualizationSystemProps {
  patterns: AudioPattern[];
  patternVersionsMap: Record<string, PatternVersion[]>;
  width?: number;
  height?: number;
  onPatternSelect?: (pattern: AudioPattern) => void;
  onVersionSelect?: (version: PatternVersion) => void;
}

type VisualizationView = 'graph' | 'matrix' | 'evolution' | 'all';

export const EnhancedPatternVisualizationSystem: React.FC<EnhancedPatternVisualizationSystemProps> = ({
  patterns,
  patternVersionsMap,
  width = 800,
  height = 600,
  onPatternSelect,
  onVersionSelect
}) => {
  const [selectedPatternId, setSelectedPatternId] = useState<string | undefined>();
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<VisualizationView>('all');
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.5);
  const [showSpectralChanges, setShowSpectralChanges] = useState<boolean>(true);
  const [colorScale, setColorScale] = useState<'viridis' | 'inferno' | 'magma' | 'plasma' | 'redblue'>('viridis');
  
  // Calculate dimensions for each view
  const calculateDimensions = () => {
    if (activeView === 'all') {
      // In "all" view, split the space between the components
      const graphWidth = width;
      const graphHeight = height * 0.4;
      
      const matrixWidth = width * 0.5;
      const matrixHeight = height * 0.6;
      
      const evolutionWidth = width * 0.5;
      const evolutionHeight = height * 0.6;
      
      return {
        graph: { width: graphWidth, height: graphHeight },
        matrix: { width: matrixWidth, height: matrixHeight },
        evolution: { width: evolutionWidth, height: evolutionHeight }
      };
    } else {
      // In focused views, use the full container size
      return {
        graph: { width, height },
        matrix: { width, height },
        evolution: { width, height }
      };
    }
  };
  
  const dimensions = calculateDimensions();
  
  // Handle pattern selection
  const handlePatternSelect = (pattern: AudioPattern) => {
    setSelectedPatternId(pattern.id);
    
    // Reset version selection
    setSelectedVersionId(undefined);
    
    // Call external handler if provided
    if (onPatternSelect) {
      onPatternSelect(pattern);
    }
  };
  
  // Handle version selection
  const handleVersionSelect = (version: PatternVersion) => {
    setSelectedVersionId(version.id);
    
    // Call external handler if provided
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };
  
  // Filter pattern versions based on selected pattern
  const selectedPatternVersions = selectedPatternId 
    ? patternVersionsMap[selectedPatternId] || []
    : [];
  
  return (
    <div className="enhanced-pattern-visualization-system">
      <div className="visualization-header">
        <h2>Pattern Visualization System</h2>
        
        <div className="view-controls">
          <div className="view-selector">
            <button 
              className={`view-button ${activeView === 'all' ? 'active' : ''}`}
              onClick={() => setActiveView('all')}
            >
              All Views
            </button>
            <button 
              className={`view-button ${activeView === 'graph' ? 'active' : ''}`}
              onClick={() => setActiveView('graph')}
            >
              Relationship Graph
            </button>
            <button 
              className={`view-button ${activeView === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveView('matrix')}
            >
              Similarity Matrix
            </button>
            <button 
              className={`view-button ${activeView === 'evolution' ? 'active' : ''}`}
              onClick={() => setActiveView('evolution')}
              disabled={!selectedPatternId || selectedPatternVersions.length === 0}
            >
              Evolution View
            </button>
          </div>
          
          <div className="global-controls">
            <div className="threshold-control">
              <label>Similarity Threshold:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              />
              <span>{(similarityThreshold * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="visualization-content">
        {/* Pattern Relationship Graph */}
        {(activeView === 'all' || activeView === 'graph') && (
          <div 
            className={`visualization-panel ${activeView === 'graph' ? 'full-size' : ''}`}
            style={activeView === 'all' ? { gridArea: 'graph' } : {}}
          >
            <div className="panel-header">
              <h3>Pattern Relationship Graph</h3>
              {activeView === 'all' && (
                <button 
                  className="expand-button"
                  onClick={() => setActiveView('graph')}
                >
                  Expand
                </button>
              )}
            </div>
            
            <InteractivePatternGraph
              patterns={patterns}
              width={dimensions.graph.width}
              height={dimensions.graph.height}
              onPatternSelect={handlePatternSelect}
              selectedPatternId={selectedPatternId}
              similarityThreshold={similarityThreshold}
            />
          </div>
        )}
        
        {/* Pattern Similarity Matrix */}
        {(activeView === 'all' || activeView === 'matrix') && (
          <div 
            className={`visualization-panel ${activeView === 'matrix' ? 'full-size' : ''}`}
            style={activeView === 'all' ? { gridArea: 'matrix' } : {}}
          >
            <div className="panel-header">
              <h3>Pattern Similarity Matrix</h3>
              {activeView === 'all' && (
                <button 
                  className="expand-button"
                  onClick={() => setActiveView('matrix')}
                >
                  Expand
                </button>
              )}
            </div>
            
            <PatternSimilarityMatrix
              patterns={patterns}
              width={dimensions.matrix.width}
              height={dimensions.matrix.height}
              onPatternSelect={handlePatternSelect}
              selectedPatternId={selectedPatternId}
              colorScale={colorScale}
            />
          </div>
        )}
        
        {/* Pattern Evolution View */}
        {(activeView === 'all' || activeView === 'evolution') && selectedPatternId && selectedPatternVersions.length > 0 && (
          <div 
            className={`visualization-panel ${activeView === 'evolution' ? 'full-size' : ''}`}
            style={activeView === 'all' ? { gridArea: 'evolution' } : {}}
          >
            <div className="panel-header">
              <h3>Pattern Evolution View</h3>
              {activeView === 'all' && (
                <button 
                  className="expand-button"
                  onClick={() => setActiveView('evolution')}
                >
                  Expand
                </button>
              )}
            </div>
            
            <EnhancedPatternEvolutionView
              patternId={selectedPatternId}
              patternVersions={selectedPatternVersions}
              width={dimensions.evolution.width}
              height={dimensions.evolution.height}
              onVersionSelect={handleVersionSelect}
              selectedVersionId={selectedVersionId}
              showSpectralChanges={showSpectralChanges}
            />
          </div>
        )}
        
        {/* Empty state for evolution view */}
        {(activeView === 'all') && (!selectedPatternId || selectedPatternVersions.length === 0) && (
          <div 
            className="visualization-panel empty-evolution-panel"
            style={{ gridArea: 'evolution' }}
          >
            <div className="panel-header">
              <h3>Pattern Evolution View</h3>
            </div>
            
            <div className="empty-state">
              <p>{selectedPatternId 
                ? 'No version history available for the selected pattern' 
                : 'Select a pattern to view its evolution history'}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Additional controls for specific views */}
      {activeView === 'matrix' && (
        <div className="view-specific-controls">
          <div className="color-scale-selector">
            <label>Color Scale:</label>
            <select 
              value={colorScale}
              onChange={(e) => setColorScale(e.target.value as any)}
              className="scale-select"
            >
              <option value="viridis">Viridis</option>
              <option value="inferno">Inferno</option>
              <option value="plasma">Plasma</option>
              <option value="magma">Magma</option>
              <option value="redblue">Red-Blue</option>
            </select>
          </div>
        </div>
      )}
      
      {activeView === 'evolution' && (
        <div className="view-specific-controls">
          <div className="spectral-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={showSpectralChanges}
                onChange={(e) => setShowSpectralChanges(e.target.checked)}
              />
              Show Spectral Changes
            </label>
          </div>
        </div>
      )}
      
      {/* Pattern selection information */}
      <div className="selection-info">
        {selectedPatternId && (
          <div className="selected-pattern">
            <span className="info-label">Selected Pattern:</span>
            <span className="info-value">
              {patterns.find(p => p.id === selectedPatternId)?.type || 'Unknown'} 
              (ID: {selectedPatternId.substring(0, 8)}...)
            </span>
          </div>
        )}
        
        {selectedVersionId && (
          <div className="selected-version">
            <span className="info-label">Selected Version:</span>
            <span className="info-value">
              {selectedPatternVersions.find(v => v.id === selectedVersionId)?.timestamp.toLocaleString() || 'Unknown'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};