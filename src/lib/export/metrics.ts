import { performance } from 'perf_hooks';
import { CpuInfo } from 'os';
import * as os from 'os';

/**
 * Export performance metrics
 */
export interface ExportMetrics {
  duration: number;          // Total export duration in ms
  peakMemoryUsage: number;  // Peak memory usage in MB
  averageCpuUsage: number;  // Average CPU usage percentage
  throughputMbps: number;   // Export throughput in Mbps
  errorCount: number;       // Number of errors encountered
  recoveryTime: number;     // Time spent in recovery operations
}

/**
 * Export stage timing data
 */
export interface StageTiming {
  stage: string;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Export operation metadata
 */
export interface ExportOperationData {
  id: string;
  startTime: number;
  endTime: number;
  format: 'wav' | 'mp3';
  quality: 'high' | 'medium' | 'low';
  sampleRate: number;
  channelCount: number;
  duration: number;
  fileSize: number;
  stages: StageTiming[];
  errors: Error[];
}

/**
 * CPU times interface
 */
interface CpuTimes {
  user: number;
  nice: number;
  sys: number;
  idle: number;
  irq: number;
}

/**
 * Manages metrics collection for export operations
 */
export class MetricsCollector {
  private operations: Map<string, ExportOperationData> = new Map();
  private currentStages: Map<string, { stage: string; startTime: number }> = new Map();

  /**
   * Start tracking a new export operation
   */
  startOperation(
    id: string,
    format: 'wav' | 'mp3',
    quality: 'high' | 'medium' | 'low',
    sampleRate: number,
    channelCount: number,
    duration: number
  ): void {
    this.operations.set(id, {
      id,
      startTime: performance.now(),
      endTime: 0,
      format,
      quality,
      sampleRate,
      channelCount,
      duration,
      fileSize: 0,
      stages: [],
      errors: []
    });
  }

  /**
   * Record the start of a processing stage
   */
  startStage(operationId: string, stage: string): void {
    this.currentStages.set(operationId, {
      stage,
      startTime: performance.now()
    });
  }

  /**
   * Record the end of a processing stage
   */
  endStage(operationId: string): void {
    const current = this.currentStages.get(operationId);
    const operation = this.operations.get(operationId);

    if (current && operation) {
      const endTime = performance.now();
      operation.stages.push({
        stage: current.stage,
        startTime: current.startTime,
        endTime,
        duration: endTime - current.startTime
      });
      this.currentStages.delete(operationId);
    }
  }

  /**
   * Record error occurrence
   */
  recordError(operationId: string, error: Error): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.errors.push(error);
    }
  }

  /**
   * Complete export operation tracking
   */
  completeOperation(operationId: string, fileSize: number): ExportMetrics {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`No operation found with id ${operationId}`);
    }

    operation.endTime = performance.now();
    operation.fileSize = fileSize;

    const metrics: ExportMetrics = {
      duration: operation.endTime - operation.startTime,
      peakMemoryUsage: this.calculatePeakMemoryUsage(),
      averageCpuUsage: this.calculateAverageCpuUsage(),
      throughputMbps: this.calculateThroughput(operation),
      errorCount: operation.errors.length,
      recoveryTime: this.calculateRecoveryTime(operation)
    };

    return metrics;
  }

  /**
   * Calculate peak memory usage during export
   */
  private calculatePeakMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024; // Convert to MB
  }

  /**
   * Calculate average CPU usage during export
   */
  private calculateAverageCpuUsage(): number {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc: number, cpu: CpuInfo) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce(
      (acc: number, cpu: CpuInfo) =>
        acc + Object.values(cpu.times).reduce((sum: number, time: number) => sum + time, 0),
      0
    );
    return 100 - (100 * totalIdle / totalTick);
  }

  /**
   * Calculate export throughput in Mbps
   */
  private calculateThroughput(operation: ExportOperationData): number {
    const durationSeconds = (operation.endTime - operation.startTime) / 1000;
    const fileSizeBits = operation.fileSize * 8;
    return fileSizeBits / (1000000 * durationSeconds); // Mbps
  }

  /**
   * Calculate time spent in error recovery
   */
  private calculateRecoveryTime(operation: ExportOperationData): number {
    return operation.stages
      .filter(stage => stage.stage.includes('recovery'))
      .reduce((total, stage) => total + stage.duration, 0);
  }

  /**
   * Get detailed metrics for an operation
   */
  getOperationDetails(operationId: string): ExportOperationData | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Generate performance report for an operation
   */
  generateReport(operationId: string): string {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return `No data found for operation ${operationId}`;
    }

    const metrics = this.completeOperation(operationId, operation.fileSize);

    return `
Export Operation Report
----------------------
ID: ${operation.id}
Format: ${operation.format}
Quality: ${operation.quality}
Duration: ${metrics.duration.toFixed(2)}ms
Peak Memory: ${metrics.peakMemoryUsage.toFixed(2)}MB
Avg CPU Usage: ${metrics.averageCpuUsage.toFixed(2)}%
Throughput: ${metrics.throughputMbps.toFixed(2)}Mbps
Errors: ${metrics.errorCount}
Recovery Time: ${metrics.recoveryTime.toFixed(2)}ms

Stage Timings:
${operation.stages
  .map(
    stage =>
      `${stage.stage}: ${stage.duration.toFixed(2)}ms (${(
        (stage.duration / metrics.duration) *
        100
      ).toFixed(1)}%)`
  )
  .join('\n')}

${
  operation.errors.length
    ? `\nErrors:\n${operation.errors
        .map(error => `- ${error.message}`)
        .join('\n')}`
    : ''
}
    `.trim();
  }
}

/**
 * Global metrics collector instance
 */
export const metricsCollector = new MetricsCollector();
