import { CircuitBreaker } from "../../utils/CircuitBreaker";
import { HealthMonitor } from "../../monitoring/HealthMonitor";
import { AudioBuffer, ProcessingOptions, ModelConfig } from "../../types/audio";

export interface PythonBridgeConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  healthEndpoint: string;
  modelEndpoints: Record<string, string>;
}

export class PythonBridgeService {
  private config: PythonBridgeConfig;
  private circuitBreaker: CircuitBreaker;
  private healthMonitor: HealthMonitor;

  constructor(config: PythonBridgeConfig, healthMonitor: HealthMonitor) {
    this.config = config;
    this.healthMonitor = healthMonitor;

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000,
      timeout: config.timeout,
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.circuitBreaker.execute(() =>
        fetch(`${this.config.baseUrl}${this.config.healthEndpoint}`)
      );

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const health = await response.json();
      return health.status === "ok";
    } catch (error) {
      this.healthMonitor.recordMetric("bridge.health.error", {
        error: String(error),
        timestamp: Date.now(),
      });
      return false;
    }
  }

  async processAudio(
    audioBuffer: AudioBuffer,
    modelName: string,
    options: ProcessingOptions
  ): Promise<Float32Array> {
    const endpoint = this.config.modelEndpoints[modelName];
    if (!endpoint) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    try {
      // Convert AudioBuffer to format suitable for transmission
      const audioData = this.prepareAudioData(audioBuffer);

      // Start timing
      const startTime = performance.now();

      // Send to Python backend
      const response = await this.circuitBreaker.execute(() =>
        fetch(`${this.config.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio: audioData,
            sampleRate: audioBuffer.sampleRate,
            options,
          }),
        })
      );

      // End timing
      const endTime = performance.now();

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Record metrics
      this.healthMonitor.recordMetric("bridge.process.success", {
        model: modelName,
        duration: endTime - startTime,
        dataSize: audioData.length,
        timestamp: Date.now(),
      });

      return new Float32Array(result.features);
    } catch (error) {
      this.healthMonitor.recordMetric("bridge.process.error", {
        model: modelName,
        error: String(error),
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  async processAudioStream(
    audioChunks: AudioBuffer[],
    modelName: string,
    options: ProcessingOptions
  ): Promise<Float32Array[]> {
    const results: Float32Array[] = [];

    for (let i = 0; i < audioChunks.length; i++) {
      try {
        const chunkResult = await this.processAudio(
          audioChunks[i],
          modelName,
          options
        );

        results.push(chunkResult);

        // Emit progress
        this.healthMonitor.recordMetric("bridge.stream.progress", {
          model: modelName,
          chunkIndex: i,
          totalChunks: audioChunks.length,
          timestamp: Date.now(),
        });
      } catch (error) {
        this.healthMonitor.recordMetric("bridge.stream.error", {
          model: modelName,
          chunkIndex: i,
          error: String(error),
          timestamp: Date.now(),
        });
        throw error;
      }
    }

    return results;
  }

  async loadModel(modelConfig: ModelConfig): Promise<boolean> {
    try {
      const response = await this.circuitBreaker.execute(() =>
        fetch(`${this.config.baseUrl}/models/load`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(modelConfig),
        })
      );

      if (!response.ok) {
        throw new Error(`Model loading failed: ${response.statusText}`);
      }

      const result = await response.json();

      this.healthMonitor.recordMetric("bridge.model.loaded", {
        model: modelConfig.name,
        timestamp: Date.now(),
      });

      return result.success;
    } catch (error) {
      this.healthMonitor.recordMetric("bridge.model.load_error", {
        model: modelConfig.name,
        error: String(error),
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  // Helper methods
  private prepareAudioData(audioBuffer: AudioBuffer): number[] {
    // For simplicity, use the first channel only
    const channelData = audioBuffer.getChannelData(0);

    // Convert to regular array for JSON serialization
    return Array.from(channelData);
  }
}
