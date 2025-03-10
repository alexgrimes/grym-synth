/**
 * Base error class for MCP errors
 */
export class McpError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'McpError';
    Object.setPrototypeOf(this, McpError.prototype);
  }
}

/**
 * Error thrown when a resource request cannot be fulfilled
 */
export class ResourceError extends McpError {
  constructor(
    code: number,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(code, message);
    this.name = 'ResourceError';
    Object.setPrototypeOf(this, ResourceError.prototype);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends McpError {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(400, message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends McpError {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(404, message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when a service is unavailable
 */
export class ServiceUnavailableError extends McpError {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(503, message);
    this.name = 'ServiceUnavailableError';
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}