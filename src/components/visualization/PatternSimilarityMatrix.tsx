import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AudioPattern } from '../../lib/types/audio';
import './PatternSimilarityMatrix.css';

interface PatternSimilarityMatrixProps {
  patterns: AudioPattern[];
  width: number;
  height: number;
  onPatternSelect?: (pattern: AudioPattern) => void;
  selectedPatternId?: string;
  colorScale?: 'viridis' | 'inferno' | 'magma' | 'plasma' | 'redblue';
}

export const PatternSimilarityMatrix: React.FC<PatternSimilarityMatrixProps> = ({
  patterns,
  width,
  height,
  onPatternSelect,
  selectedPatternId,
  colorScale = 'viridis'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{i: number, j: number} | null>(null);
  
  // Calculate similarity matrix
  const { similarityMatrix, patternIndices } = useMemo(() => {
    // Sort patterns by type and then by confidence for better visualization
    const sortedPatterns = [...patterns].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return b.confidence - a.confidence;
    });
    
    // Create map of pattern ID to index in sorted array
    const patternIndices = new Map<string, number>();
    sortedPatterns.forEach((pattern, index) => {
      patternIndices.set(pattern.id, index);
    });
    
    // Calculate similarity matrix
    const matrix: number[][] = [];
    for (let i = 0; i < sortedPatterns.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < sortedPatterns.length; j++) {
        if (i === j) {
          // Patterns are identical to themselves
          matrix[i][j] = 1;
        } else if (j < i) {
          // Mirror the matrix
          matrix[i][j] = matrix[j][i];
        } else {
          // Calculate cosine similarity
          matrix[i][j] = calculateCosineSimilarity(
            sortedPatterns[i].features,
            sortedPatterns[j].features
          );
        }
      }
    }
    
    return {
      similarityMatrix: matrix,
      patternIndices: patternIndices
    };
  }, [patterns]);
  
  // Calculate cosine similarity between two patterns
  const calculateCosineSimilarity = (
    features1: Float32Array,
    features2: Float32Array
  ): number => {
    if (!features1 || !features2 || features1.length !== features2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i];
      mag1 += features1[i] * features1[i];
      mag2 += features2[i] * features2[i];
    }
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
    return Math.max(0, Math.min(1, similarity)); // Clamp between 0 and 1
  };
  
  // Get color for similarity value based on color scale
  const getSimilarityColor = (value: number): string => {
    // Color scales based on common scientific visualizations
    const getColor = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`;
    
    // Ensure value is between 0 and 1
    value = Math.max(0, Math.min(1, value));
    
    switch (colorScale) {
      case 'viridis':
        // Viridis scale: dark blue (low) to yellow (high)
        if (value < 0.25) {
          return getColor(68, 1, 84)
        } else if (value < 0.5) {
          return getColor(59, 82, 139)
        } else if (value < 0.75) {
          return getColor(33, 144, 141)
        } else {
          return getColor(253, 231, 37)
        }
      case 'inferno':
        // Inferno scale: black (low) to yellow (high)
        if (value < 0.25) {
          return getColor(0, 0, 4)
        } else if (value < 0.5) {
          return getColor(120, 28, 109)
        } else if (value < 0.75) {
          return getColor(229, 85, 56)
        } else {
          return getColor(252, 253, 191)
        }
      case 'magma':
        // Magma scale: black (low) to white (high)
        if (value < 0.25) {
          return getColor(0, 0, 4)
        } else if (value < 0.5) {
          return getColor(129, 15, 124)
        } else if (value < 0.75) {
          return getColor(217, 47, 39)
        } else {
          return getColor(250, 253, 213)
        }
      case 'plasma':
        // Plasma scale: purple (low) to yellow (high)
        if (value < 0.25) {
          return getColor(13, 8, 135)
        } else if (value < 0.5) {
          return getColor(156, 23, 158)
        } else if (value < 0.75) {
          return getColor(237, 104, 60)
        } else {
          return getColor(240, 249, 33)
        }
      case 'redblue':
        // Red-blue scale: blue (low) to red (high)
        if (value < 0.25) {
          return getColor(0, 0, 255)
        } else if (value < 0.5) {
          return getColor(128, 128, 255)
        } else if (value < 0.75) {
          return getColor(255, 128, 128)
        } else {
          return getColor(255, 0, 0)
        }
      default:
        // Grayscale
        const intensity = Math.round(value * 255);
        return getColor(intensity, intensity, intensity);
    }
  };
  
  // Draw the similarity matrix
  const drawSimilarityMatrix = () => {
    const canvas = canvasRef.current;
    if (!canvas || similarityMatrix.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const padding = 50; // For labels
    const matrixSize = Math.min(width, height) - (padding * 2);
    const cellSize = matrixSize / similarityMatrix.length;
    
    // Draw matrix cells
    for (let i = 0; i < similarityMatrix.length; i++) {
      for (let j = 0; j < similarityMatrix[i].length; j++) {
        const similarity = similarityMatrix[i][j];
        
        // Cell coordinates
        const x = padding + j * cellSize;
        const y = padding + i * cellSize;
        
        // Cell highlighting
        const pattern = patterns.find(p => patternIndices.get(p.id) === i);
        const isSelected = pattern && pattern.id === selectedPatternId;
        const isHovered = hoveredCell && hoveredCell.i === i && hoveredCell.j === j;
        
        // Fill cell with similarity color
        ctx.fillStyle = getSimilarityColor(similarity);
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Add border for selected or hovered cells
        if (isSelected || isHovered || (pattern && pattern.id === selectedPatternId)) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
        
        // Add diagonal line for self-similarity cells
        if (i === j) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    
    // Draw row and column labels (pattern types)
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Group patterns by type for label segments
    const patternTypeRanges: Record<string, {start: number, end: number}> = {};
    let currentType = '';
    let startIndex = 0;
    
    patterns.forEach((pattern, sortedIndex) => {
      const i = patternIndices.get(pattern.id);
      if (i === undefined) return;
      
      if (pattern.type !== currentType) {
        if (currentType !== '') {
          patternTypeRanges[currentType] = {
            start: startIndex,
            end: i - 1
          };
        }
        currentType = pattern.type;
        startIndex = i;
      }
    });
    
    // Add the last type range
    if (currentType !== '') {
      patternTypeRanges[currentType] = {
        start: startIndex,
        end: patterns.length - 1
      };
    }
    
    // Draw the type range labels
    Object.entries(patternTypeRanges).forEach(([type, range]) => {
      const startY = padding + range.start * cellSize;
      const endY = padding + (range.end + 1) * cellSize;
      const midY = (startY + endY) / 2;
      
      // Row labels
      ctx.fillStyle = '#333';
      ctx.textAlign = 'right';
      ctx.fillText(type, padding - 5, midY);
      
      // Column labels (rotated)
      ctx.save();
      ctx.translate(padding + (range.start + range.end + 1) * cellSize / 2, padding - 5);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.fillText(type, 0, 0);
      ctx.restore();
      
      // Draw type separators if there are multiple types
      const types = Object.keys(patternTypeRanges);
      if (types.length > 1 && range.end < patterns.length - 1) {
        // Row separator
        ctx.beginPath();
        ctx.moveTo(padding, endY);
        ctx.lineTo(padding + matrixSize, endY);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Column separator
        ctx.beginPath();
        ctx.moveTo(padding + (range.end + 1) * cellSize, padding);
        ctx.lineTo(padding + (range.end + 1) * cellSize, padding + matrixSize);
        ctx.stroke();
      }
    });
    
    // Draw similarity value for hovered cell
    if (hoveredCell) {
      const i = hoveredCell.i;
      const j = hoveredCell.j;
      const similarity = similarityMatrix[i][j];
      
      const patternI = patterns.find(p => patternIndices.get(p.id) === i);
      const patternJ = patterns.find(p => patternIndices.get(p.id) === j);
      
      if (patternI && patternJ) {
        // Draw info box
        const labelX = padding + matrixSize + 10;
        const labelY = padding;
        
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(labelX, labelY, 150, 80);
        
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.font = '12px sans-serif';
        
        ctx.fillText(`Similarity: ${similarity.toFixed(2)}`, labelX + 10, labelY + 20);
        ctx.fillText(`Pattern 1: ${patternI.type}`, labelX + 10, labelY + 40);
        ctx.fillText(`Pattern 2: ${patternJ.type}`, labelX + 10, labelY + 60);
      }
    }
    
    // Draw color scale
    const scaleWidth = 20;
    const scaleHeight = matrixSize;
    const scaleX = width - scaleWidth - 10;
    const scaleY = padding;
    
    // Draw gradient scale
    const gradient = ctx.createLinearGradient(scaleX, scaleY + scaleHeight, scaleX, scaleY);
    
    switch (colorScale) {
      case 'viridis':
        gradient.addColorStop(0, 'rgb(68, 1, 84)');
        gradient.addColorStop(0.33, 'rgb(59, 82, 139)');
        gradient.addColorStop(0.66, 'rgb(33, 144, 141)');
        gradient.addColorStop(1, 'rgb(253, 231, 37)');
        break;
      case 'inferno':
        gradient.addColorStop(0, 'rgb(0, 0, 4)');
        gradient.addColorStop(0.33, 'rgb(120, 28, 109)');
        gradient.addColorStop(0.66, 'rgb(229, 85, 56)');
        gradient.addColorStop(1, 'rgb(252, 253, 191)');
        break;
      case 'magma':
        gradient.addColorStop(0, 'rgb(0, 0, 4)');
        gradient.addColorStop(0.33, 'rgb(129, 15, 124)');
        gradient.addColorStop(0.66, 'rgb(217, 47, 39)');
        gradient.addColorStop(1, 'rgb(250, 253, 213)');
        break;
      case 'plasma':
        gradient.addColorStop(0, 'rgb(13, 8, 135)');
        gradient.addColorStop(0.33, 'rgb(156, 23, 158)');
        gradient.addColorStop(0.66, 'rgb(237, 104, 60)');
        gradient.addColorStop(1, 'rgb(240, 249, 33)');
        break;
      case 'redblue':
        gradient.addColorStop(0, 'rgb(0, 0, 255)');
        gradient.addColorStop(0.33, 'rgb(128, 128, 255)');
        gradient.addColorStop(0.66, 'rgb(255, 128, 128)');
        gradient.addColorStop(1, 'rgb(255, 0, 0)');
        break;
      default:
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'white');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(scaleX, scaleY, scaleWidth, scaleHeight);
    
    // Draw scale border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(scaleX, scaleY, scaleWidth, scaleHeight);
    
    // Draw scale labels
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '10px sans-serif';
    
    ctx.fillText('1.0', scaleX + scaleWidth + 5, scaleY);
    ctx.fillText('0.5', scaleX + scaleWidth + 5, scaleY + scaleHeight / 2);
    ctx.fillText('0.0', scaleX + scaleWidth + 5, scaleY + scaleHeight);
    
    // Draw scale title
    ctx.save();
    ctx.translate(scaleX - 5, scaleY + scaleHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillText('Similarity', 0, 0);
    ctx.restore();
  };
  
  // Handle canvas mouse events
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || similarityMatrix.length === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const padding = 50;
    const matrixSize = Math.min(width, height) - (padding * 2);
    const cellSize = matrixSize / similarityMatrix.length;
    
    // Check if mouse is within the matrix
    if (
      mouseX >= padding && 
      mouseX < padding + matrixSize &&
      mouseY >= padding && 
      mouseY < padding + matrixSize
    ) {
      const i = Math.floor((mouseY - padding) / cellSize);
      const j = Math.floor((mouseX - padding) / cellSize);
      
      if (
        i >= 0 && 
        i < similarityMatrix.length && 
        j >= 0 && 
        j < similarityMatrix[0].length
      ) {
        setHoveredCell({ i, j });
        return;
      }
    }
    
    setHoveredCell(null);
  };
  
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoveredCell || !onPatternSelect) return;
    
    const patternIdx = hoveredCell.i;
    const pattern = patterns.find(p => patternIndices.get(p.id) === patternIdx);
    
    if (pattern) {
      onPatternSelect(pattern);
    }
  };
  
  // Redraw the matrix when relevant props change
  useEffect(() => {
    drawSimilarityMatrix();
  }, [
    similarityMatrix,
    width,
    height,
    selectedPatternId,
    hoveredCell,
    colorScale,
    patterns.length
  ]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawSimilarityMatrix();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className="pattern-similarity-matrix">
      <div className="matrix-header">
        <h3>Pattern Similarity Matrix</h3>
        <div className="color-scale-selector">
          <label>Color Scale:</label>
          <select 
            value={colorScale}
            onChange={(e) => e.target.value as any}
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
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="similarity-matrix-canvas"
        onMouseMove={handleCanvasMouseMove}
        onClick={handleCanvasClick}
        onMouseLeave={() => setHoveredCell(null)}
      />
      
      <div className="matrix-info">
        <p>Matrix shows similarity between patterns. Brighter cells indicate higher similarity.</p>
        <p>Patterns are grouped by type and sorted by confidence.</p>
        <p>Click on any cell to select the corresponding pattern.</p>
      </div>
    </div>
  );
};