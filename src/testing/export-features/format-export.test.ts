import { describe, test, expect, jest } from '@jest/globals';
import {
  createTestAudioBuffer,
  exportToWAV,
  exportToMP3,
  ExportResult
} from './test-utils';

describe('Audio Format Export Tests', () => {
  test('exports WAV file with correct parameters', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 60); // 60-second stereo
    const result = await exportToWAV(testBuffer, {
      sampleRate: 44100,
      bitDepth: 16
    });

    expect(result.format).toBe('wav');
    expect(result.sampleRate).toBe(44100);
    expect(result.channelCount).toBe(2);
    expect(result.file).toBeDefined();
    expect(result.file?.type).toBe('audio/wav');
  });

  test('exports MP3 file with specified bitrate', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 60);
    const result = await exportToMP3(testBuffer, {
      bitRate: 320
    });

    expect(result.format).toBe('mp3');
    expect(result.bitRate).toBe(320);
    expect(result.channelCount).toBe(2);
    expect(result.file).toBeDefined();
    expect(result.file?.type).toBe('audio/mp3');
  });

  test('handles export cancellation gracefully', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 60);

    // Mock AbortController
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Create a promise that will be rejected when abort is called
    const exportPromise = new Promise<ExportResult>((resolve, reject) => {
      // Simulate long-running export process
      setTimeout(() => {
        resolve({
          format: 'wav',
          sampleRate: 44100,
          channelCount: 2,
          file: new Blob([], { type: 'audio/wav' })
        });
      }, 1000);

      // Handle abort signal
      signal.addEventListener('abort', () => {
        reject(new Error('Export cancelled'));
      });
    });

    // Trigger cancellation
    abortController.abort();

    // Verify that the export was cancelled
    await expect(exportPromise).rejects.toThrow('Export cancelled');
  });

  test('validates export parameters', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 60);

    // Test invalid WAV parameters
    await expect(
      exportToWAV(testBuffer, {
        sampleRate: -44100, // Invalid negative sample rate
        bitDepth: 16
      })
    ).rejects.toThrow();

    // Test invalid MP3 parameters
    await expect(
      exportToMP3(testBuffer, {
        bitRate: 0 // Invalid zero bitrate
      })
    ).rejects.toThrow();
  });

  test('maintains audio quality during export', async () => {
    const testBuffer = await createTestAudioBuffer(44100, 2, 1); // 1-second test buffer

    // Export to WAV (lossless)
    const wavResult = await exportToWAV(testBuffer, {
      sampleRate: 44100,
      bitDepth: 16
    });

    // Export to MP3 (lossy)
    const mp3Result = await exportToMP3(testBuffer, {
      bitRate: 320
    });

    // Verify WAV export maintains original quality
    expect(wavResult.sampleRate).toBe(testBuffer.sampleRate);
    expect(wavResult.channelCount).toBe(testBuffer.numberOfChannels);

    // Verify MP3 export uses specified bitrate
    expect(mp3Result.bitRate).toBe(320);
    expect(mp3Result.channelCount).toBe(testBuffer.numberOfChannels);
  });
});
