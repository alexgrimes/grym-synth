/**
 * Base error class for resource management errors
 */
export class ResourceManagementError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ResourceManagementError';
    Object.setPrototypeOf(this, ResourceManagementError.prototype);
  }
}

/**
 * Error thrown by resource pool operations
 */
export class ResourcePoolError extends ResourceManagementError {
  constructor(
    public readonly code: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
    this.name = 'ResourcePoolError';
    Object.setPrototypeOf(this, ResourcePoolError.prototype);
  }
}

/**
 * Error thrown when resource allocation fails
 */
export class ResourceAllocationError extends ResourcePoolError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('ALLOCATION_ERROR', message, context);
    this.name = 'ResourceAllocationError';
    Object.setPrototypeOf(this, ResourceAllocationError.prototype);
  }
}

/**
 * Error thrown when resource pool is exhausted
 */
export class PoolExhaustedError extends ResourcePoolError {
  constructor(message: string = 'No resources available', context?: Record<string, unknown>) {
    super('POOL_EXHAUSTED', message, context);
    this.name = 'PoolExhaustedError';
    Object.setPrototypeOf(this, PoolExhaustedError.prototype);
  }
}

/**
 * Error thrown when resource becomes stale
 */
export class StaleResourceError extends ResourcePoolError {
  constructor(message: string = 'Resource has expired', context?: Record<string, unknown>) {
    super('RESOURCE_STALE', message, context);
    this.name = 'StaleResourceError';
    Object.setPrototypeOf(this, StaleResourceError.prototype);
  }
}

/**
 * Error thrown when resource validation fails
 */
export class ResourceValidationError extends ResourcePoolError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, context);
    this.name = 'ResourceValidationError';
    Object.setPrototypeOf(this, ResourceValidationError.prototype);
  }
}

/**
 * Error thrown during resource cleanup
 */
export class ResourceCleanupError extends ResourcePoolError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CLEANUP_ERROR', message, context);
    this.name = 'ResourceCleanupError';
    Object.setPrototypeOf(this, ResourceCleanupError.prototype);
  }
}