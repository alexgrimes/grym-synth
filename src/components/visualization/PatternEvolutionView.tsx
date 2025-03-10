import React, { useEffect, useRef, useState } from 'react';
import { AudioPattern, PatternVersion } from '../../types/audio';

interface PatternEvolutionViewProps {
  patternId: string;
  patternVersions: PatternVersion[];
  width: number;
  height: number;
  onVersionSelect?: (version: PatternVersion) => void;
}

export const PatternEvolutionView: React.FC<PatternEvolutionViewProps> = ({
  patternId,
  patternVersions,
  width,
  height,
  onVersionSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);
  const [hoveredVersionIndex, setHoveredVersionIndex] = useState<number | null>(null);
  
  // Sort versions by timestamp
  const sortedVersions = [...patternVersions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // Constants for drawing
  const timelineHeight = 80;
  const timelineY = height / 2;
  const nodeRadius = 8;
  const padding = 40;
  
  // Draw timeline
  const drawEvolutionTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (sortedVersions.length === 0) {
      // Draw "No history" message
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No pattern history available', width / 2, height / 2);
      return;
    }
    
    // Calculate timeline start and end
    const startTime = sortedVersions[0].timestamp.getTime();
    const endTime = sortedVersions[sortedVersions.length - 1].timestamp.getTime();
    const timeRange = Math.max(endTime - startTime, 1); // Avoid division by zero
    
    // Draw timeline line
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, timelineY);
    ctx.lineTo(width - padding, timelineY);
    ctx.stroke();
    
    // Draw nodes for each version
    sortedVersions.forEach((version, index) => {
      const timePosition = startTime === endTime 
        ? width / 2 
        : padding + ((version.timestamp.getTime() - startTime) / timeRange) * (width - 2 * padding);
      
      const isSelected = index === selectedVersionIndex;
      const isHovered = index === hoveredVersionIndex;
      
      // Draw connection line to previous version
      if (index > 0) {
        const prevTimePosition = startTime === endTime 
          ? width / 2 
          : padding + ((sortedVersions[index - 1].timestamp.getTime() - startTime) / timeRange) * (width - 2 * padding);
        
        ctx.beginPath();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.moveTo(prevTimePosition, timelineY);
        ctx.lineTo(timePosition, timelineY);
        ctx.stroke();
      }
      
      // Draw node
      ctx.beginPath();
      ctx.arc(timePosition, timelineY, nodeRadius, 0, Math.PI * 2);
      
      // Color based on source
      switch (version.source) {
        case 'ai':
          ctx.fillStyle = '#3498db'; // Blue
          break;
        case 'user':
          ctx.fillStyle = '#e74c3c'; // Red
          break;
        case 'system':
          ctx.fillStyle = '#2ecc71'; // Green
          break;
      }
      
      // Highlight selected/hovered version
      if (isSelected || isHovered) {
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = 'white';
        ctx.stroke();
      }
      
      ctx.fill();
      
      // Draw confidence value below the node
      ctx.fillStyle = isHovered || isSelected ? '#000' : '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${(version.pattern.confidence * 100).toFixed(0)}%`, 
        timePosition, 
        timelineY + nodeRadius + 15
      );
      
      // Draw date above the node
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.fillText(
        version.timestamp.toLocaleDateString(), 
        timePosition, 
        timelineY - nodeRadius - 15
      );
      
      // Draw source label
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.fillText(
        version.source.toUpperCase(), 
        timePosition, 
        timelineY - nodeRadius - 30
      );
    });
    
    // Draw details for selected/hovered version
    const activeVersion = hoveredVersionIndex !== null
      ? sortedVersions[hoveredVersionIndex]
      : selectedVersionIndex !== null
        ? sortedVersions[selectedVersionIndex]
        : null;
    
    if (activeVersion) {
      const pattern = activeVersion.pattern;
      
      // Draw info box
      const infoBoxY = timelineY + 50;
      const infoBoxWidth = width / 2;
      const infoBoxX = (width - infoBoxWidth) / 2;
      
      // Draw semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(infoBoxX, infoBoxY, infoBoxWidth, 100);
      
      // Draw info text
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      
      const textX = infoBoxX + 10;
      let textY = infoBoxY + 20;
      
      ctx.fillText(`Type: ${pattern.type}`, textX, textY);
      textY += 15;
      
      ctx.fillText(
        `Time: ${pattern.startTime.toFixed(2)}s - ${pattern.endTime.toFixed(2)}s`, 
        textX, 
        textY
      );
      textY += 15;
      
      ctx.fillText(
        `Frequency: ${pattern.frequencyRange.low}Hz - ${pattern.frequencyRange.high}Hz`, 
        textX, 
        textY
      );
      textY += 15;
      
      ctx.fillText(
        `Confidence: ${(pattern.confidence * 100).toFixed(0)}%`, 
        textX, 
        textY
      );
      textY += 15;
      
      if (activeVersion.notes) {
        ctx.fillText(`Notes: ${activeVersion.notes}`, textX, textY);
      }
    }
  };
  
  // Handle mouse events
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || sortedVersions.length === 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate timeline start and end
    const startTime = sortedVersions[0].timestamp.getTime();
    const endTime = sortedVersions[sortedVersions.length - 1].timestamp.getTime();
    const timeRange = Math.max(endTime - startTime, 1);
    
    // Find closest version
    let foundIndex: number | null = null;
    let minDistance = Infinity;
    
    sortedVersions.forEach((version, index) => {
      const timePosition = startTime === endTime 
        ? width / 2 
        : padding + ((version.timestamp.getTime() - startTime) / timeRange) * (width - 2 * padding);
      
      const distance = Math.sqrt(
        Math.pow(mouseX - timePosition, 2) + 
        Math.pow(mouseY - timelineY, 2)
      );
      
      if (distance < nodeRadius * 1.5 && distance < minDistance) {
        minDistance = distance;
        foundIndex = index;
      }
    });
    
    setHoveredVersionIndex(foundIndex);
  };
  
  const handleCanvasMouseOut = () => {
    setHoveredVersionIndex(null);
  };
  
  const handleCanvasClick = () => {
    if (hoveredVersionIndex !== null) {
      setSelectedVersionIndex(hoveredVersionIndex);
      if (onVersionSelect) {
        onVersionSelect(sortedVersions[hoveredVersionIndex]);
      }
    }
  };
  
  // Draw timeline when component mounts or updates
  useEffect(() => {
    drawEvolutionTimeline();
  }, [
    patternVersions,
    width,
    height,
    selectedVersionIndex,
    hoveredVersionIndex
  ]);
  
  return (
    <div className="pattern-evolution-view bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Pattern Evolution History</h3>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleCanvasMouseMove}
        onMouseOut={handleCanvasMouseOut}
        onClick={handleCanvasClick}
        className="cursor-pointer"
      />
    </div>
  );
};