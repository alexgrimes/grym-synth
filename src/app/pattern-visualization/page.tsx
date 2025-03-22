'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedPatternVisualizationSystem } from '../../components/visualization/EnhancedPatternVisualizationSystem';
import { AudioPattern, PatternVersion } from '../../lib/types/audio';
import { v4 as uuidv4 } from 'uuid';

// Mock data generator for demonstration purposes
const generateMockPatterns = (): AudioPattern[] => {
  const patternTypes = [
    'harmonic', 'percussive', 'melodic', 'speech', 
    'noise', 'textural', 'ambient'
  ];
  
  const patterns: AudioPattern[] = [];
  
  // Generate patterns for each type
  patternTypes.forEach(type => {
    const count = 2 + Math.floor(Math.random() * 4); // 2-5 patterns per type
    
    for (let i = 0; i < count; i++) {
      // Create feature vector with random values but similar within types
      const featureLength = 32;
      const features = new Float32Array(featureLength);
      
      // Base vector for this type to make patterns of same type more similar
      const typeBaseVector = new Float32Array(featureLength);
      for (let j = 0; j < featureLength; j++) {
        typeBaseVector[j] = Math.random();
      }
      
      // Variation from the base vector
      for (let j = 0; j < featureLength; j++) {
        // 70% from type base, 30% random variation
        features[j] = typeBaseVector[j] * 0.7 + Math.random() * 0.3;
      }
      
      patterns.push({
        id: uuidv4(),
        type,
        startTime: Math.random() * 5,
        endTime: 5 + Math.random() * 5,
        frequencyRange: {
          low: 80 + Math.random() * 400,
          high: 1000 + Math.random() * 10000
        },
        confidence: 0.5 + Math.random() * 0.5, // 0.5-1.0
        features
      });
    }
  });
  
  return patterns;
};

// Generate mock version history for patterns
const generateMockVersions = (patterns: AudioPattern[]): Record<string, PatternVersion[]> => {
  const versionsMap: Record<string, PatternVersion[]> = {};
  
  patterns.forEach(pattern => {
    // Not all patterns have version history
    if (Math.random() > 0.3) {
      const versionCount = 1 + Math.floor(Math.random() * 8); // 1-8 versions
      const versions: PatternVersion[] = [];
      
      // Starting timestamp from 30 days ago
      let timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - 30);
      
      // Initial version is the current pattern
      versions.push({
        id: uuidv4(),
        pattern: { ...pattern },
        timestamp: new Date(timestamp),
        source: Math.random() > 0.5 ? 'ai' : 'system',
        notes: 'Initial pattern detection'
      });
      
      // Add additional versions with variations
      for (let i = 1; i < versionCount; i++) {
        // Move forward in time
        timestamp = new Date(timestamp);
        timestamp.setHours(timestamp.getHours() + Math.floor(Math.random() * 72)); // 0-72 hours later
        
        // Create a new feature vector with some variation from the previous
        const prevFeatures = versions[i-1].pattern.features;
        const newFeatures = new Float32Array(prevFeatures.length);
        
        // How much variation (higher values = more different)
        const variationAmount = 0.1 + Math.random() * 0.3;
        
        for (let j = 0; j < prevFeatures.length; j++) {
          // Blend previous with new random values
          newFeatures[j] = prevFeatures[j] * (1 - variationAmount) + 
                          Math.random() * variationAmount;
        }
        
        // Determine source based on version number
        let source: 'ai' | 'user' | 'system';
        if (i % 3 === 0) {
          source = 'user';
        } else if (i % 3 === 1) {
          source = 'ai';
        } else {
          source = 'system';
        }
        
        // Version notes based on source
        let notes: string;
        if (source === 'user') {
          notes = 'User refinement iteration';
        } else if (source === 'ai') {
          notes = 'AI-suggested optimization';
        } else {
          notes = 'System automatic calibration';
        }
        
        // Create the version with some random variations
        versions.push({
          id: uuidv4(),
          pattern: {
            ...pattern,
            features: newFeatures,
            confidence: Math.min(1.0, pattern.confidence + (Math.random() * 0.2 - 0.1))
          },
          timestamp,
          source,
          notes
        });
      }
      
      // Sort versions by timestamp
      versions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      versionsMap[pattern.id] = versions;
    }
  });
  
  return versionsMap;
};

const PatternVisualizationPage: React.FC = () => {
  const [patterns, setPatterns] = useState<AudioPattern[]>([]);
  const [patternVersions, setPatternVersions] = useState<Record<string, PatternVersion[]>>({});
  const [selectedPattern, setSelectedPattern] = useState<AudioPattern | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PatternVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate mock data on component mount
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      const mockPatterns = generateMockPatterns();
      const mockVersions = generateMockVersions(mockPatterns);
      
      setPatterns(mockPatterns);
      setPatternVersions(mockVersions);
      setIsLoading(false);
    }, 1000);
  }, []);
  
  // Handle pattern selection
  const handlePatternSelect = (pattern: AudioPattern) => {
    setSelectedPattern(pattern);
    setSelectedVersion(null);
  };
  
  // Handle version selection
  const handleVersionSelect = (version: PatternVersion) => {
    setSelectedVersion(version);
  };
  
  return (
    <div className="pattern-visualization-page">
      <div className="page-header">
        <h1>Enhanced Pattern Visualization</h1>
        <p>
          Interactive visualization system for exploring audio patterns, their relationships, 
          and evolution history. This implementation fulfills the "Enhanced Pattern Visualization" 
          priority from the GrymSynth implementation plan.
        </p>
      </div>
      
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading visualization system...</p>
        </div>
      ) : (
        <div className="visualization-container">
          <EnhancedPatternVisualizationSystem
            patterns={patterns}
            patternVersionsMap={patternVersions}
            width={1200}
            height={800}
            onPatternSelect={handlePatternSelect}
            onVersionSelect={handleVersionSelect}
          />
        </div>
      )}
      
      {selectedPattern && (
        <div className="selection-details">
          <h2>Selected Pattern Details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{selectedPattern.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{selectedPattern.type}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time Range:</span>
              <span className="detail-value">
                {selectedPattern.startTime.toFixed(2)}s - {selectedPattern.endTime.toFixed(2)}s
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Frequency Range:</span>
              <span className="detail-value">
                {selectedPattern.frequencyRange.low.toFixed(0)}Hz - 
                {selectedPattern.frequencyRange.high.toFixed(0)}Hz
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Confidence:</span>
              <span className="detail-value">
                {(selectedPattern.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Versions:</span>
              <span className="detail-value">
                {patternVersions[selectedPattern.id]?.length || 0} versions
              </span>
            </div>
          </div>
        </div>
      )}
      
      {selectedVersion && (
        <div className="version-details">
          <h2>Selected Version Details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Version ID:</span>
              <span className="detail-value">{selectedVersion.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Source:</span>
              <span className="detail-value">{selectedVersion.source.toUpperCase()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Timestamp:</span>
              <span className="detail-value">{selectedVersion.timestamp.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Confidence:</span>
              <span className="detail-value">
                {(selectedVersion.pattern.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Notes:</span>
              <span className="detail-value">{selectedVersion.notes || 'No notes'}</span>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .pattern-visualization-page {
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .page-header {
          margin-bottom: 30px;
        }
        
        .page-header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          color: #333;
        }
        
        .page-header p {
          font-size: 16px;
          color: #666;
          line-height: 1.5;
          max-width: 800px;
        }
        
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: #3498db;
          animation: spin 1s ease-in-out infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .visualization-container {
          margin-bottom: 30px;
        }
        
        .selection-details,
        .version-details {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .selection-details h2,
        .version-details h2 {
          font-size: 24px;
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .detail-label {
          font-weight: bold;
          font-size: 14px;
          color: #666;
        }
        
        .detail-value {
          font-family: monospace;
          font-size: 16px;
          word-break: break-all;
        }
        
        @media (max-width: 768px) {
          .visualization-container {
            margin: 0 -10px;
          }
          
          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default PatternVisualizationPage;