# Health Monitoring System

## Overview
The Health Monitoring System provides comprehensive tracking of application health states, transition validation, and trend analysis. It ensures system stability by preventing erratic state changes and making informed decisions based on historical data.

## Components

### StateHistoryManager
Manages a history of timestamped health state entries with capabilities for:
- Time-based queries and filtering
- Trend analysis for detecting patterns
- Efficient storage with automatic cleanup

```typescript
// Example usage
const historyManager = new StateHistoryManager<TimestampedHealthState>(100);
historyManager.addEntry(healthState);
const recentStates = historyManager.getRecentWindow(60000); // Last minute
const trends = historyManager.analyzeTrend('indicators.performance.score');
```

### StateTransitionValidator
Enforces rules for health state transitions to prevent erratic changes:
- Minimum state duration requirements
- Maximum transition rate limiting
- Valid transition path enforcement
- Recovery confirmation requirements

```typescript
// Example usage
const validator = new StateTransitionValidator(config);
if (validator.canTransition(currentState, newState)) {
  // Perform the transition
}
```

### ThresholdManager
Manages dynamic thresholds that adjust based on system load and context:
- Context-specific threshold profiles
- Load-based threshold adjustment
- Learning from historical patterns
- Hysteresis to prevent oscillation

## Integration

The GrymSynthHealthMonitor integrates these components to provide a comprehensive health monitoring solution:

```typescript
// Creating the health monitor
const healthMonitor = new GrymSynthHealthMonitor();

// Recording metrics
healthMonitor.recordBufferUnderrun();
healthMonitor.recordAudioProcessing(10, 1024, 44100);
healthMonitor.recordLLMOperation(100, 500, 150);

// Getting adaptive quality settings
const settings = healthMonitor.getAdaptiveQualitySettings();
```

## Testing

Comprehensive unit tests are available for all components:
- `StateHistoryManager.test.ts`
- `StateTransitionValidator.test.ts`
- `ThresholdManager.test.ts`
- `GrymSynthHealthMonitor.test.ts`

To run the tests:
```
npx jest src/lib/feature-memory/core/health/__tests__
```