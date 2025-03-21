# Health Monitor Implementation Guide

## System Architecture

The enhanced health monitoring system consists of several key components working together to provide comprehensive system health tracking, analysis, and adaptive optimization.

### Key Components

1. **StateHistoryManager**
   - Records and maintains a history of health states
   - Provides time-based queries for historical analysis
   - Offers trend analysis and pattern detection
   - Maintains a configurable size limit for efficient memory usage

2. **StateTransitionValidator**
   - Enforces rules for valid health state transitions
   - Prevents rapid oscillation between states
   - Ensures minimum duration for states before transitions
   - Requires confirmation samples for recovery

3. **ThresholdManager**
   - Manages dynamic thresholds for various metrics
   - Adjusts thresholds based on system load and context
   - Learns from historical patterns to optimize thresholds
   - Implements hysteresis to prevent threshold oscillation

4. **GrymSynthHealthMonitor**
   - Integrates all components into a unified system
   - Records various metrics (audio, LLM, UI, etc.)
   - Evaluates current health state based on metrics
   - Provides adaptive quality settings based on health

## Implementation

### StateHistoryManager

The `StateHistoryManager` provides a generic implementation for storing and querying timestamped entries:

```typescript
export class StateHistoryManager<T extends TimestampedEntry> {
  private entries: T[] = [];
  private readonly maxEntries: number;
  
  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  // Adds a new entry with automatic timestamp if missing
  public addEntry(entry: T): T {
    // Implementation...
  }

  // Various query methods
  public getHistory(): T[] {...}
  public getTimeRange(startTime: number, endTime: number): T[] {...}
  public getLast(count: number): T[] {...}
  public getRecentWindow(windowMs: number): T[] {...}
  
  // Analysis methods
  public analyzePatterns(propertyPath: string): Record<string, number> {...}
  public calculateChangeRate(propertyPath: string, timeWindowMs: number): number {...}
  public analyzeTrend(propertyPath: string, shortWindowMs: number, longWindowMs: number): {...}
}
```

### StateTransitionValidator

The `StateTransitionValidator` enforces rules for health state transitions:

```typescript
export class StateTransitionValidator {
  private readonly config: StateTransitionConfig;
  private lastTransitionTime: number = 0;
  private transitionsInLastMinute: number = 0;
  private recoveryConfirmationCount: Record<string, number> = {};
  
  constructor(config: StateTransitionConfig) {
    this.config = config;
  }

  // Checks if a transition is valid
  public canTransition(from: HealthState, to: HealthState): boolean {
    // Implementation...
  }

  // Validates transition paths
  private isValidTransitionPath(from: HealthStatusType, to: HealthStatusType): boolean {...}
  
  // Validates timing constraints
  private meetsTimingConstraints(): boolean {...}
  
  // Validates recovery conditions
  private meetsRecoveryConditions(from: HealthState, to: HealthState): boolean {...}
}
```

### GrymSynthHealthMonitor

The `GrymSynthHealthMonitor` integrates these components:

```typescript
export class GrymSynthHealthMonitor extends HealthMonitor {
  private stateHistoryManager: StateHistoryManager<TimestampedHealthState>;
  private stateTransitionValidator: StateTransitionValidator;
  private thresholdManager: ThresholdManager;
  
  constructor(
    transitionConfig: StateTransitionConfig = DEFAULT_TRANSITION_CONFIG,
    historyLimit: number = 100
  ) {
    super();
    // Initialize components...
  }

  // Records various metrics
  public recordAudioProcessing(processingTime: number, bufferSize: number, sampleRate: number): void {...}
  public recordBufferUnderrun(): void {...}
  public recordLLMOperation(promptTokens: number, responseTokens: number, responseTime: number, fromCache = false): void {...}
  
  // Provides adaptive quality settings
  public getAdaptiveQualitySettings(): QualitySettings {...}
  
  // Health state management
  public getHealthHistory(limit: number = 10): TimestampedHealthState[] {...}
  public evaluateHealthState(): void {...}
  private determineHealthState(): HealthState {...}
}
```

## Testing

Each component has comprehensive unit tests:

1. **StateHistoryManager Tests**
   - Basic operations (add, clear, limit)
   - Query operations (time range, recent, window)
   - Analysis methods (patterns, trends, change rate)
   - Edge cases (empty history, single entry)

2. **StateTransitionValidator Tests**
   - Valid transitions (paths, conditions)
   - Invalid transitions (constraints, paths)
   - Timing constraints (minimum duration, maximum rate)
   - Recovery conditions (confirmation samples, reset)

3. **ThresholdManager Tests**
   - Dynamic threshold adjustment
   - Context-specific thresholds
   - Learning from operations
   - Hysteresis prevention

4. **GrymSynthHealthMonitor Tests**
   - State management (initialization, history)
   - Metric recording (audio, LLM, UI)
   - Trend analysis (short term, long term)
   - Adaptive settings based on health

## Integration

The health monitoring system integrates with:

1. **Audio System**
   - Records processing time, buffer underruns
   - Adjusts buffer size and effects based on health

2. **LLM Operations**
   - Tracks token counts, response times
   - Adjusts context window and chunk size based on health

3. **Visualization System**
   - Monitors active visualizations and complexity
   - Adjusts particle count and frame rate based on health

## Usage

```typescript
// Create the health monitor
const healthMonitor = new GrymSynthHealthMonitor();

// Record metrics during operations
audioEngine.onProcess = (time, buffer) => {
  healthMonitor.recordAudioProcessing(time, buffer.length, sampleRate);
};

audioEngine.onUnderrun = () => {
  healthMonitor.recordBufferUnderrun();
};

llmOrchestrator.onCompletion = (stats) => {
  healthMonitor.recordLLMOperation(
    stats.promptTokens,
    stats.responseTokens,
    stats.responseTime,
    stats.fromCache
  );
};

// Regularly get adaptive settings
setInterval(() => {
  const settings = healthMonitor.getAdaptiveQualitySettings();
  
  // Apply settings to components
  visualizer.setComplexity(settings.visualization.complexity);
  audioEngine.setBufferSize(settings.audio.bufferSize);
  llmOrchestrator.setContextWindow(settings.llm.contextWindow);
}, 5000);
```

## Logging Considerations

The health monitor includes comprehensive logging for health state changes, trend analysis, and threshold adjustments. To reduce noise, consider setting a minimum log level for production environments.

## Configuration

The system is highly configurable through:

1. **StateTransitionConfig**
   - `minStateDuration`: Minimum time in milliseconds a state must be maintained
   - `maxTransitionsPerMinute`: Maximum allowed transitions per minute
   - `confirmationSamples`: Required consecutive samples for recovery
   - `cooldownPeriod`: Minimum time between state evaluations

2. **ThresholdConfig**
   - Memory thresholds (heap usage, cache utilization)
   - Performance thresholds (latency, throughput)
   - Error thresholds (error rate)

## Future Enhancements

1. **Persistent History Storage**
   - Store health history across sessions
   - Analyze long-term trends

2. **Enhanced Visualization**
   - Real-time health dashboard
   - Trend visualization

3. **Predictive Analytics**
   - Predict future health states
   - Preemptive quality adjustments

4. **Machine Learning Integration**
   - Learn optimal thresholds from usage patterns
   - Identify correlations between metrics