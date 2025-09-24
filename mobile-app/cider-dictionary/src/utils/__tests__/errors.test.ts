import {
  AppError,
  DatabaseError,
  ValidationError,
  ErrorHandler,
  ErrorCodes,
  withRetry
} from '../errors';

describe('Error Utils', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(
        'Test error',
        ErrorCodes.DATABASE_OPERATION_FAILED,
        'User friendly message',
        true,
        new Error('Original error')
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCodes.DATABASE_OPERATION_FAILED);
      expect(error.getUserMessage()).toBe('User friendly message');
      expect(error.isRetryable()).toBe(true);
      expect(error.originalError).toBeInstanceOf(Error);
    });

    it('should use message as user message when not provided', () => {
      const error = new AppError('Test error', ErrorCodes.VALIDATION_FAILED);
      expect(error.getUserMessage()).toBe('Test error');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with defaults', () => {
      const error = new DatabaseError('DB failed');
      expect(error.code).toBe(ErrorCodes.DATABASE_OPERATION_FAILED);
      expect(error.isRetryable()).toBe(true);
      expect(error.getUserMessage()).toBe('Database operation failed. Please try again.');
    });

    it('should create database error with custom message', () => {
      const error = new DatabaseError('DB failed', 'Custom user message', false);
      expect(error.getUserMessage()).toBe('Custom user message');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field errors', () => {
      const fields = { name: 'Required', email: 'Invalid format' };
      const error = new ValidationError('Validation failed', fields);

      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      expect(error.fields).toEqual(fields);
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('ErrorHandler', () => {
    describe('fromUnknown', () => {
      it('should return AppError as-is', () => {
        const originalError = new AppError('Test', ErrorCodes.VALIDATION_FAILED);
        const result = ErrorHandler.fromUnknown(originalError);
        expect(result).toBe(originalError);
      });

      it('should convert Error to AppError', () => {
        const originalError = new Error('Test error');
        const result = ErrorHandler.fromUnknown(originalError);

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe('Test error');
        expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
        expect(result.isRetryable()).toBe(true);
        expect(result.originalError).toBe(originalError);
      });

      it('should convert string to AppError', () => {
        const result = ErrorHandler.fromUnknown('String error');

        expect(result).toBeInstanceOf(AppError);
        expect(result.message).toBe('String error');
        expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      });

      it('should include context in message', () => {
        const result = ErrorHandler.fromUnknown('Error', 'TestContext');
        expect(result.message).toBe('TestContext: Error');
      });
    });

    describe('shouldRetry', () => {
      it('should return true for retryable errors within attempt limit', () => {
        const error = new AppError('Test', ErrorCodes.NETWORK_ERROR, '', true);
        expect(ErrorHandler.shouldRetry(error, 1, 3)).toBe(true);
        expect(ErrorHandler.shouldRetry(error, 3, 3)).toBe(false);
      });

      it('should return false for non-retryable errors', () => {
        const error = new AppError('Test', ErrorCodes.VALIDATION_FAILED, '', false);
        expect(ErrorHandler.shouldRetry(error, 1, 3)).toBe(false);
      });
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withRetry(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const retryableError = new AppError('Retry me', ErrorCodes.NETWORK_ERROR, '', true);
      const operation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await withRetry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new AppError('Do not retry', ErrorCodes.VALIDATION_FAILED, '', false);
      const operation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(withRetry(operation, 3, 10)).rejects.toBe(nonRetryableError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max attempts', async () => {
      const retryableError = new AppError('Always fail', ErrorCodes.NETWORK_ERROR, '', true);
      const operation = jest.fn().mockRejectedValue(retryableError);

      await expect(withRetry(operation, 2, 10)).rejects.toBe(retryableError);
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});