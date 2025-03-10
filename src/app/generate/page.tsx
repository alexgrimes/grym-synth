'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AudioLDMService } from '@/services/audio/AudioLDMService';
import { AudioWaveformVisualization } from '@/components/visualization/AudioWaveformVisualization';
import SpectrogramVisualization from '@/components/visualization/SpectrogramVisualization';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/utils';

// Viridis color palette from the SpectrogramVisualization component
const viridisColors = [
  { r: 70, g: 40, b: 90 },   // Dark purple
  { r: 50, g: 100, b: 140 }, // Blue
  { r: 30, g: 160, b: 120 }, // Teal
  { r: 150, g: 180, b: 50 }, // Green
  { r: 250, g: 220, b: 30 }  // Yellow
];

interface GenerationParameters {
  prompt: string;
  duration: number;
  diffusionSteps: number;
  guidanceScale: number;
  seed: number;
}

interface GeneratedAudio {
  id: string;
  audioBuffer: any; // Using any to avoid type conflicts
  audioUrl: string;
  parameters: GenerationParameters;
  timestamp: number;
}

export default function GeneratePage() {
  // State for generation parameters
  const [parameters, setParameters] = useState<GenerationParameters>({
    prompt: '',
    duration: 5,
    diffusionSteps: 50,
    guidanceScale: 7.5,
    seed: Math.floor(Math.random() * 1000000),
  });

  // State for audio generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([]);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // State for touch gestures and zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [timeRangeStart, setTimeRangeStart] = useState(0);
  const [timeRangeEnd, setTimeRangeEnd] = useState(0);

  // Refs
  const audioServiceRef = useRef<AudioLDMService | null>(null);
  const audioContextRef = useRef<any>(null);
  const audioSourceRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const visualizerRef = useRef<HTMLCanvasElement | null>(null);
  const visualizerContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const analyserRef = useRef<any>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const spectrogramContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize AudioLDM service
  useEffect(() => {
    const initAudioService = async () => {
      if (!audioServiceRef.current) {
        audioServiceRef.current = await AudioLDMService.initialize({
          model: 'audioldm-s-full',
          maxDuration: 30,
          sampleRate: 44100,
        });
      }
    };

    initAudioService();

    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Initialize visualizer
  useEffect(() => {
    if (visualizerRef.current) {
      visualizerContextRef.current = visualizerRef.current.getContext('2d');
    }
  }, []);

  // Handle parameter changes
  const handleParameterChange = (
    key: keyof GenerationParameters,
    value: string | number
  ) => {
    setParameters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Generate new random seed
  const handleRandomizeSeed = () => {
    setParameters((prev) => ({
      ...prev,
      seed: Math.floor(Math.random() * 1000000),
    }));
  };

  // Handle audio generation
  const handleGenerate = async () => {
    if (!audioServiceRef.current || !parameters.prompt.trim() || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing generation...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          const newProgress = prev + (1 / parameters.diffusionSteps) * 100;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });

        setGenerationStatus(`Generating audio... Step ${Math.floor(generationProgress / 100 * parameters.diffusionSteps)}/${parameters.diffusionSteps}`);
      }, 100);

      // Generate audio
      const result = await audioServiceRef.current.generateAudio({
        prompt: parameters.prompt,
        duration: parameters.duration,
        diffusionSteps: parameters.diffusionSteps,
        guidanceScale: parameters.guidanceScale,
        seed: parameters.seed,
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Audio generation complete!');

      // Create audio URL from buffer
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const audioBuffer = result.audioBuffer;

      // Convert AudioBuffer to Blob
      const numberOfChannels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      const audioData = new Float32Array(length * numberOfChannels);

      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          audioData[i * numberOfChannels + channel] = channelData[i];
        }
      }

      const wavBuffer = createWavFile(audioData, numberOfChannels, sampleRate);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);

      // Add to generated audios
      const newAudio: GeneratedAudio = {
        id: generateId(),
        audioBuffer,
        audioUrl,
        parameters: { ...parameters },
        timestamp: Date.now(),
      };

      setGeneratedAudios((prev) => [newAudio, ...prev]);
      setCurrentAudioId(newAudio.id);

      // Reset zoom and time range for the new audio
      setZoomLevel(1);
      setTimeRangeStart(0);
      setTimeRangeEnd(parameters.duration);

    } catch (error) {
      console.error('Error generating audio:', error);
      setGenerationStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Create WAV file from audio data
  const createWavFile = (
    audioData: Float32Array,
    numChannels: number,
    sampleRate: number
  ): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + audioData.length * 2);
    const view = new DataView(buffer);

    // Write WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioData.length * 2, true);
    writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, audioData.length * 2, true);

    // Write audio data
    const volume = 0.9;
    let offset = 44;
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i])) * volume;
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  };

  // Helper function to write strings to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Get color from viridis palette based on magnitude (0-1)
  const getViridisColor = (magnitude: number): string => {
    // Ensure magnitude is between 0 and 1
    magnitude = Math.max(0, Math.min(1, magnitude));

    // Calculate which segment of the gradient we're in
    const numColors = viridisColors.length;
    const segment = magnitude * (numColors - 1);
    const index = Math.floor(segment);
    const fraction = segment - index;

    // If we're at the last color, return it
    if (index >= numColors - 1) {
      const color = viridisColors[numColors - 1];
      return `rgb(${color.r}, ${color.g}, ${color.b})`;
    }

    // Interpolate between two colors
    const color1 = viridisColors[index];
    const color2 = viridisColors[index + 1];

    const r = Math.round(color1.r + fraction * (color2.r - color1.r));
    const g = Math.round(color1.g + fraction * (color2.g - color1.g));
    const b = Math.round(color1.b + fraction * (color2.b - color1.b));

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Play/pause audio
  const togglePlayback = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    if (isPlaying) {
      // Pause audio
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Play audio
      const currentAudio = generatedAudios.find(audio => audio.id === currentAudioId);
      if (!currentAudio) return;

      const source = audioContext.createBufferSource();
      source.buffer = currentAudio.audioBuffer;

      // Create analyzer for visualizer
      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContext.destination);

      source.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      source.start(0, currentTime);
      audioSourceRef.current = source;
      startTimeRef.current = audioContext.currentTime - currentTime;

      // Update current time during playback
      const updateTime = () => {
        if (audioContext && startTimeRef.current) {
          const newTime = audioContext.currentTime - startTimeRef.current;
          if (newTime <= currentAudio.audioBuffer.duration) {
            setCurrentTime(newTime);

            // Update visualizer
            if (analyserRef.current && visualizerContextRef.current && visualizerRef.current) {
              const bufferLength = analyserRef.current.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);
              analyserRef.current.getByteFrequencyData(dataArray);

              const canvas = visualizerRef.current;
              const ctx = visualizerContextRef.current;

              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Draw visualizer bars
              const barWidth = (canvas.width / bufferLength) * 2.5;
              let x = 0;

              for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 255 * canvas.height;
                const magnitude = dataArray[i] / 255;

                // Use viridis color palette
                ctx.fillStyle = getViridisColor(magnitude);

                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
              }
            }

            animationFrameRef.current = requestAnimationFrame(updateTime);
          } else {
            setCurrentTime(currentAudio.audioBuffer.duration);
            setIsPlaying(false);
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(updateTime);
      setIsPlaying(true);
    }
  };

  // Handle waveform click to seek
  const handleWaveformClick = (time: number) => {
    setCurrentTime(time);

    if (isPlaying) {
      // Stop current playback
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }

      // Start from new position
      const currentAudio = generatedAudios.find(audio => audio.id === currentAudioId);
      if (!currentAudio || !audioContextRef.current) return;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = currentAudio.audioBuffer;

      if (analyserRef.current) {
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      source.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      source.start(0, time);
      audioSourceRef.current = source;
      startTimeRef.current = audioContextRef.current.currentTime - time;
    }
  };

  // Handle audio selection
  const handleSelectAudio = (id: string) => {
    if (isPlaying) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      setIsPlaying(false);
    }

    setCurrentAudioId(id);
    setCurrentTime(0);

    // Reset zoom and time range for the selected audio
    setZoomLevel(1);
    const selectedAudio = generatedAudios.find(audio => audio.id === id);
    if (selectedAudio) {
      setTimeRangeStart(0);
      setTimeRangeEnd(selectedAudio.parameters.duration);
    }
  };

  // Download audio
  const handleDownload = () => {
    const currentAudio = generatedAudios.find(audio => audio.id === currentAudioId);
    if (!currentAudio) return;

    const a = document.createElement('a');
    a.href = currentAudio.audioUrl;
    a.download = `grym-synth-${currentAudio.parameters.prompt.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}-${currentAudio.id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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
      // Single touch for panning/swiping
      setTouchStartX(e.touches[0].clientX);
      setTouchStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling

    if (e.touches.length === 2 && touchStartDistance !== null) {
      // Pinch gesture - handle zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      // Calculate zoom factor based on pinch distance change
      const zoomFactor = currentDistance / touchStartDistance;
      const newZoomLevel = Math.max(1, Math.min(5, zoomLevel * zoomFactor));

      setZoomLevel(newZoomLevel);
      setTouchStartDistance(currentDistance); // Update for continuous zooming

      // Adjust time range based on zoom
      const currentAudio = generatedAudios.find(audio => audio.id === currentAudioId);
      if (currentAudio) {
        const duration = currentAudio.parameters.duration;
        const visibleDuration = duration / newZoomLevel;
        const center = (timeRangeStart + timeRangeEnd) / 2;

        // Keep the center point fixed while zooming
        const newStart = Math.max(0, center - visibleDuration / 2);
        const newEnd = Math.min(duration, center + visibleDuration / 2);

        setTimeRangeStart(newStart);
        setTimeRangeEnd(newEnd);
      }
    } else if (e.touches.length === 1 && touchStartX !== null) {
      // Single touch - handle panning/swiping
      const currentX = e.touches[0].clientX;
      const deltaX = touchStartX - currentX;

      const currentAudio = generatedAudios.find(audio => audio.id === currentAudioId);
      if (currentAudio) {
        const duration = currentAudio.parameters.duration;
        const visibleDuration = duration / zoomLevel;
        const panAmount = (deltaX / window.innerWidth) * visibleDuration;

        // Pan the time range
        let newStart = timeRangeStart + panAmount;
        let newEnd = timeRangeEnd + panAmount;

        // Ensure we don't go out of bounds
        if (newStart < 0) {
          newStart = 0;
          newEnd = visibleDuration;
        } else if (newEnd > duration) {
          newEnd = duration;
          newStart = duration - visibleDuration;
        }

        setTimeRangeStart(newStart);
        setTimeRangeEnd(newEnd);
      }

      setTouchStartX(currentX);
    }
  }, [touchStartDistance, touchStartX, zoomLevel, timeRangeStart, timeRangeEnd, currentAudioId, generatedAudios]);

  const handleTouchEnd = useCallback(() => {
    setTouchStartDistance(null);
    setTouchStartX(null);
    setTouchStartY(null);
  }, []);

  // Swipe handler for navigating between samples
  const handleSwipe = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null || generatedAudios.length <= 1) return;

    const endX = e.changedTouches[0].clientX;
    const deltaX = touchStartX - endX;

    // If the swipe is significant enough (more than 50px)
    if (Math.abs(deltaX) > 50) {
      const currentIndex = generatedAudios.findIndex(audio => audio.id === currentAudioId);
      if (currentIndex === -1) return;

      if (deltaX > 0 && currentIndex < generatedAudios.length - 1) {
        // Swipe left - next audio
        handleSelectAudio(generatedAudios[currentIndex + 1].id);
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe right - previous audio
        handleSelectAudio(generatedAudios[currentIndex - 1].id);
      }
    }
  }, [touchStartX, currentAudioId, generatedAudios, handleSelectAudio]);

  // Get current audio
  const currentAudio = generatedAudios.find(audio => audio.id === currentAudioId);

  // CSS variables for viridis colors
  const darkPurple = 'rgb(70, 40, 90)';
  const blue = 'rgb(50, 100, 140)';
  const teal = 'rgb(30, 160, 120)';
  const green = 'rgb(150, 180, 50)';
  const yellow = 'rgb(250, 220, 30)';

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 p-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#462A5A] via-[#32648C] to-[#1EA078]">
          grym-synth
        </h1>
      </header>

      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left sidebar - Pattern recognition controls */}
        <div className="w-full md:w-1/4 bg-gray-800 p-4 border-r border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-[#1EA078]">Pattern Recognition</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="patternThreshold" className="text-[#32648C]">Detection Threshold</Label>
              <Slider
                id="patternThreshold"
                min={0}
                max={1}
                step={0.01}
                value={[0.5]}
                onValueChange={() => {}}
                aria-label="Pattern Threshold"
                className="range-thumb:bg-[#1EA078]"
              />
            </div>

            <div>
              <Label htmlFor="patternSensitivity" className="text-[#32648C]">Sensitivity</Label>
              <Slider
                id="patternSensitivity"
                min={0}
                max={1}
                step={0.01}
                value={[0.7]}
                onValueChange={() => {}}
                aria-label="Pattern Sensitivity"
                className="range-thumb:bg-[#462A5A]"
              />
            </div>

            <div>
              <Label htmlFor="patternComplexity" className="text-[#32648C]">Complexity</Label>
              <Slider
                id="patternComplexity"
                min={1}
                max={10}
                step={1}
                value={[5]}
                onValueChange={() => {}}
                aria-label="Pattern Complexity"
                className="range-thumb:bg-[#32648C]"
              />
            </div>

            <Button
              variant="outline"
              className="w-full border-[#1EA078] text-[#1EA078] hover:bg-[#1EA078]/20 hover:text-[#1EA078]"
            >
              Detect Patterns
            </Button>
          </div>
        </div>

        {/* Center area - Main content with visualizer */}
        <div className="w-full md:w-2/4 flex flex-col">
          {/* Visualizer area */}
          <div
            className="flex-1 bg-gray-900 p-4 flex flex-col items-center justify-center"
            ref={spectrogramContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {currentAudio ? (
              <React.Fragment>
                {/* EQ Visualizer */}
                <div className="w-full h-48 bg-gray-800 rounded-lg overflow-hidden mb-4">
                  <canvas
                    ref={visualizerRef}
                    width={700}
                    height={192}
                    className="w-full h-full"
                  />
                </div>

                {/* Waveform with touch support */}
                <div
                  className="w-full relative"
                  ref={waveformContainerRef}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                >
                  <AudioWaveformVisualization
                    audioUrl={currentAudio.audioUrl}
                    width={700}
                    height={150}
                    isPlaying={isPlaying}
                    onWaveformClick={handleWaveformClick}
                    color="#32648C" // Blue from viridis
                    backgroundColor="#1f2937" // Gray-800
                  />

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                    <div
                      className="h-full bg-gradient-to-r from-[#462A5A] via-[#32648C] to-[#1EA078]"
                      style={{
                        width: `${(currentTime / currentAudio.parameters.duration) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Playback controls */}
                <div className="w-full flex items-center justify-between mt-4">
                  <div className="text-sm text-[#32648C]">
                    {formatTime(currentTime)} / {formatTime(currentAudio.parameters.duration)}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={togglePlayback}
                      variant="outline"
                      className="border-[#32648C] text-[#32648C] hover:bg-[#32648C]/20 hover:text-[#32648C]"
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>

                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="border-[#1EA078] text-[#1EA078] hover:bg-[#1EA078]/20 hover:text-[#1EA078]"
                    >
                      Download
                    </Button>
                  </div>

                  <div className="text-sm text-[#32648C]">
                    Zoom: {zoomLevel.toFixed(1)}x
                  </div>
                </div>
              </React.Fragment>
            ) : (
              <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg border border-gray-700 w-full">
                <p className="text-lg">Generate audio to visualize</p>
              </div>
            )}
          </div>

          {/* Chat input */}
          <div className="p-4 border-t border-gray-800 bg-gray-900 flex">
            <Input
              placeholder="What would you like to hear?"
              value={parameters.prompt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange('prompt', e.target.value)}
              disabled={isGenerating}
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-[#1EA078] focus:ring-[#1EA078]"
            />
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !parameters.prompt.trim()}
              className="ml-2 bg-gradient-to-r from-[#462A5A] via-[#32648C] to-[#1EA078] hover:opacity-90 transition-opacity"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Right sidebar - XenakisLDM controls and history */}
        <div className="w-full md:w-1/4 bg-gray-800 p-4 border-l border-gray-700 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-[#1EA078]">Audio XenakisLDM</h2>

          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between mb-1">
                <Label htmlFor="duration" className="text-[#32648C]">Duration</Label>
                <span className="text-[#1EA078]">{parameters.duration}s</span>
              </div>
              <Slider
                id="duration"
                min={1}
                max={30}
                step={1}
                value={[parameters.duration]}
                onValueChange={(value: number[]) => handleParameterChange('duration', value[0])}
                disabled={isGenerating}
                aria-label="Duration"
                className="range-thumb:bg-[#1EA078]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <Label htmlFor="diffusionSteps" className="text-[#32648C]">Steps</Label>
                <span className="text-[#1EA078]">{parameters.diffusionSteps}</span>
              </div>
              <Slider
                id="diffusionSteps"
                min={10}
                max={100}
                step={5}
                value={[parameters.diffusionSteps]}
                onValueChange={(value: number[]) => handleParameterChange('diffusionSteps', value[0])}
                disabled={isGenerating}
                aria-label="Diffusion Steps"
                className="range-thumb:bg-[#462A5A]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <Label htmlFor="guidanceScale" className="text-[#32648C]">Guidance</Label>
                <span className="text-[#1EA078]">{parameters.guidanceScale.toFixed(1)}</span>
              </div>
              <Slider
                id="guidanceScale"
                min={1}
                max={15}
                step={0.5}
                value={[parameters.guidanceScale]}
                onValueChange={(value: number[]) => handleParameterChange('guidanceScale', value[0])}
                disabled={isGenerating}
                aria-label="Guidance Scale"
                className="range-thumb:bg-[#32648C]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <Label htmlFor="seed" className="text-[#32648C]">Seed</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRandomizeSeed}
                  disabled={isGenerating}
                  className="text-[#1EA078] hover:text-white hover:bg-gray-700 p-0 h-6"
                >
                  Randomize
                </Button>
              </div>
              <Input
                id="seed"
                type="number"
                value={parameters.seed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange('seed', parseInt(e.target.value))}
                disabled={isGenerating}
                className="w-full bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {isGenerating && (
            <div className="mb-4">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#462A5A] via-[#32648C] to-[#1EA078] transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-sm text-[#32648C] mt-2">{generationStatus}</p>
            </div>
          )}

          {/* Generation history */}
          <div className="flex-1 overflow-hidden">
            <h3 className="text-md font-semibold mb-2 text-[#1EA078]">History</h3>

            <div
              className="space-y-2 max-h-[calc(100%-2rem)] overflow-y-auto"
              onTouchEnd={handleSwipe}
            >
              {generatedAudios.length > 0 ? (
                generatedAudios.map((audio) => (
                  <div
                    key={audio.id}
                    className={cn(
                      "p-2 rounded-lg cursor-pointer transition-colors",
                      audio.id === currentAudioId
                        ? "bg-[#32648C]/30 border border-[#32648C]"
                        : "bg-gray-700 border border-gray-600 hover:bg-gray-600"
                    )}
                    onClick={() => handleSelectAudio(audio.id)}
                  >
                    <div className="font-medium truncate text-white">{audio.parameters.prompt}</div>
                    <div className="text-xs text-[#32648C] mt-1">
                      {new Date(audio.timestamp).toLocaleTimeString()} •
                      {audio.parameters.duration}s
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 bg-gray-700 rounded-lg border border-gray-600">
                  <p>No generations yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

