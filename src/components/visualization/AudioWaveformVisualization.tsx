import React, { useEffect, useRef, useState, useCallback } from 'react';

interface AudioWaveformVisualizationProps {
  audioUrl?: string;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  isPlaying?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onWaveformClick?: (time: number) => void;
  zoomLevel?: number;
  timeRange?: [number, number] | undefined; // Start and end time in seconds
  onZoomChange?: (zoomLevel: number) => void;
  onTimeRangeChange?: (timeRange: [number, number] | undefined) => void;
}

export const AudioWaveformVisualization: React.FC<AudioWaveformVisualizationProps> = ({
  audioUrl,
  width = 800,
  height = 200,
  color = '#4F46E5', // Indigo-600
  backgroundColor = '#F3F4F6', // Gray-100
  isPlaying = false,
  onTimeUpdate,
  onWaveformClick,
  zoomLevel = 1,
  timeRange,
  onZoomChange,
  onTimeRangeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Touch gesture state
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [internalZoomLevel, setInternalZoomLevel] = useState<number>(zoomLevel);
  const [internalTimeRange, setInternalTimeRange] = useState<[number, number]>([0, 30]);

  // Initialize internal state
  useEffect(() => {
    // Always set the internal zoom level from props
    setInternalZoomLevel(zoomLevel);
  }, [zoomLevel]);

  useEffect(() => {
    // Always set the internal time range from props, with a fallback
    setInternalTimeRange(timeRange || [0, 30]);
  }, [timeRange]);

  // Define drawWaveform function first
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    // Always ensure we have a valid canvas and time range
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const audioBuffer = audioBufferRef.current;
    const amp = height / 2;

    // Always draw something, either a placeholder or the actual waveform
    if (!audioBuffer) {
      // Draw a placeholder waveform if no audio buffer is available
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      // Draw a simple sine wave as placeholder
      for (let i = 0; i < width; i++) {
        const x = i;
        const y = amp * (1 + 0.3 * Math.sin(i * 0.1)) + amp * 0.2 * Math.sin(i * 0.01);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    } else {
      // Draw the actual waveform
      const channelData = audioBuffer.getChannelData(0); // Get mono or left channel
      const sampleRate = audioBuffer.sampleRate;
      const [startTime, endTime] = internalTimeRange;

      // Calculate sample indices based on time range
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.min(Math.ceil(endTime * sampleRate), channelData.length);

      // Calculate step size based on visible range
      const visibleSamples = endSample - startSample;
      const step = Math.max(1, Math.ceil(visibleSamples / width));

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      // Draw the waveform for the visible time range
      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;

        const sampleOffset = startSample + Math.floor(i * (visibleSamples / width));

        // Ensure we don't go out of bounds
        if (sampleOffset >= channelData.length) break;

        for (let j = 0; j < step && sampleOffset + j < channelData.length; j++) {
          const datum = channelData[sampleOffset + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
      }

      ctx.stroke();
    }
  }, [backgroundColor, color, height, width, internalTimeRange]);

  // Initialize audio context and load audio
  useEffect(() => {
    // Always set loading state at the beginning
    setIsLoading(true);
    setError(null);

    const initializeAudioContext = async () => {
      try {
        // Create AudioContext if it doesn't exist (always do this)
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContextClass() as AudioContext;
        }

        // If no audio URL is provided, create a dummy buffer
        if (!audioUrl) {
          createDummyBuffer();
          setIsLoading(false);
          return;
        }

        try {
          // Fetch and decode audio data
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          if (audioContextRef.current) {
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            audioBufferRef.current = audioBuffer;

            // Draw waveform
            drawWaveform();
          }
        } catch (fetchErr) {
          console.warn(`Audio file not found: ${audioUrl}. Using dummy waveform.`);
          // Create a dummy waveform if the audio file doesn't exist
          createDummyBuffer();
        }
      } catch (err) {
        setError('Failed to initialize audio context');
        console.error('Error initializing audio:', err);
        // Create a dummy buffer even on error
        createDummyBuffer();
      } finally {
        setIsLoading(false);
      }
    };

    // Helper function to create a dummy buffer
    const createDummyBuffer = () => {
      if (!audioContextRef.current) return;

      const sampleRate = 44100;
      const dummyBuffer = audioContextRef.current.createBuffer(
        1, // mono
        sampleRate * 30, // 30 seconds
        sampleRate
      );

      // Fill with a simple sine wave
      const channelData = dummyBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        // Create a simple pattern with varying frequencies
        channelData[i] =
          0.5 * Math.sin(i * 0.01) +
          0.3 * Math.sin(i * 0.03) +
          0.2 * Math.sin(i * 0.05);
      }

      audioBufferRef.current = dummyBuffer;
      drawWaveform();
    };

    initializeAudioContext();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl, drawWaveform]);

  // Update drawWaveform when dependencies change
  useEffect(() => {
    // Always draw waveform, even if there's no audio buffer
    // The drawWaveform function will handle the case when there's no audio buffer
    drawWaveform();
  }, [drawWaveform]);

  // Handle touch events for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Pinch gesture start - calculate initial distance between two fingers
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setTouchStartDistance(distance);
    } else if (e.touches.length === 1) {
      // Single touch for panning
      setTouchStartX(e.touches[0].clientX);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling

    // Get the current duration (with fallback)
    const duration = audioBufferRef.current?.duration || 30; // Default to 30 seconds if no audio buffer

    // Handle pinch gesture for zooming
    if (e.touches.length === 2 && touchStartDistance !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      // Calculate zoom factor based on pinch distance change
      const zoomFactor = currentDistance / touchStartDistance;
      const newZoomLevel = Math.max(1, Math.min(5, internalZoomLevel * zoomFactor));

      // Update zoom level
      setInternalZoomLevel(newZoomLevel);
      if (onZoomChange) {
        onZoomChange(newZoomLevel);
      }

      // Adjust time range based on zoom
      const visibleDuration = duration / newZoomLevel;
      const center = (internalTimeRange[0] + internalTimeRange[1]) / 2;

      // Keep the center point fixed while zooming
      const newStart = Math.max(0, center - visibleDuration / 2);
      const newEnd = Math.min(duration, center + visibleDuration / 2);

      const newTimeRange: [number, number] = [newStart, newEnd];
      setInternalTimeRange(newTimeRange);
      if (onTimeRangeChange) {
        onTimeRangeChange(newTimeRange);
      }

      setTouchStartDistance(currentDistance); // Update for continuous zooming

      // Redraw waveform with new zoom level
      drawWaveform();
    }
    // Handle single touch for panning
    else if (e.touches.length === 1 && touchStartX !== null) {
      const currentX = e.touches[0].clientX;
      const deltaX = touchStartX - currentX;

      const visibleDuration = internalTimeRange[1] - internalTimeRange[0];
      const panAmount = (deltaX / width) * visibleDuration;

      // Pan the time range
      let newStart = internalTimeRange[0] + panAmount;
      let newEnd = internalTimeRange[1] + panAmount;

      // Ensure we don't go out of bounds
      if (newStart < 0) {
        newStart = 0;
        newEnd = visibleDuration;
      } else if (newEnd > duration) {
        newEnd = duration;
        newStart = duration - visibleDuration;
      }

      const newTimeRange: [number, number] = [newStart, newEnd];
      setInternalTimeRange(newTimeRange);
      if (onTimeRangeChange) {
        onTimeRangeChange(newTimeRange);
      }

      setTouchStartX(currentX);

      // Redraw waveform with new time range
      drawWaveform();
    }
  }, [touchStartDistance, touchStartX, internalZoomLevel, internalTimeRange, width, onZoomChange, onTimeRangeChange, drawWaveform]);

  const handleTouchEnd = useCallback(() => {
    setTouchStartDistance(null);
    setTouchStartX(null);
  }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;

    // Calculate time based on visible range
    const visibleDuration = internalTimeRange[1] - internalTimeRange[0];
    const time = internalTimeRange[0] + (x / width) * visibleDuration;

    // Only call the callback if it exists
    if (onWaveformClick) {
      onWaveformClick(time);
    }
  }, [internalTimeRange, width, onWaveformClick]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg">
        <div className="animate-pulse text-gray-600">Loading audio...</div>
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

  // Initialize animationFrameRef
  if (animationFrameRef.current === undefined) {
    animationFrameRef.current = 0;
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg cursor-pointer"
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    </div>
  );
};
