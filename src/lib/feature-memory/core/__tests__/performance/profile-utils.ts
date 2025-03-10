import { cpus, CpuInfo } from "os";
import { performance } from "perf_hooks";

export interface CPUProfile {
  timestamp: number;
  usage: {
    user: number;
    system: number;
    total: number;
  };
  load: number[];
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
}

export interface ProfileSession {
  startTime: number;
  endTime?: number;
  duration?: number;
  samples: CPUProfile[];
  averages: {
    cpu: number;
    memory: number;
    load: number;
  };
  peaks: {
    cpu: number;
    memory: number;
    load: number;
  };
}

export interface ProfilerTimer {
  id: NodeJS.Timeout;
  clear(): void;
}

export class Timer implements ProfilerTimer {
  public id: NodeJS.Timeout;

  constructor(callback: () => void, interval: number) {
    this.id = setInterval(callback, interval);
  }

  clear(): void {
    clearInterval(this.id);
  }

  [Symbol.dispose](): void {
    this.clear();
  }
}

export class PerformanceProfiler {
  private sessions: Map<string, ProfileSession>;
  private activeProfiles: Map<string, Timer>;
  private sampleInterval: number;

  constructor(sampleInterval: number = 100) {
    // 100ms default sampling
    this.sessions = new Map();
    this.activeProfiles = new Map();
    this.sampleInterval = sampleInterval;
  }

  public startProfiling(sessionId: string): void {
    if (this.activeProfiles.has(sessionId)) {
      throw new Error(`Profile session ${sessionId} is already running`);
    }

    const session: ProfileSession = {
      startTime: performance.now(),
      samples: [],
      averages: { cpu: 0, memory: 0, load: 0 },
      peaks: { cpu: 0, memory: 0, load: 0 },
    };

    this.sessions.set(sessionId, session);
    let lastCPUUsage = process.cpuUsage();
    let lastTimestamp = performance.now();

    const timer = new Timer(() => {
      const currentTimestamp = performance.now();
      const elapsed = (currentTimestamp - lastTimestamp) / 1000; // Convert to seconds
      const currentCPUUsage = process.cpuUsage();
      const cpuDiff = {
        user: (currentCPUUsage.user - lastCPUUsage.user) / 1000000, // Convert to seconds
        system: (currentCPUUsage.system - lastCPUUsage.system) / 1000000,
      };

      const loadAvg = cpus().map((cpu: CpuInfo) => {
        const total = Object.values(cpu.times).reduce(
          (a: number, b: number) => a + b,
          0
        );
        return (
          ((cpu.times.user + cpu.times.nice + cpu.times.sys) / total) * 100
        );
      });

      const memoryUsage = process.memoryUsage();
      const profile: CPUProfile = {
        timestamp: currentTimestamp,
        usage: {
          user: cpuDiff.user / elapsed,
          system: cpuDiff.system / elapsed,
          total: (cpuDiff.user + cpuDiff.system) / elapsed,
        },
        load: loadAvg,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers || 0,
        },
      };

      session.samples.push(profile);
      lastCPUUsage = currentCPUUsage;
      lastTimestamp = currentTimestamp;

      // Update peaks
      session.peaks.cpu = Math.max(session.peaks.cpu, profile.usage.total);
      session.peaks.memory = Math.max(
        session.peaks.memory,
        profile.memory.heapUsed
      );
      session.peaks.load = Math.max(
        session.peaks.load,
        Math.max(...profile.load)
      );
    }, this.sampleInterval);

    this.activeProfiles.set(sessionId, timer);
  }

  public stopProfiling(sessionId: string): ProfileSession {
    const timer = this.activeProfiles.get(sessionId);
    if (!timer) {
      throw new Error(`No active profile session found for ${sessionId}`);
    }

    timer.clear();
    this.activeProfiles.delete(sessionId);

    const session = this.sessions.get(sessionId)!;
    session.endTime = performance.now();
    session.duration = session.endTime - session.startTime;

    // Calculate averages
    if (session.samples.length > 0) {
      session.averages = {
        cpu: this.calculateAverage(session.samples.map((s) => s.usage.total)),
        memory: this.calculateAverage(
          session.samples.map((s) => s.memory.heapUsed)
        ),
        load: this.calculateAverage(session.samples.flatMap((s) => s.load)),
      };
    }

    return session;
  }

  public clear(): void {
    // Stop all active profiling
    for (const [sessionId, timer] of this.activeProfiles.entries()) {
      timer.clear();
      this.activeProfiles.delete(sessionId);
    }
    this.sessions.clear();
  }

  public getSession(sessionId: string): ProfileSession | undefined {
    return this.sessions.get(sessionId);
  }

  public generateReport(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`No profile session found for ${sessionId}`);
    }

    return this.formatSessionReport(session);
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private formatSessionReport(session: ProfileSession): string {
    const report = [
      `Performance Profile Report`,
      `Duration: ${this.formatDuration(session.duration || 0)}`,
      `Samples: ${session.samples.length}`,
      "",
      "Averages:",
      `  CPU Usage: ${session.averages.cpu.toFixed(2)}%`,
      `  Memory: ${this.formatBytes(session.averages.memory)}`,
      `  System Load: ${session.averages.load.toFixed(2)}%`,
      "",
      "Peaks:",
      `  CPU Usage: ${session.peaks.cpu.toFixed(2)}%`,
      `  Memory: ${this.formatBytes(session.peaks.memory)}`,
      `  System Load: ${session.peaks.load.toFixed(2)}%`,
      "",
      "Timeline:",
      ...session.samples.map(
        (sample) =>
          `[${this.formatTimestamp(
            sample.timestamp
          )}] CPU: ${sample.usage.total.toFixed(2)}% ` +
          `Mem: ${this.formatBytes(sample.memory.heapUsed)} ` +
          `Load: ${this.calculateAverage(sample.load).toFixed(2)}%`
      ),
    ];

    return report.join("\n");
  }

  private formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
  }

  private formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString().split("T")[1].slice(0, -1);
  }
}

export const profiler = new PerformanceProfiler();
export default profiler;
