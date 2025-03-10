export interface TestMetrics {
  executionTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
  successRate: number;
  errorRate: number;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface TestCoverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface TestReport {
  summary: TestSummary;
  coverage: TestCoverage;
  performance: TestMetrics;
}

// Audio model specific types
export interface AudioModel {
  id: string;
  name: string;
  capabilities: {
    transcription?: boolean;
    synthesis?: boolean;
    streaming?: boolean;
  };
  maxConcurrentRequests?: number;
  resourceRequirements?: {
    minMemory: number;
    gpuRequired: boolean;
  };
}

export interface AudioTestCase {
  name: string;
  description: string;
  input: {
    type: 'file' | 'stream';
    data: string | ReadableStream;
    duration?: number;
  };
  expectedOutput: {
    type: 'transcription' | 'audio';
    data: string | ArrayBuffer;
    accuracy?: number;
  };
  timeout?: number;
}

export interface AudioTestSuite {
  name: string;
  description: string;
  testCases: AudioTestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface AudioModelMetrics {
  latency: {
    singleRequest: number;
    avgConcurrent: number;
    streamingLatency: number;
  };
  quality: {
    audioFidelity: number;
    transcriptionAccuracy: number;
    contextRetention: number;
  };
  resources: {
    memoryUsage: {
      peak: number;
      average: number;
    };
    gpuUtilization: number;
    scalingEfficiency: number;
  };
}

export interface AudioIntegrationMetrics {
  handoffLatency: number;
  errorRecoveryTime: number;
  stateConsistency: number;
}

export interface AudioTestMetrics extends TestMetrics {
  audio: AudioModelMetrics;
  integration: AudioIntegrationMetrics;
}

export interface AudioTestReport extends TestReport {
  audioMetrics: AudioModelMetrics;
  integrationMetrics: AudioIntegrationMetrics;
}