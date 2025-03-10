/** Error types that can be simulated in tests */
type ResourceErrorType = 'exhausted' | 'stale' | 'validation';

/** Context object for creating detailed test errors */
interface ErrorContext {
  /** Error code identifier */
  code: string;
  /** Optional additional error details */
  details?: Record<string, unknown>;
}

/**
 * Utilities for creating and validating test errors
 */
export class ErrorTestUtils {
  /**
   * Creates a resource-specific error with predefined message and code
   * @param type - Type of resource error to create
   * @returns Error object with type-specific message and code
   */
  static createResourceError(type: ResourceErrorType): Error {
    const errorConfigs = {
      exhausted: {
        message: 'Resource pool exhausted',
        code: 'POOL_EXHAUSTED'
      },
      stale: {
        message: 'Resource has expired',
        code: 'RESOURCE_STALE'
      },
      validation: {
        message: 'Invalid resource parameters',
        code: 'VALIDATION_ERROR'
      }
    };

    if (!errorConfigs[type]) {
      throw new Error(`Unknown error type: ${type}`);
    }

    const config = errorConfigs[type];
    const error = new Error(config.message);
    (error as any).code = config.code;
    return error;
  }

  /**
   * Creates an error with custom message and context
   * @param message - Custom error message
   * @param context - Error context including code and optional details
   * @returns Error object with context attached
   */
  static createErrorWithContext(message: string, context: ErrorContext): Error {
    const error = new Error(message);
    (error as any).code = context.code;
    
    if (context.details) {
      (error as any).details = context.details;
    }
    
    return error;
  }

  /**
   * Verifies that an error has the expected error code
   * @param error - Error to verify
   * @param expectedCode - Expected error code
   * @throws Error if codes don't match
   */
  static verifyErrorCode(error: Error, expectedCode: string): void {
    if (!error) {
      throw new Error('Error object must be provided');
    }
    
    const actualCode = (error as any).code;
    if (actualCode !== expectedCode) {
      throw new Error(`Expected error code ${expectedCode}, but got ${actualCode}`);
    }
  }
}