import {
  measureStartupTime,
  measureAudioProcessingPerformance,
  measureVisualizationPerformance,
  measureLLMPerformance,
  measureExportPerformance
} from './performance-utils';

describe('Performance Benchmarks', () => {
  // Add buffer time between tests to avoid interference
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('startup time meets target', async () => {
    const startupTime = await measureStartupTime();
    expect(startupTime).toBeLessThan(2000); // Less than 2 seconds
    console.log(`Startup time: ${startupTime.toFixed(2)}ms`);
  });

  test('audio processing latency', async () => {
    const latency = await measureAudioProcessingPerformance();
    expect(latency).toBeLessThan(50); // Less than 50ms
    console.log(`Audio processing latency: ${latency.toFixed(2)}ms`);
  });

  test('visualization frame rate', async () => {
    const fps = await measureVisualizationPerformance();
    expect(fps).toBeGreaterThan(30); // Above 30fps
    console.log(`Visualization frame rate: ${fps.toFixed(2)} FPS`);
  });

  test('LLM response time', async () => {
    const responseTime = await measureLLMPerformance();
    expect(responseTime).toBeLessThan(3000); // Less than 3 seconds
    console.log(`LLM response time: ${responseTime.toFixed(2)}ms`);
  });

  test('export performance', async () => {
    const result = await measureExportPerformance();
    expect(result.timePerHour).toBeLessThan(180000); // Less than 3 minutes per hour
    console.log(`Export time per hour: ${(result.timePerHour / 1000).toFixed(2)} seconds`);
  });
});
