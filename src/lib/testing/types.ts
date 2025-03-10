/**
 * Performance testing types and interfaces
 */

export type TestPhaseName = 'baseline' | 'cross-model' | 'load';

export interface PhaseConfig {
  name: TestPhaseName;
  duration: number;
  metrics: string[];
  thresholds: Record<string, number>;
}

export interface MemoryUsage {
  baseline: number;
  peak: number;
  afterRelease: number;
}

export interface ContextStats {
  loadTime: number;
  transitionTime: number;
  compressionRatio: number;
}

export interface ModelMetrics {
  inferenceTime: number;
  responseLatency: number;
  contextSwitchTime: number;
  switchingLatency?: SwitchingLatency;
  contextPreservation?: ContextPreservation;
  memoryProfile?: MemoryProfile;
}

export interface BaseModelMetrics {
  inferenceTime: number;
  responseLatency: number;
  contextSwitchTime: number;
}

export interface PerformanceMetrics {
  memoryUsage: MemoryUsage;
  contextStats: ContextStats;
  modelMetrics: BaseModelMetrics;
}

export interface TestResults {
  timestamp: string;
  phaseName: TestPhaseName;
  metrics: PerformanceMetrics;
  success: boolean;
  error?: string;
  duration: number;
}

export interface TestConfig {
  baselineIterations: number;
  crossModelPairs: number;
  loadTestDuration: number;
  metricsInterval: number;
  maxConcurrentRequests: number;
  memoryThreshold: number;
  responseTimeThreshold: number;
  outputDir: string;
  maxMemory: number;
}

export const DEFAULT_CONFIG: TestConfig = {
  baselineIterations: 100,
  crossModelPairs: 5,
  loadTestDuration: 3600000, // 1 hour
  metricsInterval: 5000, // 5 seconds
  maxConcurrentRequests: 10,
  memoryThreshold: 1024 * 1024 * 1024, // 1GB
  responseTimeThreshold: 1000, // 1 second
  outputDir: './test-results',
  maxMemory: 2 * 1024 * 1024 * 1024 // 2GB
};

export const DEFAULT_THRESHOLDS = {
  maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
  avgResponseTime: 1000, // 1 second
  contextPreservation: 0.95, // 95%
  modelSwitchTime: 500, // 500ms
  contextAccuracy: 0.9, // 90%
  memoryGrowth: 512 * 1024 * 1024, // 512MB
  errorRate: 0.01, // 1%
  concurrentRequests: 10
};

export interface MetricsSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
}

export interface TimelineEvent {
  timestamp: number;
  usage: number;
  event: string;
}

export interface MemoryProfile {
  samples: number[];
  peak: number;
  timestamp?: number[];
  average: number;
  timeline: TimelineEvent[];
}

export interface SwitchingLatency {
  averageSwitchTime: number;
  maxSwitchTime: number;
  minSwitchTime: number;
  samples?: number[];
}

export interface ContextPreservation {
  preservationRate: number;
  contextSize: number[];
  accuracy: number[];
}

export interface CrossModelResults {
  inferenceTime: number;
  responseLatency: number;
  contextSwitchTime: number;
  switchingLatency: SwitchingLatency;
  contextPreservation: ContextPreservation;
  memoryProfile: MemoryProfile;
}

export interface LoadTestMetrics {
  concurrentRequests: number;
  responseTime: number[];
  errorCount: number;
  memoryUsage: number[];
  cpuUsage: number[];
}

export interface SystemMetrics {
  timestamp: number;
  memory: {
    total: number;
    used: number;
    free: number;
  };
  cpu: {
    user: number;
    system: number;
    idle: number;
  };
}

export interface MetricResult {
  name: string;
  value: number;
  threshold: number;
  status: MetricStatus;
}

export interface TestPhaseResult {
  name: TestPhaseName;
  status: string;
  metrics: MetricResult[];
  errors?: string[];
}

export interface TestReport {
  title: string;
  timestamp: string;
  summary: {
    status: string;
    duration: number;
    totalPhases: number;
    passedPhases: number;
  };
  phases: TestPhaseResult[];
  systemMetrics?: SystemMetrics[];
  recommendations: string[];
}

export type MetricStatus = 'pass' | 'fail';

export type CrossModelMetrics = CrossModelResults;

export type SampleArray = number | number[];