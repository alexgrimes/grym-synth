/**
 * API Mocking System for grym-synth Backend
 *
 * This file provides a comprehensive mocking system for all API endpoints,
 * allowing developers to test their applications without requiring the actual
 * backend services to be running.
 *
 * Features:
 * - Mock responses for all API endpoints
 * - Configurable delay to simulate network latency
 * - Error simulation for testing error handling
 * - Mock data generator for testing edge cases
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// Import API types
import {
  AudioResult,
  GenerationParams,
  JobStatus,
  PatternResult,
  Pattern,
  ParameterMap,
  MappingRule,
  ModelStatus,
  ModelInfo,
  DownloadStatus,
  AnalysisParams,
} from '../../api/utils/responseTypes';

// Mock configuration interface
export interface MockConfig {
  // Global settings
  enabled: boolean;
  defaultDelay: number;
  errorRate: number;
  networkErrorRate: number;
  timeoutRate: number;

  // Endpoint-specific settings
  endpoints: {
    [key: string]: {
      enabled?: boolean;
      delay?: number;
      errorRate?: number;
      customResponse?: any;
    };
  };
}

// Default configuration
const DEFAULT_CONFIG: MockConfig = {
  enabled: true,
  defaultDelay: 200, // ms
  errorRate: 0.05, // 5% chance of error
  networkErrorRate: 0.02, // 2% chance of network error
  timeoutRate: 0.02, // 2% chance of timeout
  endpoints: {},
};

// Mock API class
export class ApiMock extends EventEmitter {
  private config: MockConfig;
  private mockJobs: Map<string, JobStatus>;
  private mockAudio: Map<string, AudioResult>;
  private mockPatterns: Map<string, Pattern>;
  private mockParameterMaps: Map<string, ParameterMap>;
  private mockModels: Map<string, ModelStatus>;
  private mockDownloads: Map<string, DownloadStatus>;

  constructor(config: Partial<MockConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize storage
    this.mockJobs = new Map();
    this.mockAudio = new Map();
    this.mockPatterns = new Map();
    this.mockParameterMaps = new Map();
    this.mockModels = new Map();
    this.mockDownloads = new Map();

    // Initialize with some default mock data
    this.initializeDefaultMockData();
  }

  /**
   * Update the mock configuration
   */
  updateConfig(config: Partial<MockConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.endpoints) {
      this.config.endpoints = { ...this.config.endpoints, ...config.endpoints };
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Get the current configuration
   */
  getConfig(): MockConfig {
    return { ...this.config };
  }

  /**
   * Reset the mock to its initial state
   */
  reset(): void {
    this.mockJobs.clear();
    this.mockAudio.clear();
    this.mockPatterns.clear();
    this.mockParameterMaps.clear();
    this.mockModels.clear();
    this.mockDownloads.clear();

    this.initializeDefaultMockData();
    this.emit('reset');
  }

  /**
   * Initialize default mock data
   */
  private initializeDefaultMockData(): void {
    // Add some default models
    this.mockModels.set('model-1', {
      id: 'model-1',
      name: 'GAMA Standard',
      version: '1.0.0',
      type: 'GAMA',
      status: 'available',
      size: 1024 * 1024 * 500, // 500 MB
      capabilities: ['audio_generation', 'pattern_recognition'],
    });

    this.mockModels.set('model-2', {
      id: 'model-2',
      name: 'AudioLDM Standard',
      version: '1.0.0',
      type: 'AudioLDM',
      status: 'available',
      size: 1024 * 1024 * 1500, // 1.5 GB
      capabilities: ['audio_generation'],
    });

    this.mockModels.set('model-3', {
      id: 'model-3',
      name: 'XenakisLDM Standard',
      version: '1.0.0',
      type: 'XenakisLDM',
      status: 'available',
      size: 1024 * 1024 * 2000, // 2 GB
      capabilities: ['audio_generation', 'audio_transformation'],
    });

    // Add some default parameter maps
    this.mockParameterMaps.set('map-1', {
      id: 'map-1',
      name: 'GAMA to AudioLDM',
      description: 'Parameter mapping from GAMA to AudioLDM',
      rules: [
        {
          id: 'rule-1',
          sourceParameter: 'density',
          targetParameter: 'complexity',
          transformationType: 'linear',
          transformationParams: {
            scale: 1.2,
            offset: 0.1,
          },
        },
        {
          id: 'rule-2',
          sourceParameter: 'brightness',
          targetParameter: 'brightness',
          transformationType: 'exponential',
          transformationParams: {
            exponent: 0.8,
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Simulate network delay and potential errors
   */
  private async simulateNetwork(endpoint: string): Promise<void> {
    const endpointConfig = this.config.endpoints[endpoint] || {};
    const isEnabled = endpointConfig.enabled !== undefined ? endpointConfig.enabled : this.config.enabled;

    if (!isEnabled) {
      throw new Error(`Mock for endpoint ${endpoint} is disabled`);
    }

    // Determine delay
    const delay = endpointConfig.delay !== undefined ? endpointConfig.delay : this.config.defaultDelay;

    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Check for network error
    const networkErrorRate = this.config.networkErrorRate;
    if (Math.random() < networkErrorRate) {
      const error = new Error('Network Error');
      error.name = 'NetworkError';
      throw error;
    }

    // Check for timeout
    const timeoutRate = this.config.timeoutRate;
    if (Math.random() < timeoutRate) {
      const error = new Error('Request Timeout');
      error.name = 'TimeoutError';
      throw error;
    }

    // Check for general error
    const errorRate = endpointConfig.errorRate !== undefined ? endpointConfig.errorRate : this.config.errorRate;
    if (Math.random() < errorRate) {
      const errorTypes = [
        { name: 'BadRequestError', message: 'Bad Request', status: 400 },
        { name: 'UnauthorizedError', message: 'Unauthorized', status: 401 },
        { name: 'ForbiddenError', message: 'Forbidden', status: 403 },
        { name: 'NotFoundError', message: 'Not Found', status: 404 },
        { name: 'ServerError', message: 'Internal Server Error', status: 500 },
      ];

      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const error = new Error(errorType.message);
      error.name = errorType.name;
      (error as any).status = errorType.status;
      throw error;
    }
  }

  /**
   * Generate a mock audio result
   */
  generateMockAudio(prompt: string, params: GenerationParams = {}): AudioResult {
    const audioId = `audio-${uuidv4()}`;
    const duration = params.duration || 5;

    const result: AudioResult = {
      audioId,
      url: `https://api.example.com/audio/${audioId}.wav`,
      duration,
      format: 'wav',
      createdAt: new Date().toISOString(),
      prompt,
      parameters: {
        ...params,
      },
      metadata: {
        generatedBy: 'ApiMock',
        quality: Math.random() * 0.5 + 0.5, // Random quality between 0.5 and 1.0
      },
    };

    this.mockAudio.set(audioId, result);
    return result;
  }

  /**
   * Generate a mock job status
   */
  generateMockJobStatus(status: JobStatus['status'] = 'completed'): JobStatus {
    const jobId = `job-${uuidv4()}`;
    const createdAt = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
    const updatedAt = new Date().toISOString();

    let progress = 100;
    let estimatedTimeRemaining = 0;

    switch (status) {
      case 'queued':
        progress = 0;
        estimatedTimeRemaining = 30;
        break;
      case 'processing':
        progress = Math.floor(Math.random() * 90) + 10; // 10-99%
        estimatedTimeRemaining = Math.floor((100 - progress) / 10);
        break;
      case 'failed':
        progress = Math.floor(Math.random() * 90); // 0-89%
        estimatedTimeRemaining = 0;
        break;
      case 'cancelled':
        progress = Math.floor(Math.random() * 90); // 0-89%
        estimatedTimeRemaining = 0;
        break;
      case 'completed':
      default:
        progress = 100;
        estimatedTimeRemaining = 0;
        break;
    }

    const result: JobStatus = {
      jobId,
      status,
      progress,
      createdAt,
      updatedAt,
    };

    if (estimatedTimeRemaining > 0) {
      result.estimatedTimeRemaining = estimatedTimeRemaining;
    }

    if (status === 'failed') {
      result.error = 'Mock error message';
    } else if (status === 'completed') {
      result.result = this.generateMockAudio('Mock completed job', { duration: 3 });
    }

    this.mockJobs.set(jobId, result);
    return result;
  }

  /**
   * Generate a mock pattern
   */
  generateMockPattern(type: string = 'rhythm'): Pattern {
    const id = `pattern-${uuidv4()}`;
    const audioFileId = `audio-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const result: Pattern = {
      id,
      audioFileId,
      type,
      confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7 and 1.0
      features: {
        tempo: Math.floor(Math.random() * 80) + 80, // 80-160 BPM
        complexity: Math.random() * 0.8 + 0.2, // 0.2-1.0 complexity
        density: Math.random() * 0.8 + 0.2, // 0.2-1.0 density
      },
      // SpectralRegion properties
      startTime: Math.random() * 5,
      endTime: Math.random() * 5 + 5,
      lowFreq: Math.random() * 500,
      highFreq: Math.random() * 5000 + 1000,
      // AudioPattern properties
      createdAt: now,
      updatedAt: now,
      metadata: {
        source: 'mock',
        quality: Math.random(),
      }
    };

    if (Math.random() > 0.5) {
      result.relatedPatterns = [
        `pattern-${uuidv4().substring(0, 8)}`,
        `pattern-${uuidv4().substring(0, 8)}`,
      ];
    }

    this.mockPatterns.set(id, result);
    return result;
  }

  /**
   * Generate a mock pattern result
   */
  generateMockPatternResult(audioId: string, params: AnalysisParams = {}): PatternResult {
    const analysisId = `analysis-${uuidv4()}`;
    const patternCount = Math.floor(Math.random() * 5) + 1; // 1-5 patterns

    const patterns: Pattern[] = [];
    for (let i = 0; i < patternCount; i++) {
      const patternTypes = ['rhythm', 'melody', 'harmony', 'texture', 'timbre'];
      const type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
      patterns.push(this.generateMockPattern(type));
    }

    const result: PatternResult = {
      analysisId,
      audioId,
      patterns,
      metadata: {
        duration: params.minFrequency || 0,
        maxFrequency: params.maxFrequency || 20000,
        sensitivity: params.sensitivity || 0.8,
        analysisTime: Math.random() * 2 + 0.5, // 0.5-2.5 seconds
      },
      createdAt: new Date().toISOString(),
    };

    return result;
  }

  // API Mock Methods

  /**
   * Mock audio generation
   */
  async generateAudio(prompt: string, params: GenerationParams = {}): Promise<AudioResult> {
    await this.simulateNetwork('generateAudio');

    // Check for custom response
    const customResponse = this.config.endpoints['generateAudio']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    return this.generateMockAudio(prompt, params);
  }

  /**
   * Mock get generation status
   */
  async getGenerationStatus(jobId: string): Promise<JobStatus> {
    await this.simulateNetwork('getGenerationStatus');

    // Check for custom response
    const customResponse = this.config.endpoints['getGenerationStatus']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Check if job exists
    const job = this.mockJobs.get(jobId);
    if (job) {
      return job;
    }

    // Generate a random status
    const statuses: JobStatus['status'][] = ['queued', 'processing', 'completed', 'failed', 'cancelled'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const result = this.generateMockJobStatus(randomStatus);
    result.jobId = jobId; // Override with the requested job ID

    this.mockJobs.set(jobId, result);
    return result;
  }

  /**
   * Mock cancel generation
   */
  async cancelGeneration(jobId: string): Promise<boolean> {
    await this.simulateNetwork('cancelGeneration');

    // Check for custom response
    const customResponse = this.config.endpoints['cancelGeneration']?.customResponse;
    if (customResponse !== undefined) {
      return customResponse;
    }

    // Check if job exists
    const job = this.mockJobs.get(jobId);
    if (job) {
      // Update job status to cancelled
      job.status = 'cancelled';
      job.updatedAt = new Date().toISOString();
      this.mockJobs.set(jobId, job);
    } else {
      // Create a new cancelled job
      const newJob = this.generateMockJobStatus('cancelled');
      newJob.jobId = jobId;
      this.mockJobs.set(jobId, newJob);
    }

    return true;
  }

  /**
   * Mock list generation jobs
   */
  async listGenerationJobs(
    status?: JobStatus['status'],
    limit: number = 10,
    offset: number = 0
  ): Promise<JobStatus[]> {
    await this.simulateNetwork('listGenerationJobs');

    // Check for custom response
    const customResponse = this.config.endpoints['listGenerationJobs']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Generate mock jobs if we don't have enough
    if (this.mockJobs.size < limit + offset) {
      const needed = limit + offset - this.mockJobs.size;
      for (let i = 0; i < needed; i++) {
        const statuses: JobStatus['status'][] = ['queued', 'processing', 'completed', 'failed', 'cancelled'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        this.generateMockJobStatus(randomStatus);
      }
    }

    // Filter by status if provided
    let jobs = Array.from(this.mockJobs.values());
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }

    // Apply pagination
    return jobs.slice(offset, offset + limit);
  }

  /**
   * Mock get generated audio
   */
  async getGeneratedAudio(audioId: string): Promise<AudioResult> {
    await this.simulateNetwork('getGeneratedAudio');

    // Check for custom response
    const customResponse = this.config.endpoints['getGeneratedAudio']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Check if audio exists
    const audio = this.mockAudio.get(audioId);
    if (audio) {
      return audio;
    }

    // Generate a new audio result
    const result = this.generateMockAudio(`Mock audio ${audioId}`, { duration: 3 });
    result.audioId = audioId; // Override with the requested audio ID

    this.mockAudio.set(audioId, result);
    return result;
  }

  /**
   * Mock generate audio variation
   */
  async generateAudioVariation(audioId: string, params: GenerationParams = {}): Promise<AudioResult> {
    await this.simulateNetwork('generateAudioVariation');

    // Check for custom response
    const customResponse = this.config.endpoints['generateAudioVariation']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Check if source audio exists
    const sourceAudio = this.mockAudio.get(audioId);
    let prompt = `Variation of audio ${audioId}`;
    let duration = 3;

    if (sourceAudio) {
      prompt = `Variation of: ${sourceAudio.prompt}`;
      duration = sourceAudio.duration;
    }

    // Generate a variation
    return this.generateMockAudio(prompt, {
      ...params,
      duration: params.duration || duration,
    });
  }

  /**
   * Mock analyze audio
   */
  async analyzeAudio(audioId: string, params: AnalysisParams = {}): Promise<PatternResult> {
    await this.simulateNetwork('analyzeAudio');

    // Check for custom response
    const customResponse = this.config.endpoints['analyzeAudio']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    return this.generateMockPatternResult(audioId, params);
  }

  /**
   * Mock get patterns
   */
  async getPatterns(limit: number = 10, offset: number = 0): Promise<Pattern[]> {
    await this.simulateNetwork('getPatterns');

    // Check for custom response
    const customResponse = this.config.endpoints['getPatterns']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Generate mock patterns if we don't have enough
    if (this.mockPatterns.size < limit + offset) {
      const needed = limit + offset - this.mockPatterns.size;
      for (let i = 0; i < needed; i++) {
        const patternTypes = ['rhythm', 'melody', 'harmony', 'texture', 'timbre'];
        const type = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        this.generateMockPattern(type);
      }
    }

    // Apply pagination
    return Array.from(this.mockPatterns.values()).slice(offset, offset + limit);
  }

  /**
   * Mock get pattern by ID
   */
  async getPatternById(patternId: string): Promise<Pattern> {
    await this.simulateNetwork('getPatternById');

    // Check for custom response
    const customResponse = this.config.endpoints['getPatternById']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Check if pattern exists
    const pattern = this.mockPatterns.get(patternId);
    if (pattern) {
      return pattern;
    }

    // Generate a new pattern
    const result = this.generateMockPattern();
    result.id = patternId; // Override with the requested pattern ID

    this.mockPatterns.set(patternId, result);
    return result;
  }

  /**
   * Mock check models
   */
  async checkModels(): Promise<ModelStatus[]> {
    await this.simulateNetwork('checkModels');

    // Check for custom response
    const customResponse = this.config.endpoints['checkModels']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    return Array.from(this.mockModels.values());
  }

  /**
   * Mock get model info
   */
  async getModelInfo(modelId: string): Promise<ModelInfo> {
    await this.simulateNetwork('getModelInfo');

    // Check for custom response
    const customResponse = this.config.endpoints['getModelInfo']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Check if model exists
    const model = this.mockModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Add additional info
    return {
      ...model,
      description: `Mock model description for ${model.name}`,
      author: 'grym-synth Team',
      license: 'MIT',
      releaseDate: '2025-01-01',
      parameters: 1000000000,
      requirements: {
        minRAM: 8192,
        minVRAM: 4096,
        minCPU: 'Intel Core i5 or equivalent',
        minGPU: 'NVIDIA GTX 1060 or equivalent',
        supportedPlatforms: ['Windows', 'macOS', 'Linux'],
      },
      performanceMetrics: {
        inferenceTimeMs: 250,
        memoryUsageMB: model.size / (1024 * 1024),
        throughputSamplesPerSecond: 0.5,
      },
    };
  }

  /**
   * Mock download model
   */
  async downloadModel(modelId: string): Promise<DownloadStatus> {
    await this.simulateNetwork('downloadModel');

    // Check for custom response
    const customResponse = this.config.endpoints['downloadModel']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Check if model exists
    const model = this.mockModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Create a download status
    const downloadId = `download-${uuidv4()}`;
    const status: DownloadStatus = {
      modelId,
      status: 'downloading',
      progress: 0,
      downloadSpeed: 10 * 1024 * 1024, // 10 MB/s
      estimatedTimeRemaining: Math.floor(model.size / (10 * 1024 * 1024)),
    };

    this.mockDownloads.set(downloadId, status);

    // Simulate download progress
    this.simulateDownloadProgress(downloadId, model.size);

    return status;
  }

  /**
   * Simulate download progress
   */
  private simulateDownloadProgress(downloadId: string, totalSize: number): void {
    const download = this.mockDownloads.get(downloadId);
    if (!download) return;

    const interval = setInterval(() => {
      const download = this.mockDownloads.get(downloadId);
      if (!download) {
        clearInterval(interval);
        return;
      }

      // Update progress
      download.progress += Math.random() * 10 + 5; // 5-15% progress per update
      if (download.progress >= 100) {
        download.progress = 100;
        download.status = 'completed';
        download.estimatedTimeRemaining = 0;
        clearInterval(interval);
      } else {
        download.estimatedTimeRemaining = Math.floor((100 - download.progress) / 10);
      }

      this.mockDownloads.set(downloadId, download);
      this.emit('downloadProgress', download);
    }, 1000);
  }

  /**
   * Mock get all parameter maps
   */
  async getAllParameterMaps(): Promise<ParameterMap[]> {
    await this.simulateNetwork('getAllParameterMaps');

    // Check for custom response
    const customResponse = this.config.endpoints['getAllParameterMaps']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    return Array.from(this.mockParameterMaps.values());
  }

  /**
   * Mock get parameter map
   */
  async getParameterMap(mapId: string): Promise<ParameterMap> {
    await this.simulateNetwork('getParameterMap');

    // Check for custom response
    const customResponse = this.config.endpoints['getParameterMap']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Check if map exists
    const map = this.mockParameterMaps.get(mapId);
    if (map) {
      return map;
    }

    throw new Error(`Parameter map ${mapId} not found`);
  }

  /**
   * Mock create parameter map
   */
  async createParameterMap(name: string, rules: MappingRule[] = []): Promise<ParameterMap> {
    await this.simulateNetwork('createParameterMap');

    // Check for custom response
    const customResponse = this.config.endpoints['createParameterMap']?.customResponse;
    if (customResponse) {
      return customResponse;
    }

    // Create a new parameter map
    const mapId = `map-${uuidv4()}`;
    const now = new Date().toISOString();

    const map: ParameterMap = {
      id: mapId,
      name,
      rules,
      createdAt: now,
      updatedAt: now,
    };

    this.mockParameterMaps.set(mapId, map);
    return map;
  }
}

// Create and export a singleton instance
export const apiMock = new ApiMock();

// Export a function to replace the real API with mocks
export function setupApiMocks(config: Partial<MockConfig> = {}): void {
  apiMock.updateConfig(config);

  // This function would be used in your application to replace the real API with mocks
  // For example:
  //
  // import { setupApiMocks } from './tests/mocks/apiMocks';
  //
  // if (process.env.NODE_ENV === 'development') {
  //   setupApiMocks({
  //     enabled: true,
  //     defaultDelay: 500,
  //     errorRate: 0.1,
  //   });
  // }
}

// Export a mock data generator for testing edge cases
export const mockDataGenerator = {
  /**
   * Generate a large dataset of mock audio results
   */
  generateAudioDataset(count: number): AudioResult[] {
    const results: AudioResult[] = [];

    for (let i = 0; i < count; i++) {
      const prompt = `Test audio ${i + 1}`;
      const duration = Math.floor(Math.random() * 10) + 1; // 1-10 seconds

      results.push(apiMock.generateMockAudio(prompt, { duration }));
    }

    return results;
  },

  /**
   * Generate a large dataset of mock patterns
   */
  generatePatternDataset(count: number): Pattern[] {
    const results: Pattern[] = [];
    const patternTypes = ['rhythm', 'melody', 'harmony', 'texture', 'timbre'];

    for (let i = 0; i < count; i++) {
      const type = patternTypes[i % patternTypes.length];
      results.push(apiMock.generateMockPattern(type));
    }

    return results;
  },

  /**
   * Generate edge case audio results
   */
  generateEdgeCaseAudio(): AudioResult[] {
    return [
      // Empty prompt
      apiMock.generateMockAudio('', { duration: 1 }),

      // Very long prompt
      apiMock.generateMockAudio('a'.repeat(1000), { duration: 1 }),

      // Very short duration
      apiMock.generateMockAudio('Short duration', { duration: 0.1 }),

      // Very long duration
      apiMock.generateMockAudio('Long duration', { duration: 600 }), // 10 minutes

      // Special characters in prompt
      apiMock.generateMockAudio('Special chars: !@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./'),

      // Unicode characters in prompt
      apiMock.generateMockAudio('Unicode: 你好, こんにちは, 안녕하세요, Привет, مرحبا, שלום'),
    ];
  },

  /**
   * Generate edge case patterns
   */
  generateEdgeCasePatterns(): Pattern[] {
    // Create base patterns and then modify them for edge cases
    const highConfidencePattern = apiMock.generateMockPattern();
    highConfidencePattern.confidence = 1.0;

    const lowConfidencePattern = apiMock.generateMockPattern();
    lowConfidencePattern.confidence = 0.01;

    const manyRelatedPattern = apiMock.generateMockPattern();
    manyRelatedPattern.relatedPatterns = Array.from({ length: 100 }, (_, i) => `pattern-${i}`);

    const extremeValuesPattern = apiMock.generateMockPattern();
    extremeValuesPattern.features = {
      tempo: 999,
      complexity: 0,
      density: 0,
    };

    return [
      highConfidencePattern,
      lowConfidencePattern,
      manyRelatedPattern,
      extremeValuesPattern
    ];
  },
};

