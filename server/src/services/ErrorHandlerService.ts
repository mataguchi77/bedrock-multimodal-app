// Feature: multimodal-content-viewer
// Error Handler Service with structured error handling and recovery strategies

import { ErrorType, ErrorRecoveryStrategy } from '@/types';

export class ErrorHandlerService {
  private readonly errorStrategies: Record<ErrorType, ErrorRecoveryStrategy> = {
    'AWS_AUTH_ERROR': {
      retryable: false,
      maxRetries: 0,
      backoffStrategy: 'linear',
      fallbackAction: 'display_error',
      userNotification: true
    },
    'NETWORK_TIMEOUT': {
      retryable: true,
      maxRetries: 3,
      backoffStrategy: 'exponential',
      fallbackAction: 'retry_with_fallback',
      userNotification: true
    },
    'CONTENT_PARSE_ERROR': {
      retryable: false,
      maxRetries: 0,
      backoffStrategy: 'linear',
      fallbackAction: 'graceful_degradation',
      userNotification: false
    },
    'VALIDATION_ERROR': {
      retryable: false,
      maxRetries: 0,
      backoffStrategy: 'linear',
      fallbackAction: 'display_error',
      userNotification: true
    },
    'SESSION_ERROR': {
      retryable: true,
      maxRetries: 1,
      backoffStrategy: 'linear',
      fallbackAction: 'retry_with_fallback',
      userNotification: false
    },
    'BEDROCK_SERVICE_ERROR': {
      retryable: true,
      maxRetries: 3,
      backoffStrategy: 'exponential',
      fallbackAction: 'retry_with_fallback',
      userNotification: true
    }
  };

  createError(errorType: ErrorType, message: string, originalError?: Error): Error {
    const strategy = this.errorStrategies[errorType];
    const error = new Error(message);
    
    // Add error metadata
    (error as any).errorType = errorType;
    (error as any).strategy = strategy;
    (error as any).originalError = originalError;
    (error as any).timestamp = new Date();

    // Log error with appropriate level
    this.logError(errorType, message, originalError);

    return error;
  }

  getErrorStrategy(errorType: ErrorType): ErrorRecoveryStrategy {
    return this.errorStrategies[errorType];
  }

  isRetryableError(error: Error): boolean {
    const errorType = (error as any).errorType as ErrorType;
    if (!errorType) return false;
    
    const strategy = this.errorStrategies[errorType];
    return strategy.retryable;
  }

  shouldNotifyUser(error: Error): boolean {
    const errorType = (error as any).errorType as ErrorType;
    if (!errorType) return true; // Default to notifying for unknown errors
    
    const strategy = this.errorStrategies[errorType];
    return strategy.userNotification;
  }

  formatUserMessage(error: Error): string {
    const errorType = (error as any).errorType as ErrorType;
    
    switch (errorType) {
      case 'AWS_AUTH_ERROR':
        return 'Authentication failed. Please check your AWS credentials configuration.';
      
      case 'NETWORK_TIMEOUT':
        return 'Network request timed out. Please check your connection and try again.';
      
      case 'CONTENT_PARSE_ERROR':
        return 'Unable to process the response content. The raw response will be displayed instead.';
      
      case 'VALIDATION_ERROR':
        return error.message; // Validation errors are already user-friendly
      
      case 'SESSION_ERROR':
        return 'Session error occurred. A new session will be created automatically.';
      
      case 'BEDROCK_SERVICE_ERROR':
        return 'The AI service is temporarily unavailable. Please try again in a moment.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private logError(errorType: ErrorType, message: string, originalError?: Error): void {
    const logData = {
      errorType,
      message,
      timestamp: new Date().toISOString(),
      originalError: originalError ? {
        message: originalError.message,
        stack: originalError.stack
      } : undefined
    };

    // Log with appropriate level based on error type
    switch (errorType) {
      case 'AWS_AUTH_ERROR':
      case 'BEDROCK_SERVICE_ERROR':
        console.error('CRITICAL ERROR:', JSON.stringify(logData, null, 2));
        break;
      
      case 'NETWORK_TIMEOUT':
      case 'SESSION_ERROR':
        console.warn('WARNING:', JSON.stringify(logData, null, 2));
        break;
      
      case 'CONTENT_PARSE_ERROR':
      case 'VALIDATION_ERROR':
        console.info('INFO:', JSON.stringify(logData, null, 2));
        break;
      
      default:
        console.error('ERROR:', JSON.stringify(logData, null, 2));
    }
  }

  // Create structured error response for API endpoints
  createErrorResponse(error: Error, sessionId?: string) {
    const errorType = (error as any).errorType as ErrorType;
    const userMessage = this.shouldNotifyUser(error) ? this.formatUserMessage(error) : error.message;

    return {
      success: false,
      error: userMessage,
      errorCode: errorType || 'UNKNOWN_ERROR',
      timestamp: new Date(),
      sessionId: sessionId || undefined
    };
  }

  // Handle uncaught exceptions gracefully
  handleUncaughtException(error: Error): void {
    console.error('UNCAUGHT EXCEPTION:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to:
    // 1. Send error to monitoring service
    // 2. Gracefully shutdown the server
    // 3. Restart the process
  }

  // Handle unhandled promise rejections
  handleUnhandledRejection(reason: any, _promise: Promise<any>): void {
    console.error('UNHANDLED PROMISE REJECTION:', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to:
    // 1. Send error to monitoring service
    // 2. Log additional context
  }
}