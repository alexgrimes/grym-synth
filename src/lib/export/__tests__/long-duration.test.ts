import { performance } from 'perf_hooks';
import {
  generateTestBuffer,
  createMockProject,
  MemoryMonitor,
  CpuMonitor,
  ProgressTracker,
  createPerformanceMetrics
} from './test-utils';

import { exportAudio, ExportOptions, ExportResult } from '../export';

describe('Long Duration Export Tests', () => {
  let memoryMonitor: MemoryMonitor;
  let cpuMonitor: CpuMonitor;
  let progressTracker: ProgressTracker;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
    cpuMonitor = new CpuMonitor();
    progressTracker = new ProgressTracker();
  });

  afterEach(() => {
    memoryMonitor.stop();
    cpuMonitor.stop();
  });

  test('exports 10-minute stereo WAV file', async () => {
    const buffer = generateTestBuffer({
      duration: 10,
      channelCount: 2,
      sampleRate: 48000
    });

    const startTime = performance.now();
    memoryMonitor.start();
    cpuMonitor.start();
    progressTracker.start();

    const result = await exportAudio({
      format: 'wav',
      quality: 'high',
      sampleRate: 48000,
      channels: buffer,
      onProgress: (progress: number) => {
        progressTracker.update(progress);
      }
    });

    const endTime = performance.now();
    const metrics = createPerformanceMetrics(
      memoryMonitor,
      cpuMonitor,
      startTime,
      endTime,
      result.fileSize
    );

    // Verify performance targets from plan
    expect(metrics.duration).toBeLessThan(3 * 60 * 1000); // < 3 minutes
    expect(metrics.peakMemoryUsage).toBeLessThan(512); // < 512MB
    expect(metrics.averageCpuUsage).toBeLessThan(80); // < 80% CPU

    // Verify progress tracking
    const progressMetrics = progressTracker.getMetrics();
    expect(progressMetrics.isMonotonic).toBe(true);

    // Verify file characteristics
    expect(result.sampleRate).toBe(48000);
    expect(result.channelCount).toBe(2);
    expect(result.duration).toBeCloseTo(600); // 10 minutes in seconds
  }, 300000); // 5 minute timeout

  test('exports 32-track project', async () => {
    const project = createMockProject({
      trackCount: 32,
      duration: 5, // 5 minute test file
      sampleRate: 48000
    });

    const startTime = performance.now();
    memoryMonitor.start();
    cpuMonitor.start();
    progressTracker.start();

    const results = await Promise.all(project.tracks.map((channels, index) =>
      exportAudio({
        format: 'wav',
        quality: 'high',
        sampleRate: 48000,
        channels,
        filename: `track-${index + 1}.wav`,
        onProgress: (progress: number) => {
          // Scale progress to track portion
          progressTracker.update((progress + index) / project.tracks.length);
        }
      })
    ));

    const endTime = performance.now();
    const totalBytes = results.reduce((sum: number, r: ExportResult) => sum + r.fileSize, 0);

    const metrics = createPerformanceMetrics(
      memoryMonitor,
      cpuMonitor,
      startTime,
      endTime,
      totalBytes
    );

    // Performance verification
    expect(metrics.duration).toBeLessThan(10 * 60 * 1000); // < 10 minutes for 32 tracks
    expect(metrics.peakMemoryUsage).toBeLessThan(512); // Memory target
    expect(metrics.averageCpuUsage).toBeLessThan(80); // CPU target

    // Verify all tracks exported successfully
    expect(results).toHaveLength(32);
    results.forEach((result: ExportResult) => {
      expect(result.success).toBe(true);
      expect(result.sampleRate).toBe(48000);
      expect(result.channelCount).toBe(2);
      expect(result.duration).toBeCloseTo(300); // 5 minutes in seconds
    });
  }, 600000); // 10 minute timeout

  test('handles memory pressure', async () => {
    // Create a large project to test memory handling
    const project = createMockProject({
      trackCount: 16,
      duration: 30, // 30 minute test file
      sampleRate: 96000 // High sample rate to increase memory pressure
    });

    const startTime = performance.now();
    memoryMonitor.start();
    cpuMonitor.start();
    progressTracker.start();

    // Simulate memory pressure by allocating arrays
    const memoryPressure: Float64Array[] = [];
    const pressureInterval = setInterval(() => {
      try {
        memoryPressure.push(new Float64Array(1024 * 1024 * 10)); // Allocate 10MB
      } catch (e) {
        // Ignore allocation failures
      }
    }, 1000);

    try {
      const results = await Promise.all(project.tracks.map((channels, index) =>
        exportAudio({
          format: 'wav',
          quality: 'medium', // Use medium quality under pressure
          sampleRate: 96000,
          channels,
          filename: `pressure-track-${index + 1}.wav`,
          onProgress: (progress: number) => {
            progressTracker.update((progress + index) / project.tracks.length);
          }
        })
      ));

      const endTime = performance.now();
      const totalBytes = results.reduce((sum: number, r: ExportResult) => sum + r.fileSize, 0);

      const metrics = createPerformanceMetrics(
        memoryMonitor,
        cpuMonitor,
        startTime,
        endTime,
        totalBytes
      );

      // Even under pressure, exports should complete within memory target
      expect(metrics.peakMemoryUsage).toBeLessThan(512);

      // Verify exports completed successfully
      expect(results).toHaveLength(16);
      results.forEach((result: ExportResult) => {
        expect(result.success).toBe(true);
        expect(result.sampleRate).toBe(96000);
        expect(result.duration).toBeCloseTo(1800); // 30 minutes in seconds
      });

    } finally {
      clearInterval(pressureInterval);
      memoryPressure.length = 0; // Clear pressure arrays
    }
  }, 1800000); // 30 minute timeout

  test('maintains quality under CPU load', async () => {
    const buffer = generateTestBuffer({
      duration: 5,
      channelCount: 2,
      sampleRate: 96000
    });

    // Create CPU load
    const cpuLoad = () => {
      const start = performance.now();
      while (performance.now() - start < 100) {
        Math.random() * Math.random();
      }
    };
    const loadInterval = setInterval(cpuLoad, 100);

    try {
      const startTime = performance.now();
      memoryMonitor.start();
      cpuMonitor.start();
      progressTracker.start();

      const result = await exportAudio({
        format: 'wav',
        quality: 'high',
        sampleRate: 96000,
        channels: buffer,
        onProgress: (progress: number) => {
          progressTracker.update(progress);
        }
      });

      const endTime = performance.now();
      const metrics = createPerformanceMetrics(
        memoryMonitor,
        cpuMonitor,
        startTime,
        endTime,
        result.fileSize
      );

      // Even under CPU load, quality should be maintained
      expect(result.quality).toBe('high');

      // Progress should still be monotonic
      expect(progressTracker.getMetrics().isMonotonic).toBe(true);

    } finally {
      clearInterval(loadInterval);
    }
  }, 300000); // 5 minute timeout
});
