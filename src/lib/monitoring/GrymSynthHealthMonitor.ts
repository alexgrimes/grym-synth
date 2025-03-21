import { HealthMonitor } from './HealthMonitor'
import { MetricData } from './HealthMonitor'
import {
  HealthState,
  HealthStatusType,
  StateTransitionConfig,
  ThresholdConfig,
  ThresholdContext
} from '../feature-memory/core/health/types'
import { StateHistoryManager } from '../feature-memory/core/health/StateHistoryManager'
import { StateTransitionValidator } from '../feature-memory/core/health/StateTransitionValidator'
import { ThresholdManager } from '../feature-memory/core/health/ThresholdManager'
import { getCurrentTime } from '../utils/time'

// Define MetricValidationResult interface
interface MetricValidationResult {
  isValid: boolean
  violations: string[]
  recommendations: string[]
  score: number
}

// Audio-specific metrics
interface AudioProcessingMetrics {
  bufferUnderruns: number
  averageProcessingTime: number
  peakProcessingTime: number
  audioLatency: number
  sampleRate: number
  bufferSize: number
}

// LLM operation metrics
interface LLMOperationMetrics {
  promptTokenCount: number
  responseTokenCount: number
  averageResponseTime: number
  tokensPerSecond: number
  cacheHitRate: number
  completionRate: number
}

// Extended GrymSynth metrics
interface GrymSynthMetrics extends MetricData {
  audio?: AudioProcessingMetrics
  llm?: LLMOperationMetrics
  windowCount?: number
  activeVisualizations?: number
}

// Quality settings types
type VisualizationComplexity = 'low' | 'medium' | 'high'
type AudioEffectLevel = 'minimal' | 'standard' | 'full'

interface QualitySettings {
  visualization: {
    particleCount: number
    frameRate: number
    complexity: VisualizationComplexity
  }
  audio: {
    bufferSize: number
    channels: number
    effects: AudioEffectLevel
  }
  llm: {
    contextWindow: number
    responseChunkSize: number
  }
}

// TimestampedHealthState for history tracking
interface TimestampedHealthState extends HealthState {
  timestamp: number
}

// Default thresholds
const DEFAULT_THRESHOLDS: ThresholdConfig = {
  memory: {
    heapUsage: {
      warning: 0.7,
      critical: 0.85,
      recovery: 0.65
    },
    cacheUtilization: {
      warning: 0.75,
      critical: 0.9,
      recovery: 0.7
    }
  },
  performance: {
    latency: {
      warning: 20,
      critical: 35,
      recovery: 15
    },
    throughput: {
      warning: 55,
      critical: 30,
      recovery: 60
    }
  },
  error: {
    errorRate: {
      warning: 0.03,
      critical: 0.08,
      recovery: 0.02
    }
  }
}

// Default state transition configuration
const DEFAULT_TRANSITION_CONFIG: StateTransitionConfig = {
  minStateDuration: 500,
  maxTransitionsPerMinute: 10,
  confirmationSamples: 3,
  cooldownPeriod: 200
}

export class GrymSynthHealthMonitor extends HealthMonitor {
  private audioMetrics: AudioProcessingMetrics = {
    bufferUnderruns: 0,
    averageProcessingTime: 0,
    peakProcessingTime: 0,
    audioLatency: 0,
    sampleRate: 44100,
    bufferSize: 1024
  }

  private llmMetrics: LLMOperationMetrics = {
    promptTokenCount: 0,
    responseTokenCount: 0,
    averageResponseTime: 0,
    tokensPerSecond: 0,
    cacheHitRate: 0,
    completionRate: 0
  }

  private windowMetrics = {
    windowCount: 0,
    activeVisualizations: 0
  }

  private audioLatencies: number[] = []
  private llmResponseTimes: number[] = []
  private readonly historyLimit = 100

  // State management components
  private stateHistoryManager: StateHistoryManager<TimestampedHealthState>
  private stateTransitionValidator: StateTransitionValidator
  private thresholdManager: ThresholdManager
  private currentState: HealthState
  private stateHistory: HealthState[] = []
  private lastTransitionTime: number = getCurrentTime()
  private transitionsInLastMinute: number = 0

  constructor(
    transitionConfig: StateTransitionConfig = DEFAULT_TRANSITION_CONFIG,
    historyLimit: number = 100
  ) {
    super()

    // Initialize components
    this.stateHistoryManager = new StateHistoryManager<TimestampedHealthState>(historyLimit)
    this.stateTransitionValidator = new StateTransitionValidator(transitionConfig)
    this.thresholdManager = new ThresholdManager(DEFAULT_THRESHOLDS, this.stateHistoryManager)

    // Initialize current state
    this.currentState = {
      status: HealthStatusType.Healthy,
      timestamp: getCurrentTime(),
      indicators: {
        memory: { status: HealthStatusType.Healthy },
        performance: { status: HealthStatusType.Healthy },
        errors: { status: HealthStatusType.Healthy }
      }
    }

    // Add initial state to history
    this.addStateToHistory(this.currentState)
    this.stateHistoryManager.addEntry({
      ...this.currentState,
      timestamp: getCurrentTime()
    })

    // Register audio health metric
    this.registerMetric({
      name: 'audio.health',
      threshold: 0.8,
      evaluator: (data: MetricData) => {
        const metrics = data as GrymSynthMetrics
        if (!metrics.audio) return true
        const audioHealth = this.evaluateAudioHealth(metrics.audio)
        return audioHealth.score >= 0.8
      }
    })

    // Register LLM health metric
    this.registerMetric({
      name: 'llm.health',
      threshold: 0.8,
      evaluator: (data: MetricData) => {
        const metrics = data as GrymSynthMetrics
        if (!metrics.llm) return true
        const llmHealth = this.evaluateLLMHealth(metrics.llm)
        return llmHealth.score >= 0.8
      }
    })
  }

  /**
   * Add a state to the internal history
   */
  private addStateToHistory(state: HealthState): void {
    this.stateHistory.push(state)

    // Trim history if needed
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }
  }

  /**
   * Check if a transition is valid
   */
  private canTransitionStates(from: HealthState, to: HealthState): boolean {
    // Use the validator if available, otherwise use a simple check
    if (this.stateTransitionValidator) {
      return this.stateTransitionValidator.canTransition(from, to)
    }

    // Simple validation if validator is not available
    // No transition if states are the same
    if (from.status === to.status) {
      return false
    }

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      [HealthStatusType.Healthy]: [HealthStatusType.Degraded],
      [HealthStatusType.Degraded]: [HealthStatusType.Healthy, HealthStatusType.Unhealthy],
      [HealthStatusType.Unhealthy]: [HealthStatusType.Degraded]
    }

    return validTransitions[from.status]?.includes(to.status) ?? false
  }

  /**
   * Record a transition between states
   */
  private recordStateTransition(from: HealthState, to: HealthState): void {
    if (!this.canTransitionStates(from, to)) {
      throw new Error(`Invalid transition: ${from.status} -> ${to.status}`)
    }

    this.lastTransitionTime = getCurrentTime()
    this.transitionsInLastMinute++

    // Record the new state
    this.addStateToHistory(to)
  }

  public recordAudioProcessing(
    processingTime: number,
    bufferSize: number,
    sampleRate: number
  ): void {
    this.audioLatencies.push(processingTime)
    if (this.audioLatencies.length > this.historyLimit) {
      this.audioLatencies.shift()
    }

    this.audioMetrics.averageProcessingTime = this.calculateAverage(this.audioLatencies)
    this.audioMetrics.peakProcessingTime = Math.max(...this.audioLatencies)
    this.audioMetrics.bufferSize = bufferSize
    this.audioMetrics.sampleRate = sampleRate
    this.audioMetrics.audioLatency = (bufferSize / sampleRate) * 1000

    this.recordMetric('audio.processing', {
      processingTime,
      bufferSize,
      sampleRate,
      audioLatency: this.audioMetrics.audioLatency
    })

    // Re-evaluate health state after recording new metrics
    this.evaluateHealthState()
  }

  public recordBufferUnderrun(): void {
    this.audioMetrics.bufferUnderruns++
    this.recordMetric('audio.underrun', {
      count: this.audioMetrics.bufferUnderruns,
      timestamp: getCurrentTime()
    })

    // Re-evaluate health state after recording underrun
    this.evaluateHealthState()
  }

  public recordLLMOperation(
    promptTokens: number,
    responseTokens: number,
    responseTime: number,
    fromCache = false
  ): void {
    this.llmMetrics.promptTokenCount += promptTokens
    this.llmMetrics.responseTokenCount += responseTokens

    if (!fromCache) {
      this.llmResponseTimes.push(responseTime)
      if (this.llmResponseTimes.length > this.historyLimit) {
        this.llmResponseTimes.shift()
      }
    }

    this.llmMetrics.averageResponseTime = this.calculateAverage(this.llmResponseTimes)
    this.llmMetrics.tokensPerSecond = responseTokens / (responseTime / 1000)

    this.recordMetric('llm.operation', {
      promptTokens,
      responseTokens,
      responseTime,
      fromCache,
      tokensPerSecond: this.llmMetrics.tokensPerSecond
    })

    // Re-evaluate health state after recording new metrics
    this.evaluateHealthState()
  }

  public updateWindowMetrics(windowCount: number, visualizationCount: number): void {
    this.windowMetrics.windowCount = windowCount
    this.windowMetrics.activeVisualizations = visualizationCount

    this.recordMetric('ui.windows', {
      windowCount,
      visualizationCount,
      timestamp: getCurrentTime()
    })

    // Evaluate health with updated window metrics
    this.evaluateHealthState()
  }

  /**
   * Get adaptive quality settings based on current health state
   * Uses ThresholdManager for dynamic threshold adjustment
   */
  public getAdaptiveQualitySettings(): QualitySettings {
    const health = this.getHealthStatus()
    const isHealthy = health.healthy

    // Default settings for medium quality
    const settings: QualitySettings = {
      visualization: {
        particleCount: 500,
        frameRate: 30,
        complexity: 'medium'
      },
      audio: {
        bufferSize: 1024,
        channels: 2,
        effects: 'standard'
      },
      llm: {
        contextWindow: 8000,
        responseChunkSize: 500
      }
    }

    // Get context-specific thresholds for current system load
    const context: ThresholdContext = {
      category: 'system',
      operation: 'quality',
      systemLoad: this.calculateSystemLoad()
    }

    const thresholds = this.thresholdManager.getThresholds(context)

    // Check if we have enough history to analyze trends
    const memoryTrend = this.stateHistoryManager.analyzeTrend('indicators.memory.score')
    const performanceTrend = this.stateHistoryManager.analyzeTrend('indicators.performance.score')

    if (isHealthy) {
      // Healthy state - use high quality settings
      settings.visualization = {
        particleCount: 1000,
        frameRate: 60,
        complexity: 'high'
      }
      settings.audio = {
        bufferSize: 512,
        channels: 2,
        effects: 'full'
      }
      settings.llm = {
        contextWindow: 16000,
        responseChunkSize: 1000
      }

      // But be more conservative if we detect negative trends
      if (
        memoryTrend.direction === 'decreasing' &&
        memoryTrend.magnitude > thresholds.memory.heapUsage.warning
      ) {
        settings.visualization.particleCount = 750
        settings.llm.contextWindow = 12000
      }
    } else {
      // Not healthy - check specific metrics for targeted adjustments
      const metrics = this.getMetrics('audio.processing')
      if (
        metrics.length > 0 &&
        metrics[metrics.length - 1].processingTime > thresholds.performance.latency.warning
      ) {
        settings.audio.bufferSize = 2048
        settings.audio.effects = 'minimal'
      }

      const llmMetrics = this.getMetrics('llm.operation')
      if (llmMetrics.length > 0 && llmMetrics[llmMetrics.length - 1].responseTime > 2000) {
        settings.llm.contextWindow = 4000
        settings.llm.responseChunkSize = 250
      }

      // Additional adjustments based on trends
      if (
        performanceTrend.direction === 'decreasing' &&
        performanceTrend.magnitude > thresholds.performance.throughput.warning
      ) {
        // Significant performance degradation, apply more aggressive measures
        settings.visualization.complexity = 'low'
        settings.visualization.frameRate = 20
        settings.visualization.particleCount = 250
      }
    }

    // Learn from successful operations to optimize thresholds
    if (isHealthy) {
      const metrics: Record<string, number> = {
        'performance.latency': this.audioMetrics.averageProcessingTime,
        'memory.heapUsage': this.windowMetrics.activeVisualizations / 10 // Simplified metric
      }
      this.thresholdManager.learnFromOperation(context, metrics)
    }

    return settings
  }

  /**
   * Get historical health states
   */
  public getHealthHistory(limit: number = 10): TimestampedHealthState[] {
    return this.stateHistoryManager.getLast(limit)
  }

  /**
   * Get health state transitions in the last time window
   */
  public getHealthStateTransitions(windowMs: number = 3600000): TimestampedHealthState[] {
    return this.stateHistoryManager.getRecentWindow(windowMs)
  }

  /**
   * Analyze trends for a specific health metric
   */
  public analyzeMetricTrend(
    metricPath: string,
    shortWindowMs: number = 60000,
    longWindowMs: number = 300000
  ) {
    return this.stateHistoryManager.analyzeTrend(metricPath, shortWindowMs, longWindowMs)
  }

  /**
   * Get current state with detailed indicators
   */
  public getCurrentHealthState(): HealthState {
    return this.currentState
  }

  /**
   * Force a re-evaluation of the current health state
   */
  public evaluateHealthState(): void {
    // Create a new health state based on current metrics
    const newState = this.determineHealthState()

    // Check if the state transition is valid
    if (
      newState.status !== this.currentState.status &&
      this.canTransitionStates(this.currentState, newState)
    ) {
      // Record the transition
      try {
        this.recordStateTransition(this.currentState, newState)

        // Update current state
        this.currentState = newState

        // Add to history with timestamp
        this.stateHistoryManager.addEntry({
          ...newState,
          timestamp: getCurrentTime()
        })

        // Log state change
        console.log(
          `[GrymSynthHealthMonitor] Health state changed: ${this.currentState.status} -> ${newState.status}`
        )
      } catch (error) {
        console.error('[GrymSynthHealthMonitor] Error recording state transition:', error)
        // Still add to history for analysis, but don't change current state
        this.stateHistoryManager.addEntry({
          ...newState,
          timestamp: getCurrentTime()
        })
      }
    } else if (newState.status === this.currentState.status) {
      // State hasn't changed, but still record for history
      this.stateHistoryManager.addEntry({
        ...newState,
        timestamp: getCurrentTime()
      })

      // Update indicators even if overall state hasn't changed
      this.currentState = {
        ...this.currentState,
        indicators: newState.indicators
      }
    }
  }

  /**
   * Internal method to determine the current health state based on metrics
   * Now uses ThresholdManager for dynamic thresholds
   */
  private determineHealthState(): HealthState {
    // Get current metrics for evaluation
    const audioHealth = this.evaluateAudioHealth(this.audioMetrics)
    const llmHealth = this.evaluateLLMHealth(this.llmMetrics)

    // Get context-specific thresholds
    const context: ThresholdContext = {
      category: 'system',
      operation: 'health',
      systemLoad: this.calculateSystemLoad()
    }

    const thresholds = this.thresholdManager.getThresholds(context)

    // Create health indicators
    const indicators = {
      memory: {
        status: this.determineStatusFromScore(
          audioHealth.score * 0.3 + llmHealth.score * 0.7,
          thresholds.memory.heapUsage
        ),
        score: audioHealth.score * 0.3 + llmHealth.score * 0.7
      },
      performance: {
        status: this.determineStatusFromScore(
          audioHealth.score * 0.6 + llmHealth.score * 0.4,
          thresholds.performance.latency
        ),
        score: audioHealth.score * 0.6 + llmHealth.score * 0.4
      },
      errors: {
        status: this.determineStatusFromScore(
          audioHealth.score * 0.5 + llmHealth.score * 0.5,
          thresholds.error.errorRate
        ),
        score: audioHealth.score * 0.5 + llmHealth.score * 0.5
      }
    }

    // Determine overall status from indicators
    let overallStatus: HealthStatusType

    // If any indicator is unhealthy, the system is unhealthy
    if (
      indicators.memory.status === HealthStatusType.Unhealthy ||
      indicators.performance.status === HealthStatusType.Unhealthy ||
      indicators.errors.status === HealthStatusType.Unhealthy
    ) {
      overallStatus = HealthStatusType.Unhealthy
    }
    // If any indicator is degraded, the system is degraded
    else if (
      indicators.memory.status === HealthStatusType.Degraded ||
      indicators.performance.status === HealthStatusType.Degraded ||
      indicators.errors.status === HealthStatusType.Degraded
    ) {
      overallStatus = HealthStatusType.Degraded
    }
    // Otherwise, the system is healthy
    else {
      overallStatus = HealthStatusType.Healthy
    }

    // Integrate trend analysis into the decision
    const memoryTrend = this.stateHistoryManager.analyzeTrend('indicators.memory.score')
    const performanceTrend = this.stateHistoryManager.analyzeTrend('indicators.performance.score')

    // If we're currently healthy but trending downward significantly, preemptively degrade
    if (
      overallStatus === HealthStatusType.Healthy &&
      ((memoryTrend.direction === 'decreasing' &&
        memoryTrend.magnitude > thresholds.memory.heapUsage.warning * 20) ||
        (performanceTrend.direction === 'decreasing' &&
          performanceTrend.magnitude > thresholds.performance.latency.warning * 0.5))
    ) {
      overallStatus = HealthStatusType.Degraded
    }

    // If we're degraded but trending upward, consider recovery
    if (
      overallStatus === HealthStatusType.Degraded &&
      memoryTrend.direction === 'increasing' &&
      performanceTrend.direction === 'increasing' &&
      indicators.memory.score > thresholds.memory.heapUsage.recovery * 1.2 &&
      indicators.performance.score > thresholds.performance.latency.recovery * 0.05
    ) {
      overallStatus = HealthStatusType.Healthy
    }

    return {
      status: overallStatus,
      timestamp: getCurrentTime(),
      indicators
    }
  }

  /**
   * Helper to determine status from a score using dynamic thresholds
   */
  private determineStatusFromScore(
    score: number,
    thresholds: { warning: number; critical: number; recovery: number }
  ): HealthStatusType {
    if (score >= thresholds.warning) return HealthStatusType.Healthy
    if (score >= thresholds.critical) return HealthStatusType.Degraded
    return HealthStatusType.Unhealthy
  }

  /**
   * Calculate current system load based on metrics
   */
  private calculateSystemLoad(): number {
    // Simple load calculation based on audio processing time and visualization count
    const audioLoad =
      this.audioMetrics.averageProcessingTime /
      ((this.audioMetrics.bufferSize / this.audioMetrics.sampleRate) * 1000)
    const visualizationLoad = this.windowMetrics.activeVisualizations / 10 // Assuming 10 is max

    // Combine loads with weights
    return Math.min(1, Math.max(0, audioLoad * 0.6 + visualizationLoad * 0.4))
  }

  private evaluateAudioHealth(metrics: AudioProcessingMetrics): MetricValidationResult {
    const violations: string[] = []
    const recommendations: string[] = []
    let score = 1.0

    // Get dynamic thresholds for audio context
    const context: ThresholdContext = {
      category: 'audio',
      operation: 'processing',
      systemLoad: this.calculateSystemLoad()
    }

    const thresholds = this.thresholdManager.getThresholds(context)

    if (metrics.bufferUnderruns > 0) {
      score *= 0.8
      violations.push(`${metrics.bufferUnderruns} buffer underruns detected`)
      recommendations.push(
        'Consider increasing buffer size',
        'Review audio processing chain complexity'
      )
    }

    const bufferDuration = (metrics.bufferSize / metrics.sampleRate) * 1000
    if (
      metrics.averageProcessingTime >
      (bufferDuration * thresholds.performance.latency.warning) / 20
    ) {
      score *= 0.7
      violations.push('Processing time approaching buffer duration')
      recommendations.push('Optimize audio processing chain', 'Consider increasing buffer size')
    }

    if (metrics.audioLatency > thresholds.performance.latency.warning * 1.5) {
      score *= 0.9
      violations.push('High audio latency detected')
      recommendations.push('Review buffer size configuration', 'Check for processing bottlenecks')
    }

    // Consider trends in audio processing time
    const audioProcessingTrend = this.stateHistoryManager.analyzeTrend(
      'indicators.performance.score',
      30000, // 30 seconds
      120000 // 2 minutes
    )

    if (audioProcessingTrend.direction === 'decreasing' && audioProcessingTrend.magnitude > 10) {
      // Audio processing time is increasing significantly
      score *= 0.95
      violations.push('Audio processing time trending upward')
      recommendations.push('Monitor for potential audio processing chain issues')
    }

    return {
      isValid: score >= thresholds.performance.throughput.warning / 100,
      violations,
      recommendations,
      score
    }
  }

  private evaluateLLMHealth(metrics: LLMOperationMetrics): MetricValidationResult {
    const violations: string[] = []
    const recommendations: string[] = []
    let score = 1.0

    // Get dynamic thresholds for LLM context
    const context: ThresholdContext = {
      category: 'llm',
      operation: 'inference',
      systemLoad: this.calculateSystemLoad()
    }

    const thresholds = this.thresholdManager.getThresholds(context)

    if (metrics.averageResponseTime > thresholds.performance.latency.warning * 100) {
      score *= 0.7
      violations.push('High LLM response times')
      recommendations.push('Consider reducing prompt complexity', 'Review context window size')
    }

    if (metrics.cacheHitRate < thresholds.memory.cacheUtilization.warning / 2) {
      score *= 0.9
      violations.push('Low cache hit rate')
      recommendations.push('Review caching strategy', 'Identify common patterns for pre-caching')
    }

    if (metrics.tokensPerSecond < thresholds.performance.throughput.warning / 5) {
      score *= 0.8
      violations.push('Low token processing rate')
      recommendations.push('Consider batching requests', 'Optimize prompt structure')
    }

    // Consider recent trends
    const llmTrend = this.stateHistoryManager.analyzeTrend('indicators.memory.score')
    if (
      llmTrend.direction === 'decreasing' &&
      llmTrend.magnitude > thresholds.memory.heapUsage.warning * 20
    ) {
      score *= 0.9
      violations.push('LLM performance trending downward')
      recommendations.push('Review recent model operations', 'Consider memory optimization')
    }

    return {
      isValid: score >= thresholds.performance.throughput.warning / 100,
      violations,
      recommendations,
      score
    }
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }
}
