import { CircuitBreakerConfig, CircuitBreakerState } from './types';

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.state = {
      status: 'closed',
      failureCount: 0
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.state.status === 'open') {
      const now = Date.now();
      if (this.state.lastFailure && 
          now - this.state.lastFailure > this.config.resetTimeoutMs) {
        // Transition to half-open after timeout
        this.state = {
          ...this.state,
          status: 'half-open',
          halfOpenAttempts: 0
        };
        return false;
      }
      return true;
    }

    if (this.state.status === 'half-open') {
      if (this.state.halfOpenAttempts && 
          this.state.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        // Too many attempts in half-open state
        this.state = {
          ...this.state,
          status: 'open',
          lastFailure: Date.now()
        };
        return true;
      }
      // Allow limited attempts in half-open state
      this.state.halfOpenAttempts = (this.state.halfOpenAttempts || 0) + 1;
    }

    return false;
  }

  private onSuccess(): void {
    if (this.state.status === 'half-open') {
      // Reset on successful half-open attempt
      this.state = {
        status: 'closed',
        failureCount: 0,
        lastSuccess: Date.now()
      };
    } else if (this.state.status === 'closed') {
      // Reset failure count on success
      this.state.failureCount = 0;
      this.state.lastSuccess = Date.now();
    }
  }

  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailure = Date.now();

    if (this.state.status === 'half-open' || 
        this.state.failureCount >= this.config.failureThreshold) {
      this.state = {
        status: 'open',
        failureCount: this.state.failureCount,
        lastFailure: Date.now()
      };
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}