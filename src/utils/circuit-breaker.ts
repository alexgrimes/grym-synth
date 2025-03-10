export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  maxRetries: number;
  backoff: number;
}

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  state: CircuitState;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number = 0;
  private operations: Set<Promise<any>> = new Set();
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeout,
      maxRetries: config.maxRetries,
      backoff: config.backoff,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.checkState();

    try {
      let retryCount = 0;
      while (true) {
        try {
          const operationPromise = operation();
          this.operations.add(operationPromise);

          const result = await operationPromise;

          this.operations.delete(operationPromise);
          this.recordSuccess();
          return result;
        } catch (error) {
          retryCount++;
          if (retryCount >= this.config.maxRetries) {
            throw error;
          }
          // Wait for backoff period before retrying
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              this.config.backoff * Math.pow(2, retryCount - 1)
            )
          );
        }
      }
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  getStats(): CircuitStats {
    return {
      failures: this.failureCount,
      successes: this.successCount,
      lastFailure: this.lastFailureTime,
      lastSuccess: this.lastSuccessTime,
      state: this.state,
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  private async checkState(): Promise<void> {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.state = CircuitState.HALF_OPEN;
        } else {
          throw new Error("Circuit breaker is OPEN");
        }
        break;

      case CircuitState.HALF_OPEN:
        // In HALF_OPEN state, we allow one request through to test the service
        break;

      case CircuitState.CLOSED:
        // Normal operation
        break;
    }
  }

  private recordSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    this.failureCount = 0; // Reset failure count on success

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.failureCount >= this.config.failureThreshold ||
      this.state === CircuitState.HALF_OPEN
    ) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }
  }

  async dispose(): Promise<void> {
    // Wait for all ongoing operations to complete
    await Promise.all(Array.from(this.operations));
    this.operations.clear();
    this.reset();
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = 0;
  }
}
