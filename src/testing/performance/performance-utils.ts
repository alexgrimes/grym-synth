import {
  GrymSynth,
  AudioEngine,
  Visualizer,
  LLMInterface,
  ExportManager
} from '../../core/interfaces';

// Helper to measure elapsed time
const measureTime = async (fn: () => Promise<void>): Promise<number> => {
  const start = performance.now();
  await fn();
  return performance.now() - start;
};

// Measure application startup time
export const measureStartupTime = async (): Promise<number> => {
  const grymSynth = new GrymSynth();
  return await measureTime(async () => {
    await grymSynth.initialize();
  });
};

// Measure audio processing latency
export const measureAudioProcessingPerformance = async (): Promise<number> => {
  const audioEngine = new AudioEngine();
  const testBuffer = new AudioBuffer({
    length: 44100, // 1 second
    sampleRate: 44100,
    numberOfChannels: 2
  });

  let totalLatency = 0;
  const iterations = 100;

  for (let i = 0; i < iterations; i++) {
    const latency = await measureTime(async () => {
      await audioEngine.processBuffer(testBuffer);
    });
    totalLatency += latency;
  }

  return totalLatency / iterations; // Average latency
};

// Measure visualization frame rate
export const measureVisualizationPerformance = async (): Promise<number> => {
  const visualizer = new Visualizer();
  let frameCount = 0;
  const duration = 5000; // 5 seconds

  const start = performance.now();
  while (performance.now() - start < duration) {
    await visualizer.renderFrame();
    frameCount++;
  }

  return (frameCount / duration) * 1000; // Convert to FPS
};

// Measure LLM response time
export const measureLLMPerformance = async (): Promise<number> => {
  const llm = new LLMInterface();
  const testPrompt = "Generate a simple melody pattern";

  return await measureTime(async () => {
    await llm.generateResponse(testPrompt);
  });
};

// Measure export performance
export const measureExportPerformance = async (): Promise<{ timePerHour: number }> => {
  const exportManager = new ExportManager();
  const testDuration = 60; // 1 minute of audio

  const exportTime = await measureTime(async () => {
    await exportManager.exportProject({
      duration: testDuration,
      format: 'wav',
      sampleRate: 44100
    });
  });

  // Extrapolate to get time per hour
  const timePerHour = (exportTime * 60);

  return { timePerHour };
};
