// Health Status Types
export enum HealthStatusType {
  Healthy = 'healthy',
  Degraded = 'degraded',
  Unhealthy = 'unhealthy'
}

// Interfaces
export interface HealthState {
  status: HealthStatusType
  timestamp: number
  indicators: HealthIndicators
}

export interface HealthIndicator {
  status: HealthStatusType
  score?: number
}

export interface HealthIndicators {
  memory: HealthIndicator
  performance: HealthIndicator
  errors: HealthIndicator
}

// State Management Types
export interface StateTransitionConfig {
  minStateDuration: number
  maxTransitionsPerMinute: number
  confirmationSamples: number
  cooldownPeriod: number
}

export interface TimestampedEntry {
  timestamp: number
}

export interface StateTransition {
  from: HealthStatusType
  to: HealthStatusType
  timestamp: number
  reason: string
}

// History Management
export interface StateHistory {
  transitions: StateTransition[]
  samples: HealthState[]
  getRecentSamples(window: number): HealthState[]
}

// Threshold Management
export interface ThresholdValue {
  warning: number
  critical: number
  recovery: number
}

export interface ThresholdCategory {
  [metric: string]: ThresholdValue
}

export interface ThresholdConfig {
  memory: ThresholdCategory
  performance: ThresholdCategory
  error: ThresholdCategory
  [category: string]: ThresholdCategory
}

export interface ThresholdContext {
  category: string
  operation: string
  systemLoad: number
}
