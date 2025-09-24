/**
 * Application Error Types
 * Provides structured error handling throughout the application
 */

export enum ErrorCodes {
  // Database errors
  DATABASE_INIT_FAILED = 'DATABASE_INIT_FAILED',
  DATABASE_OPERATION_FAILED = 'DATABASE_OPERATION_FAILED',
  DATABASE_CONNECTION_LOST = 'DATABASE_CONNECTION_LOST',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',

  // Network/Firebase errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  FIREBASE_ERROR = 'FIREBASE_ERROR',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCodes,
    public userFriendlyMessage?: string,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Gets a message suitable for showing to users
   */
  getUserMessage(): string {
    return this.userFriendlyMessage || this.message;
  }

  /**
   * Checks if this error can be retried
   */
  isRetryable(): boolean {
    return this.retryable;
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    userFriendlyMessage: string = 'Database operation failed. Please try again.',
    retryable: boolean = true,
    originalError?: Error
  ) {
    super(message, ErrorCodes.DATABASE_OPERATION_FAILED, userFriendlyMessage, retryable, originalError);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
    userFriendlyMessage: string = 'Please check your input and try again.'
  ) {
    super(message, ErrorCodes.VALIDATION_FAILED, userFriendlyMessage, false);
    this.name = 'ValidationError';
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Converts unknown errors to AppError instances
   */
  static fromUnknown(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorCodes.UNKNOWN_ERROR,
        'An unexpected error occurred. Please try again.',
        true,
        error
      );
    }

    const message = context ? `${context}: ${String(error)}` : String(error);
    return new AppError(
      message,
      ErrorCodes.UNKNOWN_ERROR,
      'An unexpected error occurred. Please try again.',
      true
    );
  }

  /**
   * Logs error with appropriate level and context
   */
  static log(error: AppError, context?: string): void {
    const logMessage = context
      ? `[${context}] ${error.message}`
      : error.message;

    if (error.originalError) {
      console.error(logMessage, {
        code: error.code,
        retryable: error.retryable,
        originalError: error.originalError,
        stack: error.stack
      });
    } else {
      console.error(logMessage, {
        code: error.code,
        retryable: error.retryable,
        stack: error.stack
      });
    }
  }

  /**
   * Determines if an error should trigger a retry
   */
  static shouldRetry(error: AppError, attemptCount: number, maxAttempts: number = 3): boolean {
    return error.isRetryable() && attemptCount < maxAttempts;
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: AppError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = ErrorHandler.fromUnknown(error, 'withRetry');

      if (!ErrorHandler.shouldRetry(lastError, attempt, maxAttempts)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      ErrorHandler.log(lastError, `Retry attempt ${attempt}/${maxAttempts}`);
    }
  }

  throw lastError!;
}