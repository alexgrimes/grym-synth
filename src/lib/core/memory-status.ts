/**
 * Simple memory status reporting
 */
export interface MemoryStatus {
  used: number;
  total: number;
  available: number;
  percentUsed: number;
}

export function getMemoryStatus(): MemoryStatus {
  const stats = process.memoryUsage();
  const used = stats.heapUsed;
  const total = stats.heapTotal;
  const available = total - used;
  const percentUsed = (used / total) * 100;

  return {
    used,
    total,
    available,
    percentUsed
  };
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;

  while (value > 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value.toFixed(2)}${units[unit]}`;
}

export function printMemoryStatus(): void {
  const status = getMemoryStatus();
  console.log('Memory Status:');
  console.log(`  Used:      ${formatBytes(status.used)}`);
  console.log(`  Total:     ${formatBytes(status.total)}`);
  console.log(`  Available: ${formatBytes(status.available)}`);
  console.log(`  Usage:     ${status.percentUsed.toFixed(1)}%`);
}