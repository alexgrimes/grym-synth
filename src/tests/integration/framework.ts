/**
 * Integration Test Framework for Audio-Learning-Hub
 *
 * This framework provides utilities for end-to-end testing of the complete system,
 * including all components (GAMA, XenakisLDM, Musical Concept Mapper) and their interactions.
 */

import { systemBootstrap, initializeSystem, shutdownSystem } from "../../integration";
import { serviceRegistry, serviceFactory, healthMonitor } from "../../services";
import { contextManager, ContextItem } from "../../context";
import { taskRouter } from "../../orchestration";
import { Logger } from "../../utils/logger";
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

// Types for the framework
export interface TestAudioSample {
  data: Float32Array;
  sampleRate: number;
  channels: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface TestExpectedOutput {
  type: string;
  data: any;
  validationFn?: (actual: any) => boolean;
  tolerance?: number;
}

export interface TestMetrics {
  average: number;
  p95: number;
  min: number;
  max: number;
  totalSamples: number;
  memoryDelta: number;
  throughput: number;
}

export interface TestConfig {
  name: string;
  description?: string;
  timeout?: number;
  services: string[];
  mockExternalDependencies?: boolean;
  setupFn?: () => Promise<void>;
  teardownFn?: () => Promise<void>;
}

export interface TestPerformanceConfig {
  samples: number;
  warmupSamples?: number;
  targetAvgMs?: number;
  targetP95Ms?: number;
  cooldownMs?: number;
}

// Main Integration Test Framework class
export class IntegrationTestFramework {
  private logger: Logger;
  private initialized = false;
  private mocks: Map<string, any> = new Map();
  private originalServices: Map<string, any> = new Map();
  private testAudioSamples: Map<string, TestAudioSample> = new Map();
  private testExpectedOutputs: Map<string, TestExpectedOutput> = new Map();

  constructor() {
    this.logger = new Logger({ namespace: "integration-test-framework" });
  }

  /**
   * Initialize the test framework and system components
   */
  async initialize(config: {
    enableHealthMonitoring?: boolean;
    healthCheckIntervalMs?: number;
    logLevel?: "debug" | "info" | "warn" | "error";
  } = {}): Promise<void> {
    if (this.initialized) {
      this.logger.warn("Test framework already initialized");
      return;
    }

    try {
      this.logger.info("Initializing integration test framework");

      // Initialize the system with provided configuration
      await initializeSystem({
        enableHealthMonitoring: config.enableHealthMonitoring !== false,
        healthCheckIntervalMs: config.healthCheckIntervalMs || 1000,
      });

      this.initialized = true;
      this.logger.info("Integration test framework initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize integration test framework", { error });
      throw new Error(`Integration test framework initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Shutdown the test framework and system components
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn("Test framework not initialized");
      return;
    }

    try {
      this.logger.info("Shutting down integration test framework");

      // Restore any mocked services
      for (const [serviceId, originalService] of this.originalServices.entries()) {
        serviceRegistry.registerService(serviceId, originalService);
      }

      // Clear mocks and original services
      this.mocks.clear();
      this.originalServices.clear();

      // Shutdown the system
      await shutdownSystem();

      this.initialized = false;
      this.logger.info("Integration test framework shut down successfully");
    } catch (error) {
      this.logger.error("Failed to shut down integration test framework", { error });
      throw new Error(`Integration test framework shutdown failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Setup a test environment with specified services
   */
  async setupTest(config: TestConfig): Promise<void> {
    if (!this.initialized) {
      throw new Error("Test framework not initialized. Call initialize() first.");
    }

    this.logger.info(`Setting up test: ${config.name}`);

    // Initialize required services
    for (const serviceId of config.services) {
      if (!serviceRegistry.getAllServiceIds().includes(serviceId)) {
        await this.initializeService(serviceId, config.mockExternalDependencies);
      }
    }

    // Run custom setup function if provided
    if (config.setupFn) {
      await config.setupFn();
    }

    this.logger.info(`Test setup complete: ${config.name}`);
  }

  /**
   * Teardown a test environment
   */
  async teardownTest(config: TestConfig): Promise<void> {
    this.logger.info(`Tearing down test: ${config.name}`);

    // Run custom teardown function if provided
    if (config.teardownFn) {
      await config.teardownFn();
    }

    // Clear context data
    await contextManager.clear().catch(() => {});

    // Reset service metrics if supported
    const services = serviceRegistry.getAllServiceIds();
    await Promise.all(
      services.map(async (id) => {
        const service = await serviceRegistry.getService(id);
        if (typeof service.resetMetrics === "function") {
          await service.resetMetrics().catch(() => {});
        }
      })
    );

    this.logger.info(`Test teardown complete: ${config.name}`);
  }

  /**
   * Mock a service with a test implementation
   */
  mockService<T>(serviceId: string, mockImplementation: Partial<T>): void {
    if (!serviceRegistry.getAllServiceIds().includes(serviceId)) {
      throw new Error(`Service ${serviceId} not found in registry`);
    }

    // Store the original service for later restoration
    serviceRegistry.getService(serviceId).then(originalService => {
      this.originalServices.set(serviceId, originalService);

      // Create a mock service that combines the original service with the mock implementation
      const mockService = {
        ...originalService,
        ...mockImplementation,
      };

      // Register the mock service
      serviceRegistry.registerService(serviceId, mockService);
      this.mocks.set(serviceId, mockService);

      this.logger.info(`Service ${serviceId} mocked successfully`);
    });
  }

  /**
   * Restore a previously mocked service
   */
  restoreService(serviceId: string): void {
    if (this.originalServices.has(serviceId)) {
      const originalService = this.originalServices.get(serviceId);
      serviceRegistry.registerService(serviceId, originalService);
      this.mocks.delete(serviceId);
      this.originalServices.delete(serviceId);
      this.logger.info(`Service ${serviceId} restored to original implementation`);
    } else {
      this.logger.warn(`No original service found for ${serviceId}`);
    }
  }

  /**
   * Create a test audio sample
   */
  createTestAudioSample(
    id: string,
    options: {
      duration?: number;
      sampleRate?: number;
      channels?: number;
      type?: 'sine' | 'noise' | 'silence' | 'impulse';
      frequency?: number;
      amplitude?: number;
      metadata?: Record<string, any>;
    } = {}
  ): TestAudioSample {
    const sampleRate = options.sampleRate || 16000;
    const channels = options.channels || 1;
    const duration = options.duration || 1; // seconds
    const type = options.type || 'sine';
    const frequency = options.frequency || 440; // Hz
    const amplitude = options.amplitude || 0.5;

    const numSamples = Math.floor(duration * sampleRate);
    const data = new Float32Array(numSamples);

    // Generate audio data based on type
    switch (type) {
      case 'sine':
        for (let i = 0; i < numSamples; i++) {
          data[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
        }
        break;
      case 'noise':
        for (let i = 0; i < numSamples; i++) {
          data[i] = amplitude * (Math.random() * 2 - 1);
        }
        break;
      case 'silence':
        // All zeros by default
        break;
      case 'impulse':
        // Single impulse at the beginning
        data[0] = amplitude;
        break;
    }

    const sample: TestAudioSample = {
      data,
      sampleRate,
      channels,
      duration,
      metadata: options.metadata || {},
    };

    // Store the sample for later use
    this.testAudioSamples.set(id, sample);

    return sample;
  }

  /**
   * Load a test audio sample from a file
   */
  async loadTestAudioSample(
    id: string,
    filePath: string,
    metadata?: Record<string, any>
  ): Promise<TestAudioSample> {
    try {
      // This is a simplified implementation - in a real system, you would use
      // a proper audio file loading library to handle different formats
      const buffer = await fs.promises.readFile(filePath);

      // For simplicity, assume it's a raw PCM file with 16-bit samples
      // In a real implementation, you would parse WAV headers, etc.
      const dataView = new DataView(buffer.buffer);
      const numSamples = buffer.length / 2; // 16-bit = 2 bytes per sample
      const data = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        // Convert 16-bit PCM to float32 (-1.0 to 1.0)
        data[i] = dataView.getInt16(i * 2, true) / 32768.0;
      }

      // Assume some default values - in a real implementation, these would come from the file headers
      const sampleRate = 16000;
      const channels = 1;
      const duration = numSamples / sampleRate;

      const sample: TestAudioSample = {
        data,
        sampleRate,
        channels,
        duration,
        metadata: metadata || {},
      };

      // Store the sample for later use
      this.testAudioSamples.set(id, sample);

      return sample;
    } catch (error) {
      this.logger.error(`Failed to load audio sample from ${filePath}`, { error });
      throw new Error(`Failed to load audio sample: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Define expected output for a test
   */
  defineExpectedOutput(
    id: string,
    expectedOutput: TestExpectedOutput
  ): void {
    this.testExpectedOutputs.set(id, expectedOutput);
  }

  /**
   * Get a previously created or loaded test audio sample
   */
  getTestAudioSample(id: string): TestAudioSample {
    const sample = this.testAudioSamples.get(id);
    if (!sample) {
      throw new Error(`Test audio sample with ID ${id} not found`);
    }
    return sample;
  }

  /**
   * Get a previously defined expected output
   */
  getExpectedOutput(id: string): TestExpectedOutput {
    const output = this.testExpectedOutputs.get(id);
    if (!output) {
      throw new Error(`Expected output with ID ${id} not found`);
    }
    return output;
  }

  /**
   * Execute a task through the task router
   */
  async executeTask(task: any): Promise<any> {
    if (!this.initialized) {
      throw new Error("Test framework not initialized. Call initialize() first.");
    }

    return taskRouter.routeTask(task);
  }

  /**
   * Measure performance of an operation
   */
  async measurePerformance(
    operation: () => Promise<any>,
    config: TestPerformanceConfig
  ): Promise<TestMetrics> {
    const latencies: number[] = [];
    const initialMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Optional warmup phase
    if (config.warmupSamples) {
      for (let i = 0; i < config.warmupSamples; i++) {
        try {
          await operation();
        } catch (error) {
          // Ignore warmup errors
        }
      }
      // Allow system to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Measurement phase
    for (let i = 0; i < config.samples; i++) {
      const start = performance.now();
      await operation();
      const duration = performance.now() - start;
      latencies.push(duration);

      // Add cooldown between operations if specified
      if (config.cooldownMs) {
        await new Promise(resolve => setTimeout(resolve, config.cooldownMs));
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const finalMemory = process.memoryUsage().heapUsed;
    const sortedLatencies = [...latencies].sort((a, b) => a - b);

    return {
      average: latencies.reduce((a, b) => a + b) / latencies.length,
      p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
      min: sortedLatencies[0],
      max: sortedLatencies[sortedLatencies.length - 1],
      totalSamples: config.samples,
      memoryDelta: (finalMemory - initialMemory) / (1024 * 1024), // MB
      throughput: (config.samples / totalTime) * 1000, // ops/sec
    };
  }

  /**
   * Validate test results against expected output
   */
  validateResults(actual: any, expectedId: string): boolean {
    const expected = this.getExpectedOutput(expectedId);

    // If a custom validation function is provided, use it
    if (expected.validationFn) {
      return expected.validationFn(actual);
    }

    // Otherwise, perform a simple comparison based on the type
    switch (expected.type) {
      case 'exact':
        return JSON.stringify(actual) === JSON.stringify(expected.data);

      case 'numeric':
        // Check if within tolerance
        const tolerance = expected.tolerance || 0.001;
        if (typeof actual === 'number' && typeof expected.data === 'number') {
          return Math.abs(actual - expected.data) <= tolerance;
        }
        return false;

      case 'array':
        // Check if arrays are similar within tolerance
        const arrayTolerance = expected.tolerance || 0.001;
        if (Array.isArray(actual) && Array.isArray(expected.data) && actual.length === expected.data.length) {
          return actual.every((value, index) =>
            Math.abs(value - expected.data[index]) <= arrayTolerance
          );
        }
        return false;

      case 'contains':
        // Check if actual contains all properties in expected
        return Object.entries(expected.data).every(([key, value]) =>
          actual[key] !== undefined && JSON.stringify(actual[key]) === JSON.stringify(value)
        );

      default:
        return false;
    }
  }

  /**
   * Format performance metrics as a string
   */
  formatPerformanceMetrics(metrics: TestMetrics): string {
    return `
Performance Metrics:
-------------------
Average Latency: ${metrics.average.toFixed(2)}ms
P95 Latency: ${metrics.p95.toFixed(2)}ms
Min Latency: ${metrics.min.toFixed(2)}ms
Max Latency: ${metrics.max.toFixed(2)}ms
Throughput: ${metrics.throughput.toFixed(2)} ops/sec
Memory Delta: ${metrics.memoryDelta.toFixed(2)}MB
Total Samples: ${metrics.totalSamples}
`;
  }

  // Private helper methods

  /**
   * Initialize a service by ID
   */
  private async initializeService(serviceId: string, mockExternal: boolean = false): Promise<void> {
    this.logger.info(`Initializing service: ${serviceId}`);

    try {
      let service;

      switch (serviceId) {
        case 'wav2vec2':
          service = serviceFactory.createWav2Vec2Service({
            maxMemory: "512MB",
            modelPath: "facebook/wav2vec2-base-960h",
            deviceType: "cpu",
          });
          break;

        case 'gama':
          // GAMA service is not available in the service factory
          // Always use the mock implementation
          service = this.createMockGAMAService();
          break;

        case 'xenakisldm':
          // XenakisLDM service is not available in the service factory
          // Always use the mock implementation
          service = this.createMockXenakisLDMService();
          break;

        case 'audioldm':
          if (mockExternal) {
            service = this.createMockAudioLDMService();
          } else {
            service = serviceFactory.createAudioLDMService({
              maxMemory: "2GB",
              modelPath: "audioldm-s-full",
              deviceType: "cpu",
            });
          }
          break;

        default:
          throw new Error(`Unknown service ID: ${serviceId}`);
      }

      serviceRegistry.registerService(serviceId, service);
      await service.initialize();

      // Verify service is online
      const status = await service.getStatus();
      if (status !== "online") {
        throw new Error(`Service ${serviceId} failed to initialize properly. Status: ${status}`);
      }

      this.logger.info(`Service ${serviceId} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize service ${serviceId}`, { error });
      throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a mock GAMA service for testing
   */
  private createMockGAMAService(): any {
    return {
      initialize: async () => {},
      shutdown: async () => {},
      getStatus: async () => "online",
      getMetrics: async () => ({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageLatency: 0,
        memoryUsage: 0,
      }),
      resetMetrics: async () => {},
      executeTask: async (task: any) => {
        // Simple mock implementation that returns success for any task
        return {
          status: "success",
          data: {
            features: new Float32Array(512).fill(0.1),
            confidence: 0.9,
          },
          metrics: {
            latency: 10,
            memoryUsage: 100,
          },
        };
      },
      processAudio: async (audio: any) => {
        return {
          features: new Float32Array(512).fill(0.1),
          confidence: 0.9,
        };
      },
      extractFeatures: async (audio: any) => {
        return {
          features: new Float32Array(512).fill(0.1),
          confidence: 0.9,
        };
      },
    };
  }

  /**
   * Create a mock XenakisLDM service for testing
   */
  private createMockXenakisLDMService(): any {
    return {
      initialize: async () => {},
      shutdown: async () => {},
      getStatus: async () => "online",
      getMetrics: async () => ({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageLatency: 0,
        memoryUsage: 0,
      }),
      resetMetrics: async () => {},
      executeTask: async (task: any) => {
        // Simple mock implementation that returns success for any task
        return {
          status: "success",
          data: {
            audio: new Float32Array(16000).fill(0.1),
            parameters: {
              density: 0.5,
              complexity: 0.7,
            },
          },
          metrics: {
            latency: 15,
            memoryUsage: 200,
          },
        };
      },
      transformAudio: async (audio: any, parameters: any) => {
        return {
          audio: new Float32Array(16000).fill(0.1),
          parameters: parameters || {
            density: 0.5,
            complexity: 0.7,
          },
        };
      },
    };
  }

  /**
   * Create a mock AudioLDM service for testing
   */
  private createMockAudioLDMService(): any {
    return {
      initialize: async () => {},
      shutdown: async () => {},
      getStatus: async () => "online",
      getMetrics: async () => ({
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageLatency: 0,
        memoryUsage: 0,
      }),
      resetMetrics: async () => {},
      executeTask: async (task: any) => {
        // Simple mock implementation that returns success for any task
        return {
          status: "success",
          data: {
            audio: new Float32Array(16000).fill(0.1),
          },
          metrics: {
            latency: 20,
            memoryUsage: 300,
          },
        };
      },
      generateAudio: async (prompt: string, options: any) => {
        return {
          audio: new Float32Array(16000).fill(0.1),
          sampleRate: 16000,
          duration: 1,
        };
      },
    };
  }
}

// Export singleton instance
export const integrationTestFramework = new IntegrationTestFramework();
