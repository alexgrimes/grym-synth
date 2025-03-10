import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AudioService from '../../../services/api/AudioService';
import SystemHealthDashboard from '../../../components/monitoring/SystemHealthDashboard';
import SpectrogramVisualization from '../../../components/visualization/SpectrogramVisualization';
import { AudioWaveformVisualization } from '../../../components/visualization/AudioWaveformVisualization';
import { PatternVisualization } from '../../../components/visualization/PatternVisualization';
import { 
  SpectralRegion, 
  AudioMetadata, 
  WaveformRegion 
} from '../../../components/visualization/types';
import type {
  AudioPattern,
  AudioPatternBase,
  SystemHealthStatus
} from '../../../services/api/types';

interface PageProps {
  params: {
    audioId: string;
  };
}

const AudioEditorPage: React.FC<PageProps> = () => {
  const params = useParams();
  const audioId = params.audioId as string;

  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<SpectralRegion | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<[number, number] | undefined>(undefined);
  const [patterns, setPatterns] = useState<SpectralRegion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);

  useEffect(() => {
    const loadAudioData = async () => {
      if (!audioId) return;

      try {
        setIsLoading(true);
        const metadata = await AudioService.getAudioFile(audioId);
        const audioPatterns = await AudioService.getPatterns(audioId);

        // Transform metadata to match AudioMetadata interface
        const transformedMetadata: AudioMetadata = {
          id: metadata.id,
          name: metadata.name,
          duration: metadata.duration,
          format: metadata.format,
          sampleRate: metadata.sampleRate,
          channels: metadata.channels,
          createdAt: metadata.createdAt
        };

        setAudioMetadata(transformedMetadata);
        setPatterns(audioPatterns);
      } catch (err) {
        console.error('Error loading audio data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load audio data');
      } finally {
        setIsLoading(false);
      }
    };

    loadAudioData();
  }, [audioId]);

  const handleWaveformRegionSelect = (region: WaveformRegion) => {
    setTimeRange([region.start, region.end]);
    setSelectedRegion(null);
  };

  const handleSpectrogramRegionSelect = (region: SpectralRegion) => {
    setSelectedRegion(region);
  };

  const handleSavePattern = async () => {
    if (!selectedRegion || !audioId) return;

    try {
      // Convert SpectralRegion to AudioPatternBase for saving
      const patternBase: AudioPatternBase = {
        audioFileId: audioId,
        startTime: selectedRegion.startTime,
        endTime: selectedRegion.endTime,
        lowFreq: selectedRegion.lowFreq,
        highFreq: selectedRegion.highFreq,
        confidence: selectedRegion.confidence,
        label: selectedRegion.label,
        metadata: {}
      };

      const savedPattern = await AudioService.savePattern(audioId, selectedRegion);
      setPatterns(currentPatterns => [...currentPatterns, savedPattern]);
    } catch (err) {
      console.error('Failed to save pattern:', err);
      // Could add toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading audio data...</p>
        </div>
      </div>
    );
  }

  if (error || !audioMetadata) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-red-500">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error || 'Failed to load audio data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold">{audioMetadata.name}</h1>
            <p className="text-sm text-gray-400">
              {audioMetadata.format} | {audioMetadata.sampleRate}Hz | {audioMetadata.channels} channels
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            {selectedRegion && (
              <button
                className="px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                onClick={handleSavePattern}
              >
                Save Pattern
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-4">
        {/* Waveform */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <AudioWaveformVisualization
            audioUrl={`/api/audio/${audioId}/stream`}
            height={160}
            isPlaying={isPlaying}
            onTimeUpdate={setPlaybackPosition}
            onWaveformClick={(time: number) => setPlaybackPosition(time)}
          />
        </div>

        {/* Spectrogram */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <SpectrogramVisualization
            audioId={audioId}
            height={400}
            showPatterns={true}
            onRegionSelect={handleSpectrogramRegionSelect}
            selectedRegion={selectedRegion}
            timeRange={timeRange}
            syncWithWaveform={true}
          />
        </div>

        {/* Pattern Analysis and System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pattern Analysis */}
          <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Pattern Analysis</h2>
            {selectedRegion ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400">Time Range</label>
                    <p>
                      {selectedRegion.startTime.toFixed(2)}s - {selectedRegion.endTime.toFixed(2)}s
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400">Frequency Range</label>
                    <p>
                      {selectedRegion.lowFreq.toFixed(0)}Hz - {selectedRegion.highFreq.toFixed(0)}Hz
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Pattern Label</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:border-blue-500"
                    placeholder="Enter pattern label"
                    value={selectedRegion.label || ''}
                    onChange={(e) => setSelectedRegion({ ...selectedRegion, label: e.target.value })}
                  />
                </div>
                <div>
                  <PatternVisualization
                    patterns={[selectedRegion]}
                    width={300}
                    height={100}
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-400">
                Select a region on the spectrogram to analyze patterns
              </p>
            )}

            {/* Saved Patterns */}
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-2">Saved Patterns</h3>
              <div className="grid grid-cols-2 gap-2">
                {patterns.map((pattern, index) => (
                  <div
                    key={pattern.patternId || index}
                    className="p-2 border border-gray-700 rounded-md hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => setSelectedRegion(pattern)}
                  >
                    <div className="font-medium">{pattern.label || `Pattern ${index + 1}`}</div>
                    <div className="text-sm text-gray-400">
                      {pattern.startTime.toFixed(2)}s - {pattern.endTime.toFixed(2)}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">System Health</h2>
            <SystemHealthDashboard 
              refreshInterval={5000}
              onAlert={(metric: string, value: number) => {
                console.warn(`System alert: ${metric} = ${value}`);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AudioEditorPage;