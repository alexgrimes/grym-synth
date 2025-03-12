const { performance } = require('perf_hooks');
const { VisualizationTools } = require('../../monitoring/visualizationTools');

class PerformanceBenchmark {
  static async runAudioProcessingTest(sampleSize = 44100) {
    console.log(`\nRunning Audio Processing Performance Test (${sampleSize} samples)...`);
    const audioData = new Float32Array(sampleSize);

    // Generate test audio data (sine wave)
    for (let i = 0; i < sampleSize; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
    }

    const iterations = 1000;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      // Simulate audio processing
      const processed = new Float32Array(audioData.length);
      for (let j = 0; j < audioData.length; j++) {
        processed[j] = audioData[j] * 0.5; // Simple amplitude reduction
      }

      const end = performance.now();
      times.push(end - start);
    }

    const averageTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`Average processing time: ${averageTime.toFixed(3)}ms`);

    return {
      test: 'Audio Processing',
      sampleSize,
      iterations,
      averageTime,
      maxTime: Math.max(...times),
      minTime: Math.min(...times)
    };
  }

  static async runVisualizationTest(frameCount = 100) {
    console.log(`\nRunning Visualization Performance Test (${frameCount} frames)...`);

    // Create visualization tools instance
    const visualizer = new VisualizationTools();

    // Create dummy DOM element for testing
    const container = {
      appendChild: () => {}
    };

    visualizer.initialize(container);

    const audioData = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      audioData[i] = Math.sin(2 * Math.PI * i / 1024);
    }

    const times = [];

    for (let i = 0; i < frameCount; i++) {
      const start = performance.now();

      visualizer.createWaveform(audioData);
      visualizer.render();

      const end = performance.now();
      times.push(end - start);
    }

    const averageTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`Average frame time: ${averageTime.toFixed(3)}ms`);

    return {
      test: 'Visualization',
      frameCount,
      averageTime,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      fps: 1000 / averageTime
    };
  }
}

// Run benchmarks
async function runBenchmarks() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Audio processing benchmark
    results.tests.push(await PerformanceBenchmark.runAudioProcessingTest());

    // Visualization benchmark
    results.tests.push(await PerformanceBenchmark.runVisualizationTest());

    console.log('\nAll benchmarks completed successfully');
    console.log('\nDetailed Results:');
    console.log(JSON.stringify(results, null, 2));

    return results;
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = {
  PerformanceBenchmark,
  runBenchmarks
};
