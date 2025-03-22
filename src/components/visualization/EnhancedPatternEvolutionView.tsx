import React, { useEffect, useRef, useState } from 'react';
import { AudioPattern, PatternVersion } from '../../lib/types/audio';
import './EnhancedPatternEvolutionView.css';

interface EnhancedPatternEvolutionViewProps {
  patternId: string;
  patternVersions: PatternVersion[];
  width: number;
  height: number;
  onVersionSelect?: (version: PatternVersion) => void;
  selectedVersionId?: string;
  showSpectralChanges?: boolean;
}

export const EnhancedPatternEvolutionView: React.FC<EnhancedPatternEvolutionViewProps> = ({
  patternId,
  patternVersions,
  width,
  height,
  onVersionSelect,
  selectedVersionId,
  showSpectralChanges = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredVersionIndex, setHoveredVersionIndex] = useState<number | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [timeRange, setTimeRange] = useState<[Date, Date] | null>(null);
  
  // Sort versions by timestamp
  const sortedVersions = [...patternVersions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // Filter versions if a source filter is applied
  const filteredVersions = filterSource 
    ? sortedVersions.filter(v => v.source === filterSource)
    : sortedVersions;
  
  // Find selected version index
  useEffect(() => {
    if (!selectedVersionId) {
      setSelectedVersionIndex(null);
      return;
    }
    
    const index = filteredVersions.findIndex(v => v.id === selectedVersionId);
    setSelectedVersionIndex(index >= 0 ? index : null);
  }, [selectedVersionId, filteredVersions]);
  
  // Set initial time range based on available versions
  useEffect(() => {
    if (filteredVersions.length > 0) {
      const startDate = filteredVersions[0].timestamp;
      const endDate = filteredVersions[filteredVersions.length - 1].timestamp;
      
      // Add padding before and after
      const timeDiff = endDate.getTime() - startDate.getTime();
      const paddingMs = timeDiff * 0.1; // 10% padding
      
      const rangeStart = new Date(startDate.getTime() - paddingMs);
      const rangeEnd = new Date(endDate.getTime() + paddingMs);
      
      setTimeRange([rangeStart, rangeEnd]);
    }
  }, [filteredVersions]);
  
  // Constants for drawing
  const timelineHeight = 60;
  const historyHeight = height - timelineHeight - 20;
  const padding = 40;
  const nodeRadius = 8;
  
  // Calculate color for a pattern version
  const getPatternColor = (version: PatternVersion): string => {
    const sourceColors: Record<string, string> = {
      'ai': '#3498db', // Blue
      'user': '#e74c3c', // Red
      'system': '#2ecc71', // Green
      'default': '#f39c12' // Orange
    };
    
    const confidence = version.pattern.confidence;
    const baseColor = sourceColors[version.source] || sourceColors.default;
    
    // Adjust opacity based on confidence
    return baseColor + Math.round(confidence * 70 + 30).toString(16).padStart(2, '0');
  };
  
  // Map a timestamp to x coordinate based on time range
  const getXForTimestamp = (timestamp: Date): number => {
    if (!timeRange) return padding;
    
    const [startTime, endTime] = timeRange;
    const timeWidth = width - (padding * 2);
    
    const timePosition = (timestamp.getTime() - startTime.getTime()) / 
                         (endTime.getTime() - startTime.getTime());
    
    return padding + (timePosition * timeWidth);
  };
  
  // Draw evolution visualization
  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (filteredVersions.length === 0) {
      // Draw "No history" message
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No pattern history available', width / 2, height / 2);
      return;
    }
    
    if (!timeRange) return;
    
    // Draw time axis
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - timelineHeight);
    ctx.lineTo(width - padding, height - timelineHeight);
    ctx.stroke();
    
    // Draw time markers and labels
    const [startTime, endTime] = timeRange;
    const timeRangeMs = endTime.getTime() - startTime.getTime();
    
    // Determine appropriate time interval for markers
    let timeInterval: number;
    if (timeRangeMs < 3600000) { // Less than 1 hour
      timeInterval = 300000; // 5 minutes
    } else if (timeRangeMs < 86400000) { // Less than 1 day
      timeInterval = 3600000; // 1 hour
    } else if (timeRangeMs < 604800000) { // Less than 1 week
      timeInterval = 86400000; // 1 day
    } else if (timeRangeMs < 2592000000) { // Less than 1 month
      timeInterval = 86400000 * 7; // 1 week
    } else {
      timeInterval = 2592000000; // 1 month
    }
    
    // Round start time to the nearest interval
    const firstMarkerTime = new Date(
      Math.ceil(startTime.getTime() / timeInterval) * timeInterval
    );
    
    for (
      let markerTime = firstMarkerTime.getTime(); 
      markerTime <= endTime.getTime(); 
      markerTime += timeInterval
    ) {
      const markerDate = new Date(markerTime);
      const x = getXForTimestamp(markerDate);
      
      // Draw marker line
      ctx.beginPath();
      ctx.moveTo(x, height - timelineHeight - 5);
      ctx.lineTo(x, height - timelineHeight + 5);
      ctx.strokeStyle = '#aaa';
      ctx.stroke();
      
      // Format time label
      let timeLabel: string;
      if (timeInterval < 86400000) {
        // Format as time for less than day intervals
        timeLabel = markerDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (timeInterval < 2592000000) {
        // Format as date for day or week intervals
        timeLabel = markerDate.toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        });
      } else {
        // Format as month for month intervals
        timeLabel = markerDate.toLocaleDateString([], {
          month: 'short',
          year: '2-digit'
        });
      }
      
      // Draw time label
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, x, height - timelineHeight + 20);
    }
    
    // Draw evolution graph area background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(padding, padding, width - padding * 2, height - timelineHeight - padding - 20);
    
    // Draw source legend
    const legendItems = [
      { source: 'ai', label: 'AI Generated', color: '#3498db' },
      { source: 'user', label: 'User Modified', color: '#e74c3c' },
      { source: 'system', label: 'System Generated', color: '#2ecc71' }
    ];
    
    let legendX = padding;
    legendItems.forEach(item => {
      // Draw legend color swatch
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legendX, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw legend text
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 12, 24);
      
      // Update x position for next item
      legendX += ctx.measureText(item.label).width + 30;
    });
    
    // Draw connection lines between versions
    for (let i = 1; i < filteredVersions.length; i++) {
      const prevVersion = filteredVersions[i - 1];
      const currentVersion = filteredVersions[i];
      
      const x1 = getXForTimestamp(prevVersion.timestamp);
      const x2 = getXForTimestamp(currentVersion.timestamp);
      
      const y1 = padding + 20 + (prevVersion.pattern.confidence * (historyHeight - 40));
      const y2 = padding + 20 + (currentVersion.pattern.confidence * (historyHeight - 40));
      
      // Determine if this connection should be highlighted
      const isSelected = 
        (i - 1 === selectedVersionIndex || i === selectedVersionIndex) &&
        (i - 1 === hoveredVersionIndex || i === hoveredVersionIndex);
      
      // Draw connection line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isSelected ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
      
      // Draw spectral change visualization if enabled
      if (showSpectralChanges) {
        // Calculate feature difference between versions
        const features1 = prevVersion.pattern.features;
        const features2 = currentVersion.pattern.features;
        
        if (features1 && features2 && features1.length === features2.length) {
          // Calculate mean difference between feature vectors
          let totalDiff = 0;
          for (let j = 0; j < features1.length; j++) {
            totalDiff += Math.abs(features2[j] - features1[j]);
          }
          const avgDiff = totalDiff / features1.length;
          
          // Calculate control points for the transition curve
          const midX = (x1 + x2) / 2;
          const midY = ((y1 + y2) / 2) - (avgDiff * 50); // Adjust curve height based on change magnitude
          
          // Draw a quadratic curve showing the magnitude of change
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(midX, midY, x2, y2);
          ctx.strokeStyle = `rgba(255, 165, 0, ${Math.min(1, avgDiff * 5)})`; // Orange with opacity based on diff
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
    
    // Draw version nodes
    filteredVersions.forEach((version, index) => {
      const x = getXForTimestamp(version.timestamp);
      const y = padding + 20 + (version.pattern.confidence * (historyHeight - 40));
      
      const isSelected = index === selectedVersionIndex;
      const isHovered = index === hoveredVersionIndex;
      
      // Draw node
      ctx.beginPath();
      ctx.arc(x, y, isSelected || isHovered ? nodeRadius + 2 : nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = getPatternColor(version);
      
      // Add stroke for selected/hovered nodes
      if (isSelected || isHovered) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.fill();
      
      // Draw version label if selected or hovered
      if (isSelected || isHovered) {
        const labelY = y - nodeRadius - 10;
        
        // Draw date/time label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          version.timestamp.toLocaleString(), 
          x, 
          labelY
        );
      }
    });
    
    // Draw y-axis (confidence)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - timelineHeight - 20);
    ctx.stroke();
    
    // Draw confidence labels
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    [0, 0.25, 0.5, 0.75, 1].forEach(conf => {
      const y = padding + 20 + ((1 - conf) * (historyHeight - 40));
      
      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.strokeStyle = '#eee';
      ctx.stroke();
      
      // Draw label
      ctx.fillStyle = '#666';
      ctx.fillText(`${Math.round(conf * 100)}%`, padding - 5, y);
    });
    
    // Draw confidence axis label
    ctx.save();
    ctx.translate(padding - 30, padding + (historyHeight / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.fillText('Confidence', 0, 0);
    ctx.restore();
    
    // Draw version details panel if a version is selected or hovered
    const activeVersion = hoveredVersionIndex !== null
      ? filteredVersions[hoveredVersionIndex]
      : selectedVersionIndex !== null
        ? filteredVersions[selectedVersionIndex]
        : null;
    
    if (activeVersion) {
      const detailsX = Math.min(width - 220, Math.max(padding, getXForTimestamp(activeVersion.timestamp)));
      const detailsY = padding;
      const detailsWidth = 200;
      const detailsHeight = 120;
      
      // Draw details background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(detailsX, detailsY, detailsWidth, detailsHeight);
      
      // Draw details border
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.strokeRect(detailsX, detailsY, detailsWidth, detailsHeight);
      
      // Draw details content
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Pattern Version Details', detailsX + 10, detailsY + 20);
      
      ctx.font = '11px sans-serif';
      ctx.fillText(`Time: ${activeVersion.timestamp.toLocaleString()}`, detailsX + 10, detailsY + 40);
      ctx.fillText(`Source: ${activeVersion.source.toUpperCase()}`, detailsX + 10, detailsY + 60);
      ctx.fillText(`Confidence: ${Math.round(activeVersion.pattern.confidence * 100)}%`, detailsX + 10, detailsY + 80);
      
      if (activeVersion.notes) {
        ctx.fillText(`Notes: ${activeVersion.notes}`, detailsX + 10, detailsY + 100);
      }
    }
  };
  
  // Handle mouse interaction with the timeline
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || filteredVersions.length === 0 || !timeRange) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Find closest version to mouse
    let closestIndex = -1;
    let minDistance = Infinity;
    
    filteredVersions.forEach((version, index) => {
      const x = getXForTimestamp(version.timestamp);
      const y = padding + 20 + (version.pattern.confidence * (historyHeight - 40));
      
      const distance = Math.sqrt(
        Math.pow(mouseX - x, 2) + 
        Math.pow(mouseY - y, 2)
      );
      
      if (distance < nodeRadius * 2 && distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    setHoveredVersionIndex(closestIndex !== -1 ? closestIndex : null);
  };
  
  const handleCanvasClick = () => {
    if (hoveredVersionIndex !== null && onVersionSelect) {
      onVersionSelect(filteredVersions[hoveredVersionIndex]);
      setSelectedVersionIndex(hoveredVersionIndex);
    }
  };
  
  // Set up source filter buttons
  const handleFilterChange = (source: string | null) => {
    setFilterSource(source);
    setHoveredVersionIndex(null);
    setSelectedVersionIndex(null);
  };
  
  // Handle zoom controls
  const handleZoomChange = (direction: 'in' | 'out') => {
    if (!timeRange) return;
    
    const [startTime, endTime] = timeRange;
    const timeRangeMs = endTime.getTime() - startTime.getTime();
    const midpointMs = startTime.getTime() + (timeRangeMs / 2);
    
    let newZoomLevel: number;
    if (direction === 'in') {
      newZoomLevel = Math.min(4, zoomLevel * 1.5);
    } else {
      newZoomLevel = Math.max(0.5, zoomLevel / 1.5);
    }
    
    const newTimeRangeMs = timeRangeMs * (zoomLevel / newZoomLevel);
    const newStartTime = new Date(midpointMs - (newTimeRangeMs / 2));
    const newEndTime = new Date(midpointMs + (newTimeRangeMs / 2));
    
    setZoomLevel(newZoomLevel);
    setTimeRange([newStartTime, newEndTime]);
  };
  
  // Update visualization when data changes
  useEffect(() => {
    drawVisualization();
  }, [
    filteredVersions,
    width,
    height,
    selectedVersionIndex,
    hoveredVersionIndex,
    showSpectralChanges,
    timeRange,
    zoomLevel
  ]);
  
  return (
    <div className="enhanced-pattern-evolution-view">
      <div className="evolution-header">
        <h3>Pattern Evolution History</h3>
        
        <div className="evolution-controls">
          <div className="source-filter">
            <button 
              className={`source-button ${filterSource === null ? 'active' : ''}`}
              onClick={() => handleFilterChange(null)}
            >
              All
            </button>
            <button 
              className={`source-button ${filterSource === 'ai' ? 'active' : ''}`}
              onClick={() => handleFilterChange('ai')}
            >
              AI
            </button>
            <button 
              className={`source-button ${filterSource === 'user' ? 'active' : ''}`}
              onClick={() => handleFilterChange('user')}
            >
              User
            </button>
            <button 
              className={`source-button ${filterSource === 'system' ? 'active' : ''}`}
              onClick={() => handleFilterChange('system')}
            >
              System
            </button>
          </div>
          
          <div className="zoom-controls">
            <button 
              className="zoom-button"
              onClick={() => handleZoomChange('out')}
              disabled={zoomLevel <= 0.5}
            >
              -
            </button>
            <button 
              className="zoom-button"
              onClick={() => handleZoomChange('in')}
              disabled={zoomLevel >= 4}
            >
              +
            </button>
          </div>
          
          <div className="spectral-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={showSpectralChanges}
                onChange={(e) => onVersionSelect && e.target.checked !== showSpectralChanges}
              />
              Show Spectral Changes
            </label>
          </div>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="evolution-canvas"
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredVersionIndex(null)}
        onClick={handleCanvasClick}
      />
      
      <div className="evolution-info">
        <div className="versions-count">
          {filteredVersions.length} versions {filterSource ? `(${filterSource})` : '(all sources)'}
        </div>
        
        {selectedVersionIndex !== null && (
          <div className="selected-version-info">
            Selected: {filteredVersions[selectedVersionIndex].timestamp.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};