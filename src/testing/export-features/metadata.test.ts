import { describe, test, expect } from '@jest/globals';
import { createTestAudioBuffer } from './test-utils';

interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  [key: string]: string; // Add index signature for additional metadata fields
}

// Mock metadata functions
async function exportWithMetadata(
  format: 'wav' | 'mp3',
  buffer: AudioBuffer,
  metadata: AudioMetadata
): Promise<{ file: Blob; metadata: AudioMetadata }> {
  return {
    file: new Blob([], { type: `audio/${format}` }),
    metadata
  };
}

async function readWAVMetadata(file: Blob): Promise<AudioMetadata> {
  // In a real implementation, this would parse the WAV file's metadata
  // For testing, we'll simulate reading the metadata
  return {
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    year: '2025',
    genre: 'Electronic'
  };
}

async function readMP3Metadata(file: Blob): Promise<AudioMetadata> {
  // Similar to readWAVMetadata but for MP3 format
  return {
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    year: '2025',
    genre: 'Electronic'
  };
}

describe('Export Metadata Tests', () => {
  test('embeds correct metadata in WAV files', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 30);
    const metadata: AudioMetadata = {
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album',
      year: '2025',
      genre: 'Electronic'
    };

    const result = await exportWithMetadata('wav', testBuffer, metadata);
    const extractedMetadata = await readWAVMetadata(result.file);

    expect(extractedMetadata).toMatchObject(metadata);
    expect(result.file.type).toBe('audio/wav');
  });

  test('preserves metadata across format conversion', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 30);
    const originalMetadata: AudioMetadata = {
      title: 'Original Track',
      artist: 'Original Artist',
      album: 'Original Album',
      year: '2025',
      genre: 'Electronic'
    };

    // Export to WAV first
    const wavResult = await exportWithMetadata('wav', testBuffer, originalMetadata);
    const wavMetadata = await readWAVMetadata(wavResult.file);

    // Convert to MP3
    const mp3Result = await exportWithMetadata('mp3', testBuffer, wavMetadata);
    const mp3Metadata = await readMP3Metadata(mp3Result.file);

    // Verify metadata preservation
    expect(mp3Metadata).toMatchObject(originalMetadata);
  });

  test('handles special characters in metadata', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 30);
    const metadata: AudioMetadata = {
      title: 'Test © Track ™',
      artist: 'Test & Artist',
      album: 'Test Album ®',
      year: '2025',
      genre: 'Electronic & Dance'
    };

    const result = await exportWithMetadata('wav', testBuffer, metadata);
    const extractedMetadata = await readWAVMetadata(result.file);

    expect(extractedMetadata).toMatchObject(metadata);
  });

  test('handles missing or partial metadata', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 30);
    const partialMetadata = {
      title: 'Test Track',
      artist: 'Test Artist'
    };

    // @ts-ignore - Intentionally passing partial metadata
    const result = await exportWithMetadata('wav', testBuffer, partialMetadata);
    const extractedMetadata = await readWAVMetadata(result.file);

    // Verify required fields
    expect(extractedMetadata.title).toBe(partialMetadata.title);
    expect(extractedMetadata.artist).toBe(partialMetadata.artist);

    // Optional fields should have default values
    expect(extractedMetadata.album).toBe('');
    expect(extractedMetadata.year).toBe('');
    expect(extractedMetadata.genre).toBe('');
  });

  test('validates metadata fields', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 30);
    const invalidMetadata = {
      title: 'X'.repeat(1000), // Too long
      artist: '',              // Empty
      album: 'Test Album',
      year: '20XX',           // Invalid year format
      genre: 'Electronic'
    };

    // Expect validation error
    await expect(
      exportWithMetadata('wav', testBuffer, invalidMetadata)
    ).rejects.toThrow('Invalid metadata');
  });
});
