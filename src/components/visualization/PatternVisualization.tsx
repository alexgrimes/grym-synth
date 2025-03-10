import React, { useEffect, useRef, useState } from 'react';

interface AudioPattern {
  id: string;
  startTime: number;
  endTime: number;
  frequencyRange: {
    low: number;
    high: number;
  };
  confidence: number;
  label?: string;
}

interface PatternVisualizationProps {
  audioUrl?: string;
  patterns?: AudioPattern[];
  width?: number;
  height?: number;
  onPatternSelect?: (pattern: AudioPattern) => void;
  highlightedPatternId?: string;
}

export const PatternVisualization: React.FC<PatternVisualizationProps> = ({
  audioUrl,
  patterns = [],
  width = 800,
  height = 300,
  onPatternSelect,
  highlightedPatternId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [hoveredPattern, setHoveredPattern] = useState<AudioPattern | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        
        setAudioBuffer(buffer);
        drawVisualization(buffer);
      } catch (err) {
        console.error('Error loading audio:', err);
        setError('Failed to load audio file');
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [audioUrl]);

  useEffect(() => {
    if (audioBuffer) {
      drawVisualization(audioBuffer);
    }
  }, [patterns, highlightedPatternId, audioBuffer]);

  const drawVisualization = (buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.beginPath();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    // Draw patterns
    patterns.forEach(pattern => {
      const isHighlighted = pattern.id === highlightedPatternId;
      const isHovered = hoveredPattern?.id === pattern.id;
      
      // Convert time to x coordinates
      const startX = (pattern.startTime / buffer.duration) * width;
      const endX = (pattern.endTime / buffer.duration) * width;
      
      // Convert frequency to y coordinates (inverse because canvas y grows downward)
      const bottomY = height - (pattern.frequencyRange.low / 20000) * height;
      const topY = height - (pattern.frequencyRange.high / 20000) * height;

      // Draw pattern region
      ctx.fillStyle = isHighlighted 
        ? 'rgba(79, 70, 229, 0.3)' // Indigo with opacity
        : isHovered 
          ? 'rgba(99, 102, 241, 0.2)' // Lighter indigo with opacity
          : 'rgba(199, 210, 254, 0.15)'; // Very light indigo with opacity

      ctx.fillRect(startX, topY, endX - startX, bottomY - topY);

      // Draw pattern label if exists
      if (pattern.label) {
        ctx.fillStyle = '#4B5563';
        ctx.font = '12px sans-serif';
        ctx.fillText(pattern.label, startX + 4, topY + 16);
      }

      // Draw confidence indicator
      const confidenceWidth = 3;
      const confidenceHeight = bottomY - topY;
      ctx.fillStyle = `rgba(79, 70, 229, ${pattern.confidence})`;
      ctx.fillRect(endX - confidenceWidth, topY, confidenceWidth, confidenceHeight);
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer || !onPatternSelect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked pattern
    const clickedPattern = patterns.find(pattern => {
      const startX = (pattern.startTime / audioBuffer.duration) * width;
      const endX = (pattern.endTime / audioBuffer.duration) * width;
      const bottomY = height - (pattern.frequencyRange.low / 20000) * height;
      const topY = height - (pattern.frequencyRange.high / 20000) * height;

      return x >= startX && x <= endX && y >= topY && y <= bottomY;
    });

    if (clickedPattern) {
      onPatternSelect(clickedPattern);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find hovered pattern
    const pattern = patterns.find(pattern => {
      const startX = (pattern.startTime / audioBuffer.duration) * width;
      const endX = (pattern.endTime / audioBuffer.duration) * width;
      const bottomY = height - (pattern.frequencyRange.low / 20000) * height;
      const topY = height - (pattern.frequencyRange.high / 20000) * height;

      return x >= startX && x <= endX && y >= topY && y <= bottomY;
    });

    setHoveredPattern(pattern || null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg">
        <div className="animate-pulse text-gray-600">Loading visualization...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-red-50 rounded-lg">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredPattern(null)}
      />
      {hoveredPattern && (
        <div className="absolute bg-white p-2 rounded shadow-lg text-sm">
          <div className="font-semibold">{hoveredPattern.label || 'Unnamed Pattern'}</div>
          <div className="text-gray-600">
            Confidence: {(hoveredPattern.confidence * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
};