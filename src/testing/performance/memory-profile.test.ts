import { memoryUtils, MemoryProfile, MemoryProfiler } from './memory-utils';

// Mock audio processing function
async function processAudioBuffer(buffer: Float32Array): Promise<void> {
  // Simulate audio processing with memory allocation
  const processingChunks: Float32Array[] = [];
  const chunkSize = 1024;

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, i + chunkSize);
    // Simulate processing with some basic operations
    const processed = chunk.map(sample => sample * 0.5);
    processingChunks.push(new Float32Array(processed));
  }

  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
}

// Mock visualization function
async function renderVisualization(): Promise<void> {
  const width = 800;
  const height = 600;
  const dataPoints = new Array(width).fill(0).map(() => Math.random());

  // Simulate visualization memory usage
  const visualizationData = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      visualizationData[y * width + x] = dataPoints[x] * Math.sin(y / 10);
    }
  }

  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate rendering time
}

describe('Memory Profiling', () => {
  beforeEach(() => {
    // Clear any cached data and force GC if possible
    if (global.gc) {
      global.gc();
    }
  });

  test('heap usage stays within limits during audio processing', async () => {
    const profile = await memoryUtils.measureHeapUsage(5000);

    // Verify memory limits
    expect(profile.peakUsage).toBeLessThan(512 * 1024 * 1024); // 512MB limit
    expect(profile.averageUsage).toBeLessThan(256 * 1024 * 1024); // 256MB average
  });

  test('no memory leaks in core operations', async () => {
    const operations = [
      {
        name: 'audioProcessing',
        operation: async () => {
          // Simulate audio processing with a 2-second stereo buffer
          const buffer = new Float32Array(44100 * 2);
          await processAudioBuffer(buffer);
        }
      },
      {
        name: 'visualization',
        operation: async () => {
          // Simulate visualization rendering
          await renderVisualization();
        }
      }
    ];

    const leaks = await memoryUtils.checkMemoryLeaks(operations);
    expect(leaks).toHaveLength(0);
  });

  test('garbage collection frequency is reasonable', async () => {
    const gcMetrics = await memoryUtils.monitorGarbageCollection(10000);
    expect(gcMetrics.frequency).toBeLessThan(10); // Less than 10 GC events per minute
  });

  test('memory profile shows expected characteristics', async () => {
    const profiler = new MemoryProfiler();
    const profile = await profiler.measureOperation(async () => {
      // Run a series of operations to test profiling
      const buffer = new Float32Array(44100); // 1 second mono buffer
      await processAudioBuffer(buffer);
      await renderVisualization();
    });

    expect(profile).toMatchObject({
      peakUsage: expect.any(Number),
      averageUsage: expect.any(Number),
      timestamp: expect.any(Number),
      gcEvents: expect.any(Number)
    });

    // Verify reasonable memory usage patterns
    expect(profile.peakUsage).toBeGreaterThan(0);
    expect(profile.averageUsage).toBeLessThan(profile.peakUsage);
    expect(profile.timestamp).toBeGreaterThan(0);
  });
});
