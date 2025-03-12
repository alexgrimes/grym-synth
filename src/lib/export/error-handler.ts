import { EventEmitter } from 'events';

export enum ExportErrorType {
  FILE_SYSTEM = 'FILE_SYSTEM',
  ENCODING = 'ENCODING',
  MEMORY = 'MEMORY',
  VALIDATION = 'VALIDATION',
  RESOURCE = 'RESOURCE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface ExportError {
  type: ExportErrorType;
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  retryCount: number;
  timestamp: number;
}

interface CleanupTask {
  id: string;
  execute: () => Promise<void>;
  priority: number;
}

export class ExportErrorHandler extends EventEmitter {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // milliseconds

  private cleanupTasks: CleanupTask[] = [];
  private currentError: ExportError | null = null;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.registerDefaultCleanupTasks();
  }

  private registerDefaultCleanupTasks(): void {
    this.registerCleanupTask({
      id: 'temp-files',
      execute: async () => {
        // Cleanup temporary files
        try {
          // Implementation would go here
          this.emit('cleanup-progress', 'Removing temporary files');
        } catch (error) {
          console.error('Failed to cleanup temporary files:', error);
        }
      },
      priority: 1
    });

    this.registerCleanupTask({
      id: 'resource-release',
      execute: async () => {
        // Release system resources
        try {
          // Implementation would go here
          this.emit('cleanup-progress', 'Releasing system resources');
        } catch (error) {
          console.error('Failed to release resources:', error);
        }
      },
      priority: 0
    });
  }

  public handleError(error: Error, type: ExportErrorType = ExportErrorType.UNKNOWN): ExportError {
    const exportError: ExportError = this.createExportError(error, type);
    this.currentError = exportError;

    // Emit error event with recovery suggestion
    this.emit('error', {
      ...exportError,
      suggestion: this.getRecoverySuggestion(exportError)
    });

    // Attempt recovery for recoverable errors
    if (exportError.recoverable && exportError.retryCount < ExportErrorHandler.MAX_RETRIES) {
      this.scheduleRetry();
    } else {
      this.performCleanup();
    }

    return exportError;
  }

  private createExportError(error: Error, type: ExportErrorType): ExportError {
    const errorCode = this.generateErrorCode(type, error);

    return {
      type,
      code: errorCode,
      message: this.getDetailedMessage(error, type),
      details: error.stack,
      recoverable: this.isRecoverable(type, error),
      retryCount: 0,
      timestamp: Date.now()
    };
  }

  private generateErrorCode(type: ExportErrorType, error: Error): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 5);
    return `${type}_${timestamp}_${randomPart}`;
  }

  private getDetailedMessage(error: Error, type: ExportErrorType): string {
    const baseMessage = error.message;

    switch (type) {
      case ExportErrorType.FILE_SYSTEM:
        return `File system error: ${baseMessage}. Please ensure you have sufficient permissions and disk space.`;
      case ExportErrorType.ENCODING:
        return `Audio encoding error: ${baseMessage}. Please verify the export settings are compatible with your system.`;
      case ExportErrorType.MEMORY:
        return `Memory allocation error: ${baseMessage}. Try closing other applications or reducing the project size.`;
      case ExportErrorType.VALIDATION:
        return `Validation error: ${baseMessage}. Please check your export settings and file paths.`;
      case ExportErrorType.RESOURCE:
        return `Resource error: ${baseMessage}. Please ensure all required resources are available.`;
      case ExportErrorType.TIMEOUT:
        return `Operation timed out: ${baseMessage}. This might be due to system load or resource constraints.`;
      default:
        return `An unexpected error occurred: ${baseMessage}`;
    }
  }

  private isRecoverable(type: ExportErrorType, error: Error): boolean {
    switch (type) {
      case ExportErrorType.FILE_SYSTEM:
        return !error.message.includes('permission denied');
      case ExportErrorType.ENCODING:
        return true;
      case ExportErrorType.MEMORY:
        return true;
      case ExportErrorType.VALIDATION:
        return false;
      case ExportErrorType.RESOURCE:
        return true;
      case ExportErrorType.TIMEOUT:
        return true;
      default:
        return false;
    }
  }

  private getRecoverySuggestion(error: ExportError): string {
    switch (error.type) {
      case ExportErrorType.FILE_SYSTEM:
        return 'Try saving to a different location or running the application with elevated privileges.';
      case ExportErrorType.ENCODING:
        return 'Consider using a different export format or reducing the quality settings.';
      case ExportErrorType.MEMORY:
        return 'Try closing other applications, reducing the project size, or increasing virtual memory.';
      case ExportErrorType.VALIDATION:
        return 'Review your export settings and ensure all paths are valid.';
      case ExportErrorType.RESOURCE:
        return 'Verify that all required external resources are accessible and try again.';
      case ExportErrorType.TIMEOUT:
        return 'Try again when system resources are less constrained or reduce the export quality.';
      default:
        return 'Try restarting the application or contact support if the problem persists.';
    }
  }

  private scheduleRetry(): void {
    if (!this.currentError || this.retryTimeoutId) {
      return;
    }

    this.retryTimeoutId = setTimeout(() => {
      if (this.currentError) {
        this.currentError.retryCount++;
        this.emit('retry', {
          error: this.currentError,
          attempt: this.currentError.retryCount
        });
      }
      this.retryTimeoutId = null;
    }, ExportErrorHandler.RETRY_DELAY);
  }

  public registerCleanupTask(task: CleanupTask): void {
    this.cleanupTasks.push(task);
    // Sort tasks by priority (higher numbers = higher priority)
    this.cleanupTasks.sort((a, b) => b.priority - a.priority);
  }

  public async performCleanup(): Promise<void> {
    this.emit('cleanup-start');

    for (const task of this.cleanupTasks) {
      try {
        await task.execute();
      } catch (error) {
        console.error(`Cleanup task ${task.id} failed:`, error);
      }
    }

    this.emit('cleanup-complete');
  }

  public cancelRetry(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    this.currentError = null;
  }

  public getCurrentError(): ExportError | null {
    return this.currentError;
  }

  public reset(): void {
    this.cancelRetry();
    this.currentError = null;
    this.emit('reset');
  }
}
