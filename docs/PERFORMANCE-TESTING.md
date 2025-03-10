# Performance Testing Suite

This document describes the performance testing suite for the grym-synth's LLM integration. The suite is designed to measure and monitor various performance metrics across different models and usage scenarios.

## Overview

The performance testing suite measures:
- Memory usage and optimization
- Context window limitations
- Model switching latency
- Multi-model interaction performance
- System stability under load
- Compression efficiency
- Token management performance
- Cache hit rates
- Resource utilization patterns

## Running Tests

### Basic Usage

```bash
npm run test:perf
```

### Command Line Options

```bash
npm run test:perf -- [options]

Options:
  --output, -o     Output directory for test results    [default: "test-results"]
  --verbose, -v    Enable verbose logging               [default: false]
  --phase, -p      Run specific test phase             [choices: "baseline", "cross-model", "load", "compression", "token"]
  --metrics, -m    Specific metrics to collect         [array]
  --threshold, -t  Custom threshold values             [object]
  --help          Show help information
```

## Test Phases

### 1. Baseline Performance
- Duration: 1 hour
- Metrics:
  - Memory usage (max 14GB)
  - Response time (target: <1s)
  - Context preservation (target: 95%)
  - Compression ratio (target: >0.5)
  - Cache hit rate (target: >80%)

### 2. Cross-Model Interaction
- Duration: 2 hours
- Metrics:
  - Model switching time (target: <2s)
  - Context accuracy (target: 90%)
  - Memory growth (max 100MB)
  - Token window optimization (target: 95%)
  - Resource reallocation (target: <500ms)

### 3. Load Testing
- Duration: 4 hours
- Metrics:
  - Concurrent requests (target: 10)
  - System stability (target: 99%)
  - Error rate (target: <1%)
  - Memory compression efficiency (target: >0.7)
  - Cache performance (target: >90% hit rate)

### 4. Compression Testing
- Duration: 2 hours
- Metrics:
  - Compression ratio (target: >0.6)
  - Decompression speed (target: <100ms)
  - Memory savings (target: >40%)
  - Context preservation (target: 98%)
  - Recovery accuracy (target: 99%)

### 5. Token Management
- Duration: 2 hours
- Metrics:
  - Window optimization (target: 95%)
  - Token counting accuracy (target: 99.9%)
  - Truncation efficiency (target: <50ms)
  - Budget compliance (target: 100%)
  - Context relevance (target: >90%)

## Output

The test suite generates three types of output files:

1. JSON Results (`results-[timestamp].json`):
   - Detailed metrics and measurements
   - Raw data for further analysis
   - Test configuration details
   - Compression statistics
   - Token management data

2. Markdown Report (`report-[timestamp].md`):
   - Human-readable summary
   - Pass/fail status for each phase
   - Key metrics and thresholds
   - Failure details if any
   - Performance recommendations

3. Metrics Dashboard (`metrics-[timestamp].html`):
   - Interactive visualizations
   - Real-time metrics
   - Trend analysis
   - Resource utilization graphs
   - Performance bottleneck identification

## Interpreting Results

### Success Criteria

A test phase is considered successful if:
- All critical metrics are within thresholds
- No unhandled errors occurred
- Memory usage remains stable
- Context preservation meets targets
- Compression ratios are maintained
- Token management is optimal
- Cache performance meets targets

### Common Issues

1. Memory Spikes
   - Check for memory leaks
   - Verify context cleanup
   - Monitor model unloading
   - Review compression settings
   - Validate cache eviction

2. Slow Model Switching
   - Check model cache configuration
   - Verify memory management
   - Review context handling
   - Optimize compression pipeline
   - Tune token windows

3. Context Loss
   - Verify compression settings
   - Check context window limits
   - Review preservation logic
   - Monitor token budgets
   - Validate cleanup procedures

4. Compression Issues
   - Check ratio thresholds
   - Verify memory patterns
   - Review compression strategy
   - Monitor recovery process
   - Validate data integrity

## Development

### Adding New Tests

To add a new test phase:

1. Define phase in `TestPhase` interface
2. Implement metrics collection
3. Add success criteria
4. Update test runner
5. Add compression metrics
6. Include token management

Example:

```typescript
{
  name: 'New Test Phase',
  duration: 3600,
  metrics: ['metric1', 'metric2', 'compression_ratio', 'token_efficiency'],
  success_criteria: {
    metric1: 100,
    metric2: 0.95,
    compression_ratio: 0.7,
    token_efficiency: 0.9
  }
}
```

### Modifying Thresholds

Adjust success criteria in `test-plan.ts`:

```typescript
success_criteria: {
  maxMemoryUsage: 14 * 1024 * 1024 * 1024, // 14GB
  avgResponseTime: 1000,                    // 1 second
  contextPreservation: 0.95,               // 95%
  compressionRatio: 0.7,                   // 70%
  tokenAccuracy: 0.999                     // 99.9%
}
```

## Best Practices

1. Regular Testing
   - Run full suite weekly
   - Monitor trends over time
   - Track performance regressions
   - Analyze compression patterns
   - Review token management

2. Test Data
   - Use representative workloads
   - Include edge cases
   - Vary context sizes
   - Test compression limits
   - Validate token scenarios

3. Environment
   - Test in isolation
   - Consistent hardware
   - Clean state between runs
   - Monitor resource usage
   - Track cache state

## Troubleshooting

### Common Errors

1. Memory Allocation Failures
   ```
   Solution: Increase Node.js memory limit
   node --max-old-space-size=16384 src/lib/testing/run-performance-tests.ts
   ```

2. Timeout Issues
   ```
   Solution: Adjust phase duration or timeout settings
   --timeout 7200000  // 2 hours
   ```

3. Resource Conflicts
   ```
   Solution: Ensure no other resource-intensive processes are running
   ```

4. Compression Failures
   ```
   Solution: Adjust compression settings
   --compression-ratio 0.5 --min-savings 0.3
   ```

5. Token Management Issues
   ```
   Solution: Tune token window parameters
   --max-window-size 4096 --optimization-threshold 0.8
   ```

## Contributing

When adding or modifying tests:

1. Document new metrics
2. Update success criteria
3. Add error handling
4. Include test cases
5. Update documentation
6. Add compression tests
7. Include token management tests

## Future Improvements

- [x] Continuous monitoring integration
- [x] Automated performance regression detection
- [x] Extended multi-model scenarios
- [x] Custom metric plugins
- [x] Cloud resource monitoring
- [x] Advanced compression analytics
- [x] Token optimization tools
- [ ] Machine learning-based analysis
- [ ] Predictive performance modeling
- [ ] Automated optimization suggestions

