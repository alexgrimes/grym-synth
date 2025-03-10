import { HealthStatusType } from '../types';
import {
  StateManager,
  HealthState,
  StateHistory,
  StateTransition,
  GuardCondition,
} from './types';

export class HealthStateManager implements StateManager {
  private readonly guardConditions: GuardCondition[] = [];
  private readonly transitionRules: Map<HealthStatusType, Set<HealthStatusType>>;
  private readonly stateHistory: StateHistoryImpl;
  private _currentState: HealthState;

  constructor(initialState: HealthState) {
    this._currentState = initialState;
    this.stateHistory = new StateHistoryImpl();
    this.transitionRules = this.initializeTransitionRules();
    this.initializeDefaultGuards();
  }

  get currentState(): HealthState {
    return this._currentState;
  }

  get history(): StateHistory {
    return this.stateHistory;
  }

  public canTransition(from: HealthState, to: HealthState): boolean {
    // Check if transition is allowed by rules
    if (!this.transitionRules.get(from.status)?.has(to.status)) {
      return false;
    }

    // Check all guard conditions
    for (const guard of this.guardConditions) {
      if (!guard.evaluate(from, to)) {
        console.log(`Transition guard failed: ${guard.reason}`);
        return false;
      }
    }

    return true;
  }

  public transition(to: HealthState): void {
    if (!this.canTransition(this._currentState, to)) {
      throw new Error(
        `Invalid state transition from ${this._currentState.status} to ${to.status}`
      );
    }

    const transition: StateTransition = {
      from: this._currentState.status,
      to: to.status,
      timestamp: Date.now(),
      reason: this.getTransitionReason(this._currentState, to),
    };

    this._currentState = { ...to };
    this.stateHistory.addTransition(transition);
    this.stateHistory.addSample(to);
  }

  public addGuardCondition(condition: GuardCondition): void {
    this.guardConditions.push(condition);
  }

  private initializeTransitionRules(): Map<HealthStatusType, Set<HealthStatusType>> {
    const rules = new Map<HealthStatusType, Set<HealthStatusType>>();

    // Healthy state transitions
    rules.set('healthy', new Set(['degraded']));

    // Degraded state transitions
    rules.set('degraded', new Set(['healthy', 'unhealthy']));

    // Unhealthy state transitions
    rules.set('unhealthy', new Set(['degraded']));

    return rules;
  }

  private initializeDefaultGuards(): void {
    // Add minimum state duration guard
    this.addGuardCondition({
      evaluate: (from: HealthState, to: HealthState) => {
        const lastTransition = this.stateHistory.transitions[this.stateHistory.transitions.length - 1];
        if (!lastTransition) return true;

        const minStateDuration = 5000; // 5 seconds minimum
        const timeSinceLastTransition = Date.now() - lastTransition.timestamp;
        return timeSinceLastTransition >= minStateDuration;
      },
      reason: 'Minimum state duration not met',
    });

    // Add transition rate limiting guard
    this.addGuardCondition({
      evaluate: () => {
        const window = 60000; // 1 minute
        const maxTransitions = 10;
        const recentTransitions = this.stateHistory.transitions.filter(
          t => Date.now() - t.timestamp <= window
        );
        return recentTransitions.length < maxTransitions;
      },
      reason: 'Maximum transition rate exceeded',
    });
  }

  private getTransitionReason(from: HealthState, to: HealthState): string {
    const reasons: string[] = [];

    // Check memory indicators
    if (from.indicators.memory.status !== to.indicators.memory.status) {
      reasons.push(`Memory health changed from ${from.indicators.memory.status} to ${to.indicators.memory.status}`);
    }

    // Check performance indicators
    if (from.indicators.performance.status !== to.indicators.performance.status) {
      reasons.push(`Performance health changed from ${from.indicators.performance.status} to ${to.indicators.performance.status}`);
    }

    // Check error indicators
    if (from.indicators.errors.status !== to.indicators.errors.status) {
      reasons.push(`Error health changed from ${from.indicators.errors.status} to ${to.indicators.errors.status}`);
    }

    return reasons.join(', ');
  }
}

class StateHistoryImpl implements StateHistory {
  private readonly _transitions: StateTransition[] = [];
  private readonly _samples: HealthState[] = [];
  private readonly maxHistorySize = 1000;

  get transitions(): StateTransition[] {
    return [...this._transitions];
  }

  get samples(): HealthState[] {
    return [...this._samples];
  }

  public addTransition(transition: StateTransition): void {
    this._transitions.push(transition);
    if (this._transitions.length > this.maxHistorySize) {
      this._transitions.shift();
    }
  }

  public addSample(sample: HealthState): void {
    this._samples.push(sample);
    if (this._samples.length > this.maxHistorySize) {
      this._samples.shift();
    }
  }

  public getRecentSamples(window: number): HealthState[] {
    const cutoff = Date.now() - window;
    return this._samples.filter(sample => sample.timestamp >= cutoff);
  }
}