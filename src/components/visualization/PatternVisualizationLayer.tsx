import React, { useRef, useEffect, useState } from 'react';
import { AudioPattern } from '../../types/audio';
import { HealthMonitor } from '../../services/monitoring/HealthMonitor';

interface PatternVisualizationLayerProps {
  patterns: AudioPattern[];
  width: number;
  height: number;
  timeRange: [number, number];
  frequencyRange: [number, number];
  selectedPatternId?: string;
  confidenceThreshold?: number;
  onPatternClick?: (pattern: AudioPattern) => void;
  healthMonitor?: HealthMonitor;
}

export const PatternVisualizationLayer: React.FC<PatternVisualizationLayerProps> = ({
  patterns,
  width,
  height,
  timeRange,
  frequencyRange,
  selectedPatternId,
  confidenceThreshold = 0.5,
  onPatternClick,
  healthMonitor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);
  
  // Implement mapping functions for time/frequency to canvas coordinates
  const mapTimeToX = (time: number): number => {
    const [startTime, endTime] = timeRange;
    return ((time - startTime) / (endTime - startTime)) * width;
  };
  
  const mapFrequencyToY = (frequency: number): number => {
    const [minFreq, maxFreq] = frequencyRange;
    // Invert Y axis (0 = top of canvas)
    return height - ((frequency - minFreq) / (maxFreq - minFreq)) * height;
  };
  
  // Determine pattern color based on confidence and type
  const getPatternColor = (pattern: AudioPattern, isHovered: boolean, isSelected: boolean): string => {
    const typeColors: Record<string, string> = {
      'harmonic': '46, 204, 113',
      'percussive': '231, 76, 60',
      'melodic': '52, 152, 219',
      'speech': '155, 89, 182',
      'noise': '127, 140, 141',
      'default': '241, 196, 15'
    };
    
    const baseColor = typeColors[pattern.type] || typeColors.default;
    
    // Opacity based on confidence
    let opacity = 0.3 + (pattern.confidence * 0.5);
    
    // Increase opacity for hovered/selected patterns
    if (isHovered) opacity = 0.8;
    if (isSelected) opacity = 0.9;
    
    return `rgba(${baseColor}, ${opacity})`;
  };
  
  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Find pattern under cursor
    let foundPatternId: string | null = null;
    
    for (const pattern of patterns) {
      // Skip patterns below confidence threshold
      if (pattern.confidence < confidenceThreshold) continue;
      
      const patternX = mapTimeToX(pattern.startTime);
      const patternWidth = mapTimeToX(pattern.endTime) - patternX;
      
      const patternYTop = mapFrequencyToY(pattern.frequencyRange.high);
      const patternHeight = mapFrequencyToY(pattern.frequencyRange.low) - patternYTop;
      
      if (
        mouseX >= patternX && 
        mouseX <= patternX + patternWidth &&
        mouseY >= patternYTop && 
        mouseY <= patternYTop + patternHeight
      ) {
        // We found a pattern! If there are overlapping patterns, we'll get the last one
        foundPatternId = pattern.id;
      }
    }
    
    setHoveredPatternId(foundPatternId);
  };
  
  const handleMouseOut = () => {
    setHoveredPatternId(null);
  };
  
  const handleClick = () => {
    if (hoveredPatternId && onPatternClick) {
      const pattern = patterns.find(p => p.id === hoveredPatternId);
      if (pattern) {
        onPatternClick(pattern);
        
        healthMonitor?.recordMetric('visualization.pattern.clicked', {
          patternId: pattern.id,
          patternType: pattern.type,
          confidence: pattern.confidence
        });
      }
    }
  };
  
  // Draw patterns on canvas
  const drawPatterns = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Filter patterns based on confidence threshold
    const visiblePatterns = patterns.filter(p => p.confidence >= confidenceThreshold);
    
    // Sort patterns so that selected/hovered ones are drawn on top
    const sortedPatterns = [...visiblePatterns].sort((a, b) => {
      if (a.id === selectedPatternId || a.id === hoveredPatternId) return 1;
      if (b.id === selectedPatternId || b.id === hoveredPatternId) return -1;
      return 0;
    });
    
    // Draw each pattern
    for (const pattern of sortedPatterns) {
      const isHovered = pattern.id === hoveredPatternId;
      const isSelected = pattern.id === selectedPatternId;
      
      const x = mapTimeToX(pattern.startTime);
      const w = mapTimeToX(pattern.endTime) - x;
      
      const y = mapFrequencyToY(pattern.frequencyRange.high);
      const h = mapFrequencyToY(pattern.frequencyRange.low) - y;
      
      // Draw pattern rectangle
      ctx.fillStyle = getPatternColor(pattern, isHovered, isSelected);
      ctx.fillRect(x, y, w, h);
      
      // Draw border for hovered/selected patterns
      if (isHovered || isSelected) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(x, y, w, h);
        
        // Draw pattern label
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        const labelText = `${pattern.type} (${Math.round(pattern.confidence * 100)}%)`;
        ctx.fillText(labelText, x + 4, y + 16);
      }
    }
    
    // Record metrics
    healthMonitor?.recordMetric('visualization.patterns.rendered', {
      count: visiblePatterns.length,
      visibleCount: sortedPatterns.length,
      threshold: confidenceThreshold
    });
  };
  
  // Draw whenever relevant props change
  useEffect(() => {
    drawPatterns();
  }, [
    patterns, 
    width, 
    height, 
    timeRange, 
    frequencyRange, 
    selectedPatternId, 
    hoveredPatternId,
    confidenceThreshold
  ]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'auto'
      }}
      onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
      onClick={handleClick}
    />
  );
};