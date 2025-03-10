import { NextResponse } from 'next/server';
import { toastService } from './toast-service';

interface ErrorConfig {
  maxRetries: number;
  timeout: number;
  backoffFactor: number;
}

export interface RecoveryStatus {
  isRetrying: boolean;
  attempt: number;
  maxAttempts: number;
  message: string;
  error?: Error;
}

export class ErrorHandler {
  private config: ErrorConfig = {
    maxRetries: 3,
    timeout: 300000, // 5 minutes
    backoffFactor: 1.5
  };

  async withRecovery<T>(
    operation: () => Promise<T>,
    onStatusUpdate?: (status: RecoveryStatus) => void
  ): Promise<T> {
    let attempts = 0;
    let lastError: Error | null = null;

    const updateStatus = (status: RecoveryStatus) => {
      onStatusUpdate?.(status);
      if (status.isRetrying) {
        toastService.loading(status.message);
      } else if (status.error) {
        toastService.error(status.message);
      }
    };

    while (attempts < this.config.maxRetries) {
      try {
        if (attempts > 0) {
          updateStatus({
            isRetrying: true,
            attempt: attempts,
            maxAttempts: this.config.maxRetries,
            message: `Retrying operation (attempt ${attempts}/${this.config.maxRetries})...`
          });
        }
        const result = await operation();
        if (attempts > 0) {
          toastService.success('Operation recovered successfully');
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        attempts++;

        if (this.isRecoverable(error)) {
          await this.handleRecoverableError(error, attempts, updateStatus);
          continue;
        }

        updateStatus({
          isRetrying: false,
          attempt: attempts,
          maxAttempts: this.config.maxRetries,
          message: 'Unrecoverable error occurred',
          error: lastError
        });
        break;
      }
    }

    const finalError = this.createFinalError(lastError, attempts);
    updateStatus({
      isRetrying: false,
      attempt: attempts,
      maxAttempts: this.config.maxRetries,
      message: finalError.message,
      error: finalError
    });
    throw finalError;
  }

  private isRecoverable(error: any): boolean {
    // Network related errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // HTTP errors that might be temporary
    if (error.status === 429 || // Too Many Requests
        error.status === 503 || // Service Unavailable
        error.status === 504) { // Gateway Timeout
      return true;
    }

    // Ollama specific errors
    if (error.message?.includes('MODEL_LOAD') || // Model loading issue
        error.message?.includes('connection') || // Connection issues
        error.message?.includes('timeout')) {    // Timeout issues
      return true;
    }

    return false;
  }

  private async handleRecoverableError(
    error: any,
    attempt: number,
    updateStatus: (status: RecoveryStatus) => void
  ) {
    // Calculate delay with exponential backoff
    const delay = Math.min(
      1000 * Math.pow(this.config.backoffFactor, attempt),
      30000 // Max 30 seconds
    );

    updateStatus({
      isRetrying: true,
      attempt: attempt,
      maxAttempts: this.config.maxRetries,
      message: `Recoverable error occurred. Waiting ${Math.round(delay/1000)}s before retry...`,
      error: error
    });

    console.error('Error details:', error);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private createFinalError(error: Error | null, attempts: number): Error {
    return new Error(
      `Operation failed after ${attempts} attempts. Last error: ${error?.message || 'Unknown error'}`
    );
  }
}

// API error handler for Next.js API routes
export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// Export a default instance
export const errorHandler = new ErrorHandler();