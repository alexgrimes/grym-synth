import { McpError } from '../types/errors';

/**
 * Error from resource pool operations
 */
export class ResourcePoolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ResourcePoolError';
    Object.setPrototypeOf(this, ResourcePoolError.prototype);
  }
}

/**
 * Adapter to convert various error types to MCP errors
 */
export class ErrorAdapter {
  /**
   * Convert any error to an MCP error
   */
  static toMcpError(error: unknown): McpError {
    // Already an MCP error
    if (error instanceof McpError) {
      return error;
    }

    // Resource pool error
    if (error instanceof ResourcePoolError) {
      return this.convertResourcePoolError(error);
    }

    // Standard Error
    if (error instanceof Error) {
      return new McpError(500, error.message);
    }

    // Unknown error type
    return new McpError(500, 'An unexpected error occurred');
  }

  /**
   * Convert resource pool error to MCP error
   */
  private static convertResourcePoolError(error: ResourcePoolError): McpError {
    const statusCode = this.getStatusCode(error.code);
    const message = this.formatErrorMessage(error);
    return new McpError(statusCode, message);
  }

  /**
   * Map resource pool error codes to HTTP status codes
   */
  private static getStatusCode(code: string): number {
    switch (code) {
      case 'RESOURCE_STALE':
        return 404;
      case 'POOL_EXHAUSTED':
        return 503;
      case 'VALIDATION_ERROR':
        return 400;
      default:
        return 500;
    }
  }

  /**
   * Format error message with context
   */
  private static formatErrorMessage(error: ResourcePoolError): string {
    let message = error.message;
    
    if (error.code) {
      message += ` (${error.code})`;
    }

    if (error.context) {
      const details = Object.entries(error.context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      message += ` - ${details}`;
    }

    return message;
  }
}