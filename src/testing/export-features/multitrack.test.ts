import { describe, test, expect, jest } from '@jest/globals';
import {
  createTestMultitrackProject,
  exportMultitrack,
  Track,
  MultitrackExportResult
} from './test-utils';

describe('Multitrack Export Tests', () => {
  test('exports multitrack project with correct structure', async () => {
    const tracks = await createTestMultitrackProject(8); // 8 tracks
    const result = await exportMultitrack(tracks, {
      format: 'wav',
      createReaperProject: true
    });

    expect(result.trackCount).toBe(8);
    expect(result.format).toBe('wav');
    expect(result.reaperProject).toBeTruthy();
    expect(result.tracks).toHaveLength(8);

    // Verify track properties
    result.tracks.forEach((track, index) => {
      expect(track.id).toBe(`track-${index + 1}`);
      expect(track.name).toBe(`Track ${index + 1}`);
      expect(track.file).toBeDefined();
      expect(track.file.type).toBe('audio/wav');
    });
  });

  test('maintains track relationships and routing', async () => {
    const tracks = await createTestMultitrackProject(4);

    // Verify initial routing setup
    tracks.forEach((track, index) => {
      if (index < tracks.length - 1) {
        expect(track.routing?.sends).toContain(`track-${index + 2}`);
        expect(track.routing?.output).toBe('master');
      }
    });

    // Export with routing preservation
    const result = await exportMultitrack(tracks, {
      format: 'wav',
      createReaperProject: true
    });

    expect(result.trackCount).toBe(4);
    expect(result.reaperProject).toBeTruthy();

    // In a real implementation, we would verify the Reaper project
    // file contains correct routing information
  });

  test('exports large projects within memory constraints', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const TRACK_COUNT = 32; // Test with a larger number of tracks

    // Create and export a large project
    const tracks = await createTestMultitrackProject(TRACK_COUNT);
    const result = await exportMultitrack(tracks, {
      format: 'wav',
      createReaperProject: true
    });

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Verify export completed successfully
    expect(result.trackCount).toBe(TRACK_COUNT);
    expect(result.tracks).toHaveLength(TRACK_COUNT);

    // Verify memory usage stayed within reasonable bounds
    // This is a simplified check - in reality you'd want to monitor
    // memory usage throughout the export process
    const maxAllowedIncrease = 1024 * 1024 * 100; // 100MB
    expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
  });

  test('handles track export errors gracefully', async () => {
    // Create a project with an invalid track
    const tracks = await createTestMultitrackProject(3);
    const invalidTrack: Track = {
      id: 'invalid-track',
      buffer: null as unknown as AudioBuffer, // Simulate invalid buffer
      name: 'Invalid Track'
    };
    tracks.push(invalidTrack);

    // Export should fail gracefully
    await expect(
      exportMultitrack(tracks, {
        format: 'wav',
        createReaperProject: true
      })
    ).rejects.toThrow('Invalid audio buffer');
  });

  test('supports export progress monitoring', async () => {
    const tracks = await createTestMultitrackProject(4);
    const progressEvents: number[] = [];

    // Mock progress callback
    const onProgress = jest.fn((progress: number) => {
      progressEvents.push(progress);
    });

    // Export with progress monitoring
    const result = await exportMultitrack(
      tracks,
      {
        format: 'wav',
        createReaperProject: true
      },
      onProgress
    );

    expect(result.trackCount).toBe(4);
    expect(onProgress).toHaveBeenCalled();

    // Verify progress reporting
    expect(progressEvents[0]).toBeGreaterThan(0);
    expect(progressEvents[progressEvents.length - 1]).toBe(100);
    expect(progressEvents).toEqual(expect.arrayContaining([25, 50, 75, 100]));
  });
});
