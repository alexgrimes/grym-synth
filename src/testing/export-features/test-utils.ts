import { jest } from '@jest/globals';

export interface Track {
  id: string;
  buffer: AudioBuffer;
  name: string;
  routing?: {
    sends: string[];
    output: string;
  };
}

export interface MultitrackExportOptions {
  format: 'wav' | 'mp3';
  createReaperProject: boolean;
}

export interface MultitrackExportResult {
  trackCount: number;
  format: string;
  reaperProject?: boolean;
  tracks: {
    id: string;
    file: Blob;
    name: string;
  }[];
}

export async function createTestMultitrackProject(trackCount: number): Promise<Track[]> {
  const tracks: Track[] = [];

  for (let i = 0; i < trackCount; i++) {
    const buffer = await createTestAudioBuffer(44100, 2, 30); // 30-second tracks
    tracks.push({
      id: `track-${i + 1}`,
      buffer,
      name: `Track ${i + 1}`,
      routing: {
        sends: i < trackCount - 1 ? [`track-${i + 2}`] : [], // Each track sends to next track
        output: 'master'
      }
    });
  }

  return tracks;
}

export async function exportMultitrack(
  tracks: Track[],
  options: MultitrackExportOptions,
  onProgress?: (progress: number) => void
): Promise<MultitrackExportResult> {
  // Mock multitrack export implementation
  const exportedTracks = [];

  for (let i = 0; i < tracks.length; i++) {
    if (!tracks[i].buffer) {
      throw new Error('Invalid audio buffer');
    }

    exportedTracks.push({
      id: tracks[i].id,
      file: new Blob([], { type: `audio/${options.format}` }),
      name: tracks[i].name
    });

    // Report progress after each track
    if (onProgress) {
      const progress = Math.round(((i + 1) / tracks.length) * 100);
      onProgress(progress);
    }
  }

  return {
    trackCount: tracks.length,
    format: options.format,
    reaperProject: options.createReaperProject,
    tracks: exportedTracks
  };
}

export async function createTestAudioBuffer(
  sampleRate: number,
  channelCount: number,
  durationSeconds: number
): Promise<AudioBuffer> {
  const frameCount = sampleRate * durationSeconds;

  // Create mock AudioBuffer
  const buffer = {
    sampleRate,
    length: frameCount,
    duration: durationSeconds,
    numberOfChannels: channelCount,
    getChannelData: jest.fn((channel: number) => {
      // Create a mock Float32Array with sine wave data
      const samples = new Float32Array(frameCount);
      const frequency = 440; // A4 note

      for (let i = 0; i < frameCount; i++) {
        samples[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
      }

      return samples;
    }),
  } as unknown as AudioBuffer;

  return buffer;
}

// Mock result types for our export functions
export interface ExportResult {
  format: string;
  sampleRate?: number;
  bitRate?: number;
  channelCount?: number;
  file?: Blob;
}

// Mock export functions that our tests will use
export async function exportToWAV(
  buffer: AudioBuffer,
  options: { sampleRate: number; bitDepth: number }
): Promise<ExportResult> {
  // In a real implementation, this would encode the audio buffer to WAV format
  return {
    format: 'wav',
    sampleRate: options.sampleRate,
    channelCount: buffer.numberOfChannels,
    file: new Blob([], { type: 'audio/wav' })
  };
}

export async function exportToMP3(
  buffer: AudioBuffer,
  options: { bitRate: number }
): Promise<ExportResult> {
  // In a real implementation, this would encode the audio buffer to MP3 format
  return {
    format: 'mp3',
    bitRate: options.bitRate,
    channelCount: buffer.numberOfChannels,
    file: new Blob([], { type: 'audio/mp3' })
  };
}
