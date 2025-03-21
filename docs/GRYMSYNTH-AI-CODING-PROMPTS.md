# GrymSynth AI Coding Prompts

This document contains ready-to-use prompts for AI coders to implement various components of the GrymSynth system. Each prompt provides context, requirements, technical considerations, and integration points to guide the implementation.

## Table of Contents

- [GrymSynth AI Coding Prompts](#grymsynth-ai-coding-prompts)
  - [Table of Contents](#table-of-contents)
  - [Foundation \& Infrastructure](#foundation--infrastructure)
    - [✅ TypeScript Configuration](#-typescript-configuration)
    - [Health Monitor Enhancement](#health-monitor-enhancement)
  - [✅ ThresholdManager Implementation](#-thresholdmanager-implementation)
  - [Next Implementation: Claude Code Integration](#next-implementation-claude-code-integration)

## Foundation & Infrastructure

### ✅ TypeScript Configuration

```
# TypeScript Configuration for GrymSynth

## Status: Completed ✅
- Updated tsconfig.json with proper settings
- Configured ESLint and Prettier
- Fixed line ending issues
- Set up proper module resolution
```

### Health Monitor Enhancement

```
# Health Monitor Enhancement for GrymSynth

## Context
GrymSynth has a foundation health monitoring system that tracks memory, performance, and error metrics to maintain system stability. This system needs enhancement to support the real-time visualization, playback, and analysis components alongside the AI orchestration subsystems.

## Current State
The existing health monitoring system includes:
- State machine for health status transitions (healthy → degraded → unhealthy)
- Metrics collection for memory, performance, and errors
- Stability mechanisms to prevent rapid state fluctuations
- Basic recommendations based on system status

## Requirements

1. **Enhance Audio Playback and Analysis Monitoring**:
   - Add buffer performance monitoring for audio playback
   - Implement visualization data extraction timing
   - Track FFT and analysis processing overhead
   - Monitor multi-track mixing performance
   - Create metrics for audio playback quality

2. **Integrate Model Performance Tracking**:
   - Add generation timing for AudioLDM and XenakisLDM
   - Monitor reasoning LLM response times and quality
   - Track model resource utilization (memory, computation)
   - Measure completion success rates for generation tasks
   - Create model-specific health indicators

3. **Implement Advanced State History**:
   - Create comprehensive state transition history
   - Implement trend analysis for key metrics
   - Add predictive degradation detection
   - Design time-series visualization of system health
   - Create exportable health reports

4. **Develop Recovery Validation**:
   - Implement recovery confirmation requirements
   - Create staged recovery processes
   - Add recovery verification metrics
   - Design automatic recovery procedures
   - Implement recovery success tracking

5. **Create Adaptive Quality System**:
   - Implement health-based quality adaptation
   - Create component-specific quality profiles
   - Add progressive quality reduction strategies
   - Design user-configurable quality thresholds
   - Implement quality impact analysis

## Deliverables

1. `GrymSynthHealthMonitor` class extending the base `HealthMonitor`
2. `AudioSystemMetrics` for playback and analysis monitoring
3. `ModelPerformanceTracker` for generation and reasoning metrics
4. `AdaptiveQualityManager` for health-based quality control
5. `RecoveryValidator` for ensuring proper system recovery
6. `HealthHistoryAnalyzer` for trend analysis and prediction
7. Unit tests for all new components
8. Integration test demonstrating adaptive quality under load

## Technical Considerations

- Balance monitoring overhead with system performance
- Implement efficient metric collection with minimal impact
- Consider threaded operation for intensive analysis
- Ensure type safety throughout the implementation
- Design for extensibility as new components are added

## Integration Points

- This component extends the existing Feature Memory health infrastructure
- It provides health metrics for AudioLDM and reasoning LLM operations
- It monitors real-time audio playback and visualization components
- It controls quality settings across the system based on health status
- It will integrate with the window system for visualization of health metrics

## Implementation Progress
- [x] Documentation and planning
- [x] Basic health monitoring setup
- [x] StateHistory implementation
- [x] Transition validation
- [x] Metric trend analysis
- [x] Recovery validation
- [x] ThresholdManager implementation
- [x] GrymSynthHealthMonitor integration
- [x] Comprehensive testing
- [ ] Health Metrics Dashboard
- [ ] Enhanced Audio Engine Integration
```

## ✅ ThresholdManager Implementation

```
# ThresholdManager Implementation for GrymSynth

## Status: Completed ✅

## Context
The GrymSynth health monitoring system has been enhanced with state history tracking, transition validation, and trend analysis. The next step is to implement a ThresholdManager that can dynamically adjust thresholds based on system load and historical patterns.

## Current State
The health monitoring system now includes:
- StateHistoryManager for tracking health state history
- StateTransitionValidator for enforcing state transition rules
- Trend analysis for detecting patterns in health metrics
- Recovery validation for ensuring proper system recovery

## Requirements

1. **Dynamic Threshold Adjustment**:
   - Implement threshold adjustment based on system load
   - Create context-aware thresholds for different operations
   - Design threshold hysteresis to prevent oscillation
   - Implement progressive threshold changes

2. **Historical Pattern Learning**:
   - Analyze historical patterns to optimize thresholds
   - Implement threshold learning from successful operations
   - Create threshold profiles for different workloads
   - Design threshold adaptation based on time of day

3. **Integration with Health Monitor**:
   - Connect ThresholdManager to GrymSynthHealthMonitor
   - Update health evaluation to use dynamic thresholds
   - Implement threshold override capabilities
   - Create threshold visualization for debugging

## Deliverables

1. `ThresholdManager` class with the following capabilities:
   - Dynamic threshold adjustment based on system load
   - Context-aware thresholds for different operations
   - Threshold learning from historical patterns
   - Integration with GrymSynthHealthMonitor

2. Unit tests for ThresholdManager
3. Integration tests with GrymSynthHealthMonitor
4. Documentation for threshold configuration

## Technical Considerations

- Balance threshold sensitivity with stability
- Implement efficient threshold calculation
- Ensure type safety throughout the implementation
- Design for extensibility as new metrics are added

## Integration Points

- This component integrates with GrymSynthHealthMonitor
- It uses StateHistoryManager for historical analysis
- It provides thresholds for health evaluation
- It will be used by the adaptive quality system

## Implementation Approach

1. Create ThresholdConfig interface
2. Implement base ThresholdManager class
3. Add dynamic threshold adjustment
4. Implement historical pattern learning
5. Integrate with GrymSynthHealthMonitor
6. Create comprehensive tests

## Implementation Results

The ThresholdManager has been successfully implemented with the following features:
- Dynamic threshold adjustment based on system load and context
- Context-specific threshold profiles for different operations
- Learning from successful operations to optimize thresholds
- Hysteresis to prevent threshold oscillation
- Integration with GrymSynthHealthMonitor for health state determination and adaptive quality settings

Documentation:
- `docs/THRESHOLD-MANAGER-IMPLEMENTATION.md`: Implementation details
- `docs/THRESHOLD-MANAGER-TESTING.md`: Testing guide
```

## Next Implementation: Claude Code Integration

```
# Claude Code Integration for GrymSynth

## Context
GrymSynth is a complex system with multiple components that require ongoing development and maintenance. Claude Code is an agentic coding tool that can help accelerate development, improve code quality, and reduce the burden on developers.

## Current State
The GrymSynth project currently includes:
- Core health monitoring system with ThresholdManager
- Audio processing with health awareness
- Memory and performance monitoring
- Various feature modules

## Requirements

1. **Claude Code Workflow Integration**:
   - Define workflow for using Claude Code in GrymSynth development
   - Create templates for common Claude Code tasks
   - Design integration with existing development processes
   - Implement CI/CD integration with Claude Code

2. **Code Generation and Enhancement**:
   - Use Claude Code for implementing new features
   - Leverage Claude Code for refactoring existing code
   - Implement test generation with Claude Code
   - Create documentation generation workflows

3. **Intelligent Debugging and Optimization**:
   - Use Claude Code for identifying and fixing bugs
   - Implement performance optimization with Claude Code
   - Create security analysis workflows
   - Design code quality improvement processes

4. **Knowledge Management**:
   - Use Claude Code for codebase understanding
   - Implement knowledge transfer workflows
   - Create onboarding materials with Claude Code
   - Design documentation maintenance processes

## Deliverables

1. Claude Code integration guide
2. Templates for common Claude Code tasks
3. CI/CD integration with Claude Code
4. Documentation for Claude Code workflows

## Technical Considerations

- Balance automation with human oversight
- Implement efficient Claude Code workflows
- Ensure security and privacy of code
- Design for extensibility as Claude Code evolves

## Integration Points

- This component integrates with the entire GrymSynth codebase
- It provides tools for developers to accelerate development
- It enhances code quality and maintainability
- It will be used for ongoing development and maintenance

## Implementation Approach

1. Define Claude Code workflows
2. Create templates for common tasks
3. Implement CI/CD integration
4. Create comprehensive documentation
```

[Previous content continues...]
