import { HealthState, StateTransitionConfig } from './types'
import { getCurrentTime } from '../../../utils/time'

export class StateTransitionValidator {
  private readonly config: StateTransitionConfig
  private readonly stateHistory: HealthState[] = []
  // Made public for testing purposes
  public lastTransitionTime: number = getCurrentTime()
  private transitionsInLastMinute: number = 0
  private lastTransitionCheck: number = getCurrentTime()

  constructor(config: StateTransitionConfig) {
    this.config = config
  }

  canTransition(from: HealthState, to: HealthState): boolean {
    const now = getCurrentTime()

    // No transition if states are the same
    if (from.status === to.status) {
      return false
    }

    // Validate state progression rules
    if (!this.isValidStateProgression(from.status, to.status)) {
      return false
    }

    // Validate timing constraints
    if (!this.isValidTiming(now)) {
      return false
    }

    // Validate recovery conditions
    if (!this.isValidRecovery(from.status, to.status)) {
      return false
    }

    return true
  }

  recordState(state: HealthState): void {
    this.stateHistory.push(state)

    // Trim history if needed
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }
  }

  recordTransition(from: HealthState, to: HealthState): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid transition: ${from.status} -> ${to.status}`)
    }

    this.lastTransitionTime = getCurrentTime()
    this.transitionsInLastMinute++

    // Record the new state
    this.recordState(to)
  }

  private isValidStateProgression(from: string, to: string): boolean {
    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      healthy: ['degraded'],
      degraded: ['healthy', 'unhealthy'],
      unhealthy: ['degraded']
    }

    return validTransitions[from]?.includes(to) ?? false
  }

  private isValidTiming(now: number): boolean {
    // Check minimum duration
    const timeSinceLastTransition = now - this.lastTransitionTime
    if (timeSinceLastTransition < this.config.minStateDuration) {
      return false
    }

    // Reset transition counter if minute has passed
    if (now - this.lastTransitionCheck >= 60000) {
      this.transitionsInLastMinute = 0
      this.lastTransitionCheck = now
    }

    // Check transition rate
    if (this.transitionsInLastMinute >= this.config.maxTransitionsPerMinute) {
      return false
    }

    return true
  }

  private isValidRecovery(from: string, to: string): boolean {
    // Only apply special validation for recovery transitions
    if (!this.isRecoveryTransition(from, to)) {
      return true
    }

    // Get recent states for validation
    const recentStates = this.stateHistory.slice(-this.config.confirmationSamples)

    // Need enough samples to confirm stability
    if (recentStates.length < this.config.confirmationSamples) {
      return false
    }

    // All recent states must be the current state to confirm stability
    if (!recentStates.every((s) => s.status === from)) {
      return false
    }

    // Check sustained duration
    const sustainedDuration =
      recentStates.length > 0 ? getCurrentTime() - recentStates[0].timestamp : 0

    // Require longer confirmation for unhealthy recovery
    const requiredDuration =
      from === 'unhealthy' ? this.config.minStateDuration * 2 : this.config.minStateDuration * 1.5

    return sustainedDuration >= requiredDuration
  }

  private isRecoveryTransition(from: string, to: string): boolean {
    return (from === 'degraded' && to === 'healthy') || (from === 'unhealthy' && to === 'degraded')
  }
}
