import { BasicMemoryManager } from './basic-memory-manager';

class MemoryMonitor {
  private manager: BasicMemoryManager;
  private interval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private maxHeap: number = 0;

  constructor() {
    this.manager = new BasicMemoryManager();
  }

  formatMB(bytes: number): string {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }

  printStatus() {
    const info = this.manager.getMemoryInfo();
    const stats = process.memoryUsage();
    const runtime = Date.now() - this.startTime;

    // Update max heap
    this.maxHeap = Math.max(this.maxHeap, stats.heapUsed);

    // Clear screen
    process.stdout.write('\x1Bc');

    console.log('Memory Monitor');
    console.log('==============');
    console.log(`Runtime: ${this.formatDuration(runtime)}`);
    console.log();
    
    console.log('Current Memory:');
    console.log(`  Heap Used:  ${this.formatMB(stats.heapUsed)}`);
    console.log(`  Heap Total: ${this.formatMB(stats.heapTotal)}`);
    console.log(`  RSS:        ${this.formatMB(stats.rss)}`);
    console.log();

    console.log('Memory Status:');
    console.log(`  Warning:    ${info.isWarning ? 'YES' : 'no'}`);
    console.log(`  Critical:   ${info.isCritical ? 'YES' : 'no'}`);
    console.log(`  Available:  ${this.formatMB(info.available)}`);
    console.log();

    console.log('Thresholds:');
    console.log(`  Warning:    ${this.formatMB(info.warning)}`);
    console.log(`  Critical:   ${this.formatMB(info.critical)}`);
    console.log(`  Min Free:   ${this.formatMB(info.minimumFree)}`);
    console.log();

    console.log('Statistics:');
    console.log(`  Max Heap:   ${this.formatMB(this.maxHeap)}`);
    console.log(`  Baseline:   ${this.formatMB(info.baseline)}`);
    
    if (info.isWarning || info.isCritical) {
      console.log('\nWARNING: Memory pressure detected!');
    }
  }

  start(intervalMs: number = 1000) {
    this.interval = setInterval(() => this.printStatus(), intervalMs);
    this.printStatus();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Run monitor if called directly
if (require.main === module) {
  const monitor = new MemoryMonitor();
  
  // Handle cleanup
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });

  monitor.start();
}