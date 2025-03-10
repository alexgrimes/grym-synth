import { FeatureAdapter } from "../../types/FeatureAdapter";
import { AudioBuffer, AudioPattern, PatternMetadata } from "../../types/audio";
import { CircuitBreaker } from "../../utils/CircuitBreaker";
import { HealthMonitor } from "../../monitoring/HealthMonitor";
import { PythonBridgeService } from "./PythonBridgeService";

export class Wav2Vec2FeatureAdapter implements FeatureAdapter {
  private endpoint: string;
  private parameters: Record<string, any>;
  private timeout: number;
  private retryConfig?: { maxRetries: number; backoff: number };
  private circuitBreaker: CircuitBreaker;
  private healthMonitor: HealthMonitor;
  private pythonBridge: PythonBridgeService;
  private initialized: boolean = false;

  constructor(
    endpoint: string,
    parameters: Record<string, any>,
    timeout: number,
    retryConfig?: { maxRetries: number; backoff: number },
    healthMonitor?: HealthMonitor,
    pythonBridge?: PythonBridgeService
  ) {
    this.endpoint = endpoint;
    this.parameters = parameters;
    this.timeout = timeout;
    this.retryConfig = retryConfig;

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000,
      timeout: this.timeout,
    });

    this.healthMonitor = healthMonitor || new HealthMonitor();

    // Initialize Python bridge if not provided
    if (!pythonBridge) {
      this.pythonBridge = new PythonBridgeService(
        {
          baseUrl: this.endpoint,
          timeout: this.timeout,
          maxRetries: this.retryConfig?.maxRetries || 3,
          healthEndpoint: "/health",
          modelEndpoints: {
            "wav2vec2-base": "/process/wav2vec2",
          },
        },
        this.healthMonitor
      );
    } else {
      this.pythonBridge = pythonBridge;
    }
  }

  async initialize(config?: any): Promise<boolean> {
    try {
      // Check Python backend health
      const isHealthy = await this.pythonBridge.checkHealth();
      if (!isHealthy) {
        throw new Error("Python backend health check failed");
      }

      // Load model
      await this.pythonBridge.loadModel({
        name: "wav2vec2-base",
        path: "facebook/wav2vec2-base-960h",
        parameters: this.parameters,
      });

      this.initialized = true;
      return true;
    } catch (error) {
      this.healthMonitor.recordMetric("adapter.initialization.error", {
        error: String(error),
      });
      return false;
    }
  }

  async extractFeatures(audioBuffer: AudioBuffer): Promise<Float32Array> {
    if (!this.initialized) {
      throw new Error("Adapter not initialized");
    }

    try {
      // Process audio using Python bridge
      const features = await this.pythonBridge.processAudio(
        audioBuffer,
        "wav2vec2-base",
        {
          model: "wav2vec2-base",
          ...this.parameters,
        }
      );

      this.healthMonitor.recordMetric("adapter.features.extracted", {
        audioLength: audioBuffer.duration,
        featureSize: features.length,
      });

      return features;
    } catch (error) {
      this.healthMonitor.recordMetric("adapter.features.error", {
        error: String(error),
      });
      throw error;
    }
  }

  async createPattern(
    audioBuffer: AudioBuffer,
    region: {
      startTime: number;
      endTime: number;
      frequencyRange: { low: number; high: number };
    }
  ): Promise<AudioPattern> {
    // Extract feature vector for the specific region
    const features = await this.extractFeatures(audioBuffer);

    // Create a pattern with unique ID
    const pattern: AudioPattern = {
      id: crypto.randomUUID(),
      startTime: region.startTime,
      endTime: region.endTime,
      frequencyRange: region.frequencyRange,
      confidence: 0.8, // Default confidence
      type: "unknown", // Will be determined later
      features,
    };

    this.healthMonitor.recordMetric("adapter.pattern.created", {
      patternId: pattern.id,
      duration: pattern.endTime - pattern.startTime,
    });

    return pattern;
  }

  async compareFeatures(
    featuresA: Float32Array,
    featuresB: Float32Array
  ): Promise<number> {
    // Calculate cosine similarity between feature vectors
    if (featuresA.length !== featuresB.length) {
      throw new Error("Feature vectors have different dimensions");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < featuresA.length; i++) {
      dotProduct += featuresA[i] * featuresB[i];
      normA += featuresA[i] * featuresA[i];
      normB += featuresB[i] * featuresB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    const similarity = dotProduct / (normA * normB);

    this.healthMonitor.recordMetric("adapter.features.compared", {
      similarity,
    });

    return similarity;
  }

  dispose(): void {
    this.initialized = false;

    this.healthMonitor.recordMetric("adapter.disposed", {
      timestamp: Date.now(),
    });
  }
}
