import { EventEmitter } from 'events';

export interface ExportProgress {
  percentage: number;
  stage: string;
  timeRemaining: number;
  currentFile: string;
  bytesProcessed: number;
  estimatedTotalBytes: number;
}

interface ProgressSnapshot {
  timestamp: number;
  bytesProcessed: number;
}

export class ExportProgressTracker extends EventEmitter {
  private startTime: number;
  private snapshots: ProgressSnapshot[] = [];
  private currentStage: string = '';
  private currentFile: string = '';
  private bytesProcessed: number = 0;
  private estimatedTotalBytes: number = 0;
  private readonly snapshotWindowSize = 10; // Number of snapshots to keep for rate calculation
  private stageWeights: Map<string, number>;

  constructor(estimatedTotalBytes: number) {
    super();
    this.startTime = Date.now();
    this.estimatedTotalBytes = estimatedTotalBytes;

    // Define stage weights for more accurate progress calculation
    this.stageWeights = new Map([
      ['initializing', 0.05],
      ['analyzing', 0.10],
      ['processing', 0.70],
      ['encoding', 0.10],
      ['finalizing', 0.05]
    ]);
  }

  public updateProgress(bytesProcessed: number, currentFile: string): void {
    this.bytesProcessed = bytesProcessed;
    this.currentFile = currentFile;

    // Add snapshot for throughput calculation
    this.addSnapshot(bytesProcessed);

    // Emit progress update
    this.emitProgress();
  }

  public setStage(stage: string): void {
    if (!this.stageWeights.has(stage)) {
      throw new Error(`Invalid export stage: ${stage}`);
    }
    this.currentStage = stage;
    this.emitProgress();
  }

  public updateTotalBytes(newEstimate: number): void {
    this.estimatedTotalBytes = newEstimate;
    this.emitProgress();
  }

  private addSnapshot(bytesProcessed: number): void {
    this.snapshots.push({
      timestamp: Date.now(),
      bytesProcessed
    });

    // Keep only recent snapshots for accurate rate calculation
    if (this.snapshots.length > this.snapshotWindowSize) {
      this.snapshots.shift();
    }
  }

  private calculateTimeRemaining(): number {
    if (this.snapshots.length < 2) {
      return -1; // Not enough data for estimation
    }

    // Calculate processing rate (bytes per millisecond)
    const oldestSnapshot = this.snapshots[0];
    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    const timeSpan = latestSnapshot.timestamp - oldestSnapshot.timestamp;
    const bytesProcessed = latestSnapshot.bytesProcessed - oldestSnapshot.bytesProcessed;

    if (timeSpan === 0 || bytesProcessed === 0) {
      return -1;
    }

    const bytesPerMs = bytesProcessed / timeSpan;
    const remainingBytes = this.estimatedTotalBytes - this.bytesProcessed;

    // Convert to seconds and add 10% buffer for final processing
    return Math.ceil((remainingBytes / bytesPerMs) / 1000 * 1.1);
  }

  private calculateTotalProgress(): number {
    if (!this.currentStage || this.estimatedTotalBytes === 0) {
      return 0;
    }

    // Get all stages in order
    const stages = Array.from(this.stageWeights.keys());
    const currentStageIndex = stages.indexOf(this.currentStage);

    // Calculate base progress from completed stages
    let progress = stages
      .slice(0, currentStageIndex)
      .reduce((sum, stage) => sum + (this.stageWeights.get(stage) || 0), 0);

    // Add progress from current stage
    const currentStageWeight = this.stageWeights.get(this.currentStage) || 0;
    const stageProgress = this.bytesProcessed / this.estimatedTotalBytes;
    progress += currentStageWeight * stageProgress;

    // Ensure progress stays within bounds
    return Math.min(Math.max(progress * 100, 0), 100);
  }

  private emitProgress(): void {
    const progress: ExportProgress = {
      percentage: this.calculateTotalProgress(),
      stage: this.currentStage,
      timeRemaining: this.calculateTimeRemaining(),
      currentFile: this.currentFile,
      bytesProcessed: this.bytesProcessed,
      estimatedTotalBytes: this.estimatedTotalBytes
    };

    this.emit('progress', progress);
  }

  public getProgress(): ExportProgress {
    return {
      percentage: this.calculateTotalProgress(),
      stage: this.currentStage,
      timeRemaining: this.calculateTimeRemaining(),
      currentFile: this.currentFile,
      bytesProcessed: this.bytesProcessed,
      estimatedTotalBytes: this.estimatedTotalBytes
    };
  }
}
