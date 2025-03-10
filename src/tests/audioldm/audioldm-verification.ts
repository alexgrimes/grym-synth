import { ServiceFactory } from "../../services/service-factory";
import { AudioLDMService } from "../../services/audio/AudioLDMService";
import { MemoryProfiler } from "../../utils/memory-profiler";
import { Logger } from "../../utils/logger";
import fs from "fs";
import path from "path";

async function testAudioLDM() {
  const logger = new Logger({ namespace: "audioldm-test" });
  const profiler = new MemoryProfiler();
  const serviceFactory = new ServiceFactory();

  logger.info("Starting AudioLDM verification test");

  // Test with different configurations
  const testConfigs = [
    { name: "default", config: {} },
    {
      name: "quality",
      config: { diffusionSteps: 30, useHalfPrecision: false },
    },
    {
      name: "performance",
      config: { diffusionSteps: 15, quantization: "8bit" as "8bit" },
    },
  ];

  const outputDir = path.join(__dirname, "../../output/audioldm-test");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const testCase of testConfigs) {
    logger.info(`Testing configuration: ${testCase.name}`);

    // Create service with specific configuration
    const audioldm = serviceFactory.createAudioLDMService(testCase.config);

    try {
      // Test initialization
      logger.info("Initializing service");
      const initStartTime = profiler.startOperation("init");
      await audioldm.initialize();
      const initMetrics = profiler.endOperation("init", initStartTime);
      logger.info("Initialization complete", {
        memoryUsage: initMetrics.memoryUsage,
        duration: initMetrics.duration,
      });

      // Test audio generation
      const testPrompts = [
        { name: "simple", text: "A simple piano melody" },
        {
          name: "complex",
          text: "A jazz ensemble with saxophone, piano, and drums playing an upbeat tune",
        },
        {
          name: "ambient",
          text: "Ambient forest sounds with birds chirping and a stream in the background",
        },
      ];

      for (const prompt of testPrompts) {
        logger.info(`Testing generation with prompt: ${prompt.name}`);
        const genStartTime = profiler.startOperation(`generate-${prompt.name}`);

        const task = {
          id: `test-${testCase.name}-${prompt.name}`,
          type: "audio-generation",
          modelType: "audioldm",
          operation: "generate",
          data: {
            prompt: prompt.text,
            params: {
              ...testCase.config,
              duration: 5.0, // 5-second clip for testing
            },
          },
          priority: "normal",
        };

        const result = await audioldm.executeTask(task);
        const genMetrics = profiler.endOperation(
          `generate-${prompt.name}`,
          genStartTime
        );

        // Save metrics
        logger.info(`Generation complete: ${prompt.name}`, {
          status: result.status,
          memoryUsage: genMetrics.memoryUsage,
          duration: genMetrics.duration,
          peakMemory: genMetrics.peakMemory,
        });

        // Save generated audio if successful
        if (result.status === "success" && result.data) {
          const outputFile = path.join(
            outputDir,
            `${testCase.name}-${prompt.name}.wav`
          );

          // Save audio data to file
          if (result.data.audio && result.data.sampleRate) {
            // Convert Float32Array to Buffer
            const audioBuffer = Buffer.from(
              new Float32Array(result.data.audio).buffer
            );

            // Simple WAV header creation (this is a simplified version)
            const wavHeader = createWavHeader(
              audioBuffer.length,
              result.data.sampleRate
            );

            // Write WAV file with header and audio data
            fs.writeFileSync(
              outputFile,
              Buffer.concat([wavHeader, audioBuffer])
            );

            logger.info(`Saved output to ${outputFile}`);
          }
        }
      }

      // Test service shutdown
      logger.info("Shutting down service");
      await audioldm.shutdown();
    } catch (error) {
      logger.error("Test failed", {
        error: error instanceof Error ? error.message : String(error),
        config: testCase.name,
      });
    }
  }

  // Generate test report
  const report = profiler.generateReport();
  fs.writeFileSync(
    path.join(outputDir, "test-report.json"),
    JSON.stringify(report, null, 2)
  );

  logger.info("Testing complete, report saved to test-report.json");
}

// Helper function to create a simple WAV header
function createWavHeader(dataLength: number, sampleRate: number): Buffer {
  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);

  // "fmt " sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(3, 20); // format (3 = IEEE float)
  buffer.writeUInt16LE(1, 22); // channels (1 = mono)
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate * 4, 28); // byte rate (sampleRate * blockAlign)
  buffer.writeUInt16LE(4, 32); // block align (channels * bitsPerSample/8)
  buffer.writeUInt16LE(32, 34); // bits per sample

  // "data" sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAudioLDM().catch((error) => {
    console.error("Test failed with error:", error);
    process.exit(1);
  });
}

export { testAudioLDM };
