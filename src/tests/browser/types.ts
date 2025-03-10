// Extend Performance interface to include memory
interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

export interface ValidationScenario {
  name: string;
  run: () => Promise<ValidationResult>;
  cleanup?: () => Promise<void>;
}

export interface ValidationResult {
  passed: boolean;
  details: string;
  metrics?: Record<string, unknown>;
}

export interface TestMetrics {
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  memory: {
    before: number;
    after: number;
    difference: number;
  };
  performance: {
    fps: number;
    frameTime: number;
  };
}

export interface NetworkCondition {
  latency: number;    // milliseconds
  bandwidth: number;  // bits per second
  packetLoss: number; // percentage
}

export interface DeviceProfile {
  userAgent: string;
  screenSize: {
    width: number;
    height: number;
  };
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface AudioTestConfig {
  sampleRate: number;
  channels: number;
  duration: number;  // seconds
  format: 'wav' | 'mp3' | 'ogg';
}

export interface TestEnvironment {
  network: NetworkCondition;
  device: DeviceProfile;
  audio: AudioTestConfig;
}

export interface ValidationMetrics {
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  timing: {
    processing: number;
    learning: number;
    total: number;
  };
  audio: {
    buffersProcessed: number;
    totalDuration: number;
    averageLatency: number;
  };
  performance: {
    fps: number;
    dropped: number;
  };
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  metrics: ValidationMetrics;
  error?: Error;
}

export type TestSuite = {
  name: string;
  setup?: () => Promise<void>;
  tests: Test[];
  teardown?: () => Promise<void>;
};

export type Test = {
  name: string;
  run: () => Promise<TestResult>;
  timeout?: number;
};

export enum TestStatus {
  Passed = 'passed',
  Failed = 'failed',
  Skipped = 'skipped',
  Running = 'running'
}

export interface TestReport {
  suiteName: string;
  environment: TestEnvironment;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  metrics: ValidationMetrics;
  timestamp: Date;
}