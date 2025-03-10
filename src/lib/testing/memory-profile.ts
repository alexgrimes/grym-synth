import { EventEmitter } from 'events';

export interface MemorySnapshot {
  timestamp: number;
  heap: number;
  external: number;
  arrayBuffers: number;
  total: number;
  rss: number;
  label?: string;
}

export interface ModelEvent {
  type: 'load' | 'unload';
  model: string;
  timestamp: number;
}

export class MemoryProfiler extends EventEmitter {
  private snapshots: Map<string, MemorySnapshot> = new Map();
  private memoryLimit: number;
  private isTracking: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private startTime: number;

  constructor(memoryLimit: number = 16 * 1024 * 1024 * 1024) { // 16GB default
    super();
    this.memoryLimit = memoryLimit;
    this.startTime = Date.now();
  }

  // Alias methods to match test expectations
  start(): void {
    this.startTracking();
  }

  stop(): void {
    this.stopTracking();
  }

  async getActualMemoryUsage(): Promise<MemorySnapshot> {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now() - this.startTime,
      heap: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers || 0,
      total: usage.heapTotal,
      rss: usage.rss
    };
  }

  startTracking(intervalMs: number = 1000): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.startTime = Date.now();
    
    // Take initial snapshot
    this.takeSnapshot('tracking_start');

    this.intervalId = setInterval(async () => {
      const snapshot = await this.getActualMemoryUsage();
      const currentTotal = snapshot.heap + snapshot.external;
      
      if (currentTotal > this.memoryLimit) {
        this.emit('memoryLimitExceeded', {
          current: currentTotal,
          limit: this.memoryLimit
        });
      }
      
      this.snapshots.set(`auto_${snapshot.timestamp}`, snapshot);
    }, intervalMs);
  }

  stopTracking(): void {
    if (!this.isTracking) return;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    // Take final snapshot
    this.takeSnapshot('tracking_stop');
    this.isTracking = false;
  }

  async takeSnapshot(label: string): Promise<MemorySnapshot> {
    const snapshot = await this.getActualMemoryUsage();
    snapshot.label = label;
    this.snapshots.set(label, snapshot);
    return snapshot;
  }

  checkMemoryUsage(): boolean {
    const usage = process.memoryUsage();
    const total = usage.heapUsed + usage.external;
    return total <= this.memoryLimit;
  }

  getMemoryDelta(startLabel: string, endLabel: string): { heapDelta: number; totalDelta: number } | null {
    const startSnap = this.snapshots.get(startLabel);
    const endSnap = this.snapshots.get(endLabel);

    if (!startSnap || !endSnap) {
      return null;
    }

    return {
      heapDelta: endSnap.heap - startSnap.heap,
      totalDelta: (endSnap.heap + endSnap.external) - (startSnap.heap + startSnap.external)
    };
  }

  getPeakMemoryUsage(): number {
    return Math.max(...Array.from(this.snapshots.values())
      .map(s => s.heap + s.external));
  }

  getMemoryLimit(): number {
    return this.memoryLimit;
  }

  getAllSnapshots(): MemorySnapshot[] {
    return Array.from(this.snapshots.values());
  }

  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}