import { performance } from 'perf_hooks';
import os from 'os';

/**
 * Test audio buffer configuration
 */
interface AudioBufferConfig {
  duration: number;       // Duration in minutes
  channelCount: number;   // Number of channels (1=mono, 2=stereo)
  sampleRate: number;     // Sample rate in Hz
}

/**
 * Mock multitrack project configuration
 */
interface MultitrackConfig {
  trackCount: number;     // Number of tracks
  duration: number;       // Duration in minutes
  sampleRate: number;     // Sample rate in Hz
}

/**
 * Performance metrics for export operations
 */
interface PerformanceMetrics {
  duration: number;       // Total duration in ms
  peakMemoryUsage: number;
  averageCpuUsage: number;
  throughputMbps: number;
  startTime: number;
  endTime: number;
}

/**
 * Generate a test audio buffer with specified parameters
 */
export function generateTestBuffer({ duration, channelCount, sampleRate }: AudioBufferConfig): Float32Array[] {
  const sampleCount = Math.floor(duration * 60 * sampleRate);
  const channels: Float32Array[] = [];

  for (let c = 0; c < channelCount; c++) {
    const buffer = new Float32Array(sampleCount);
    // Generate a 440Hz sine wave
    for (let i = 0; i < sampleCount; i++) {
      buffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
    channels.push(buffer);
  }

  return channels;
}

/**
 * Create a mock multitrack project with specified parameters
 */
export function createMockProject({ trackCount, duration, sampleRate }: MultitrackConfig): {
  tracks: Float32Array[][],
  metadata: Record<string, any>
} {
  const tracks: Float32Array[][] = [];

  for (let t = 0; t < trackCount; t++) {
    const trackBuffer = generateTestBuffer({
      duration,
      channelCount: 2, // Stereo tracks
      sampleRate
    });
    tracks.push(trackBuffer);
  }

  return {
    tracks,
    metadata: {
      name: `Test Project ${trackCount} tracks`,
      sampleRate,
      duration,
      trackCount
    }
  };
}

/**
 * Monitor memory usage during export
 */
export class MemoryMonitor {
  private measurements: number[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  start(intervalMs: number = 1000) {
    this.measurements = [];
    this.interval = setInterval(() => {
      const used = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      this.measurements.push(used);
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getPeakUsage(): number {
    return Math.max(...this.measurements);
  }

  getAverageUsage(): number {
    return this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
  }
}

/**
 * Track CPU utilization during export
 */
export class CpuMonitor {
  private measurements: number[] = [];
  private lastMeasurement: { idle: number; total: number } | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  start(intervalMs: number = 1000) {
    this.measurements = [];
    this.lastMeasurement = this.getCpuUsage();

    this.interval = setInterval(() => {
      const measurement = this.getCpuUsage();
      if (this.lastMeasurement) {
        const idleDifference = measurement.idle - this.lastMeasurement.idle;
        const totalDifference = measurement.total - this.lastMeasurement.total;
        const usage = 100 - (100 * idleDifference / totalDifference);
        this.measurements.push(usage);
      }
      this.lastMeasurement = measurement;
    }, intervalMs);
  }

  private getCpuUsage() {
    const cpus = os.cpus();
    return cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return {
        idle: acc.idle + cpu.times.idle,
        total: acc.total + total
      };
    }, { idle: 0, total: 0 });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getAverageUsage(): number {
    return this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
  }
}

/**
 * Track and verify export progress
 */
export class ProgressTracker {
  private updates: { timestamp: number; progress: number }[] = [];
  private startTime: number = 0;

  start() {
    this.updates = [];
    this.startTime = performance.now();
  }

  update(progress: number) {
    this.updates.push({
      timestamp: performance.now(),
      progress
    });
  }

  getMetrics() {
    return {
      duration: performance.now() - this.startTime,
      updateCount: this.updates.length,
      averageInterval: this.getAverageInterval(),
      isMonotonic: this.verifyMonotonicProgress()
    };
  }

  private getAverageInterval(): number {
    if (this.updates.length < 2) return 0;

    let totalInterval = 0;
    for (let i = 1; i < this.updates.length; i++) {
      totalInterval += this.updates[i].timestamp - this.updates[i-1].timestamp;
    }
    return totalInterval / (this.updates.length - 1);
  }

  private verifyMonotonicProgress(): boolean {
    for (let i = 1; i < this.updates.length; i++) {
      if (this.updates[i].progress < this.updates[i-1].progress) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Create performance metrics for an export operation
 */
export function createPerformanceMetrics(
  memoryMonitor: MemoryMonitor,
  cpuMonitor: CpuMonitor,
  startTime: number,
  endTime: number,
  bytesProcessed: number
): PerformanceMetrics {
  const duration = endTime - startTime;
  const throughputMbps = (bytesProcessed * 8) / (1000000 * (duration / 1000));

  return {
    duration,
    peakMemoryUsage: memoryMonitor.getPeakUsage(),
    averageCpuUsage: cpuMonitor.getAverageUsage(),
    throughputMbps,
    startTime,
    endTime
  };
}
