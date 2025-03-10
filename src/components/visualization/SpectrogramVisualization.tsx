import React, { useEffect, useRef, useState, useCallback } from 'react';

interface SpectralRegion {
  startTime: number;
  endTime: number;
  lowFreq: number;
  highFreq: number;
  confidence?: number;
  patternId?: string;
  label?: string;
}

interface SpectrogramVisualizationProps {
  audioId: string;
  width?: number;
  height?: number;
  minFreq?: number;
  maxFreq?: number;
  colorMap?: 'viridis' | 'inferno' | 'magma' | 'plasma' | 'grayscale';
  showPatterns?: boolean;
  onRegionSelect?: (region: SpectralRegion) => void;
  selectedRegion?: SpectralRegion | null;
  zoomLevel?: number;
  timeRange?: [number, number]; // Start and end time in seconds
  syncWithWaveform?: boolean;
}

interface SpectrogramData {
  timePoints: number[];
  frequencies: number[];
  magnitudes: number[][];
  patterns?: SpectralRegion[];
  duration: number;
  sampleRate: number;
}

const defaultColors = {
  viridis: [
    { r: 70, g: 40, b: 90 },
    { r: 50, g: 100, b: 140 },
    { r: 30, g: 160, b: 120 },
    { r: 150, g: 180, b: 50 },
    { r: 250, g: 220, b: 30 }
  ]
};

const SpectrogramVisualization: React.FC<SpectrogramVisualizationProps> = ({
  audioId,
  width = 800,
  height = 300,
  minFreq = 20,
  maxFreq = 20000,
  colorMap = 'viridis',
  showPatterns = true,
  onRegionSelect,
  selectedRegion,
  zoomLevel = 1,
  timeRange,
  syncWithWaveform = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [spectrogramData, setSpectrogramData] = useState<SpectrogramData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);

  // Calculate frequency to Y coordinate (logarithmic scale)
  const freqToY = useCallback((freq: number): number => {
    const logMinFreq = Math.log(minFreq);
    const logMaxFreq = Math.log(maxFreq);
    const logFreq = Math.log(Math.max(freq, minFreq));
    return height - ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq)) * height;
  }, [height, minFreq, maxFreq]);

  // Convert Y coordinate to frequency
  const yToFreq = useCallback((y: number): number => {
    const logMinFreq = Math.log(minFreq);
    const logMaxFreq = Math.log(maxFreq);
    const normalizedY = 1 - (y / height);
    return Math.exp(logMinFreq + normalizedY * (logMaxFreq - logMinFreq));
  }, [height, minFreq, maxFreq]);

  // Draw spectrogram
  const drawSpectrogram = useCallback(() => {
    if (!canvasRef.current || !spectrogramData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const { timePoints, frequencies, magnitudes } = spectrogramData;
    const timeStep = width / timePoints.length;

    // Create image data for efficient rendering
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let t = 0; t < timePoints.length; t++) {
      const x = Math.floor(t * timeStep);
      if (x >= width) continue;

      for (let f = 0; f < frequencies.length; f++) {
        const y = Math.floor(freqToY(frequencies[f]));
        if (y < 0 || y >= height) continue;

        const magnitude = Math.min(1, Math.max(0, magnitudes[t][f]));
        const color = getColorFromMap(magnitude, colorMap);

        const pixelIndex = (y * width + x) * 4;
        data[pixelIndex] = color.r;
        data[pixelIndex + 1] = color.g;
        data[pixelIndex + 2] = color.b;
        data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [spectrogramData, width, height, freqToY, colorMap]);

  // Draw overlay (patterns, selection, etc.)
  const drawOverlay = useCallback(() => {
    if (!overlayCanvasRef.current || !spectrogramData) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw patterns if enabled
    if (showPatterns && spectrogramData.patterns) {
      spectrogramData.patterns.forEach(pattern => {
        const x1 = (pattern.startTime / spectrogramData.duration) * width;
        const x2 = (pattern.endTime / spectrogramData.duration) * width;
        const y1 = freqToY(pattern.highFreq);
        const y2 = freqToY(pattern.lowFreq);

        ctx.strokeStyle = `rgba(0, 255, 255, ${pattern.confidence || 0.8})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        if (pattern.label) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(x1, y1 - 20, ctx.measureText(pattern.label).width + 4, 20);
          ctx.fillStyle = '#fff';
          ctx.fillText(pattern.label, x1 + 2, y1 - 5);
        }
      });
    }

    // Draw selected region
    if (selectedRegion) {
      const x1 = (selectedRegion.startTime / spectrogramData.duration) * width;
      const x2 = (selectedRegion.endTime / spectrogramData.duration) * width;
      const y1 = freqToY(selectedRegion.highFreq);
      const y2 = freqToY(selectedRegion.lowFreq);

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    }

    // Draw current selection
    if (isSelecting && selectionStart && selectionEnd) {
      const x1 = Math.min(selectionStart.x, selectionEnd.x);
      const x2 = Math.max(selectionStart.x, selectionEnd.x);
      const y1 = Math.min(selectionStart.y, selectionEnd.y);
      const y2 = Math.max(selectionStart.y, selectionEnd.y);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    }
  }, [spectrogramData, width, height, showPatterns, selectedRegion, isSelecting, selectionStart, selectionEnd, freqToY]);

  // Handle mouse interactions
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!spectrogramData || !onRegionSelect) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  }, [spectrogramData, onRegionSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionEnd({ x, y });
  }, [isSelecting, selectionStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart || !selectionEnd || !spectrogramData || !onRegionSelect) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    setIsSelecting(false);

    const x1 = Math.min(selectionStart.x, selectionEnd.x);
    const x2 = Math.max(selectionStart.x, selectionEnd.x);
    const y1 = Math.min(selectionStart.y, selectionEnd.y);
    const y2 = Math.max(selectionStart.y, selectionEnd.y);

    // Convert coordinates to time and frequency
    const startTime = (x1 / width) * spectrogramData.duration;
    const endTime = (x2 / width) * spectrogramData.duration;
    const lowFreq = yToFreq(y2);
    const highFreq = yToFreq(y1);

    onRegionSelect({
      startTime,
      endTime,
      lowFreq,
      highFreq
    });
  }, [isSelecting, selectionStart, selectionEnd, spectrogramData, width, onRegionSelect, yToFreq]);

  useEffect(() => {
    drawSpectrogram();
  }, [drawSpectrogram]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900">
        <div className="animate-pulse text-gray-300">Loading spectrogram...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-red-900">
        <div className="text-red-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0"
      />
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsSelecting(false)}
      />
    </div>
  );
};

// Helper function to get color from selected color map
const getColorFromMap = (magnitude: number, colorMap: string): { r: number; g: number; b: number } => {
  switch (colorMap) {
    case 'viridis':
      return {
        r: Math.floor(70 + magnitude * 120),
        g: Math.floor(magnitude < 0.5 ? 40 + magnitude * 160 : 120 + (magnitude - 0.5) * 135),
        b: Math.floor(magnitude < 0.3 ? 90 + magnitude * 100 : 120 - (magnitude - 0.3) * 120)
      };
    case 'grayscale':
      const val = Math.floor(magnitude * 255);
      return { r: val, g: val, b: val };
    default:
      return {
        r: Math.floor(70 + magnitude * 120),
        g: Math.floor(40 + magnitude * 160),
        b: Math.floor(90 + magnitude * 100)
      };
  }
};

export default SpectrogramVisualization;