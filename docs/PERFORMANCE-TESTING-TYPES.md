# Performance Testing Types Specification

This document specifies the TypeScript types and interfaces required for implementing the performance testing infrastructure.

## Core Types

### Test Configuration

```typescript
interface TestConfig {
  outputDir: string;
  verbose: boolean;
  phase?: 'baseline' | 'cross-model' | 'load';
  timeout?: number;
  maxMemory?: number;
}
```

### Performance Metrics

```typescript
interface PerformanceMetrics {
  memoryUsage: {
    baseline: number;    // Initial memory usage
    peak: number;       // Maximum memory usage
    afterRelease: number; // Memory after cleanup
  };
  contextStats: {
    loadTime: number;      // Time to load context
    transitionTime: number; // Time to switch contexts
    compressionRatio: number; // Context compression efficiency
  };
  modelMetrics: {
    inferenceTime: number;    // Time for model inference
    responseLatency: number;  // End-to-end response time
    contextSwitchTime: number; // Time to switch models
  };
}
```

### Test Phase

```typescript
interface TestPhase {
  name: string;
  duration: number;  // Duration in milliseconds
  metrics: string[]; // Metrics to collect
  successCriteria: {
    [key: string]: number; // Metric thresholds
  };
}
```

### Test Results

```typescript
interface TestResults {
  timestamp: string;
  config: TestConfig;
  phases: {
    name: string;
    metrics: PerformanceMetrics;
    success: boolean;
    errors?: Error[];
  }[];
  summary: {
    totalDuration: number;
    overallSuccess: boolean;
    failedPhases: string[];
  };
}
```

### Metrics Collector

```typescript
interface MetricsCollector {
  startCollection(): void;
  collectMetrics(duration: number): Promise<Metrics>;
  stopCollection(): void;
  getAverages(): {
    avgLoadTime: number;
    avgInferenceTime: number;
    avgMemoryUsage: number;
  };
}
```

### Test Runner

```typescript
interface TestRunner {
  runTests(): Promise<{
    results: TestResults;
    report: TestReport;
  }>;
  cleanup(): Promise<void>;
}
```

### Test Report

```typescript
interface TestReport {
  title: string;
  timestamp: string;
  summary: {
    status: 'pass' | 'fail';
    duration: number;
    totalPhases: number;
    passedPhases: number;
  };
  phases: {
    name: string;
    status: 'pass' | 'fail';
    metrics: {
      name: string;
      value: number;
      threshold: number;
      status: 'pass' | 'fail';
    }[];
    errors?: string[];
  }[];
  recommendations?: string[];
}
```

### Memory Profile

```typescript
interface MemoryProfile {
  samples: number[];
  average: number;
  peak: number;
  timeline: {
    timestamp: number;
    usage: number;
    event?: string;
  }[];
}
```

### Cross-Model Metrics

```typescript
interface CrossModelMetrics {
  switchingLatency: {
    averageSwitchTime: number;
    maxSwitchTime: number;
    minSwitchTime: number;
  };
  contextPreservation: {
    preservationRate: number;
    contextSize: number;
  };
  memoryProfile: MemoryProfile;
}
```

### Error Types

```typescript
interface TestError extends Error {
  phase: string;
  metric?: string;
  threshold?: number;
  actual?: number;
}

interface ResourceError extends Error {
  resource: string;
  limit: number;
  actual: number;
}
```

## Usage Examples

### Configuring a Test Run

```typescript
const config: TestConfig = {
  outputDir: 'test-results',
  verbose: true,
  phase: 'baseline',
  timeout: 3600000, // 1 hour
  maxMemory: 14 * 1024 * 1024 * 1024 // 14GB
};
```

### Defining a Test Phase

```typescript
const baselinePhase: TestPhase = {
  name: 'Baseline Performance',
  duration: 3600000, // 1 hour
  metrics: ['memoryUsage', 'responseTime', 'contextPreservation'],
  successCriteria: {
    maxMemoryUsage: 14 * 1024 * 1024 * 1024, // 14GB
    avgResponseTime: 1000, // 1 second
    contextPreservation: 0.95 // 95%
  }
};
```

### Collecting Metrics

```typescript
const collector = new MetricsCollector();
collector.startCollection();
const metrics = await collector.collectMetrics(1000); // 1 second test
collector.stopCollection();
```

## Implementation Notes

1. All memory measurements should be in bytes
2. All time measurements should be in milliseconds
3. All ratios should be between 0 and 1
4. Error handling should use the defined error types
5. Metrics collection should be non-blocking where possible
6. Resource cleanup should be handled in finally blocks

## Type Extensions

When adding new metrics or test phases:

1. Extend the appropriate interface
2. Update success criteria types
3. Add to the metrics collector
4. Update the test runner
5. Modify the report generator

## Best Practices

1. Use strict typing throughout
2. Avoid any type assertions
3. Implement proper error handling
4. Include JSDoc comments
5. Add unit tests for new types
