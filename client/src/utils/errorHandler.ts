// Feature: multimodal-content-viewer
// Global error handler for API calls and application errors

export interface ErrorDetails {
  message: string;
  code?: string;
  statusCode?: number;
  timestamp: string;
  context?: Record<string, any>;
}

export interface ErrorHandlerOptions {
  logToConsole?: boolean;
  reportToService?: boolean;
}

class GlobalErrorHandler {
  private errorListeners: Array<(error: ErrorDetails) => void> = [];

  // Add error listener
  addErrorListener(listener: (error: ErrorDetails) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Handle API errors
  handleApiError(
    error: any, 
    context?: Record<string, any>,
    options: ErrorHandlerOptions = {}
  ): ErrorDetails {
    const {
      logToConsole = true,
      reportToService = false
    } = options;

    let errorDetails: ErrorDetails;

    if (error instanceof Response) {
      // HTTP Response error
      errorDetails = {
        message: this.getHttpErrorMessage(error.status),
        code: 'HTTP_ERROR',
        statusCode: error.status,
        timestamp: new Date().toISOString(),
        context: {
          url: error.url,
          statusText: error.statusText,
          ...(context || {})
        }
      };
    } else if (error instanceof Error) {
      // JavaScript Error
      errorDetails = {
        message: this.getUserFriendlyMessage(error.message),
        code: error.name || 'JAVASCRIPT_ERROR',
        timestamp: new Date().toISOString(),
        context: {
          originalMessage: error.message,
          stack: error.stack,
          ...(context || {})
        }
      };
    } else if (typeof error === 'string') {
      // String error
      errorDetails = {
        message: this.getUserFriendlyMessage(error),
        code: 'STRING_ERROR',
        timestamp: new Date().toISOString(),
        context: context || {}
      };
    } else {
      // Unknown error type
      errorDetails = {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        context: {
          errorType: typeof error,
          errorValue: error,
          ...(context || {})
        }
      };
    }

    // Log to console if enabled
    if (logToConsole) {
      console.error('Global Error Handler:', errorDetails);
    }

    // Report to service if enabled
    if (reportToService) {
      this.reportError(errorDetails);
    }

    // Notify listeners
    this.notifyListeners(errorDetails);

    return errorDetails;
  }

  // Handle network errors specifically
  handleNetworkError(
    error: any,
    context?: Record<string, any>
  ): ErrorDetails {
    const networkContext = {
      ...(context || {}),
      networkStatus: navigator.onLine ? 'online' : 'offline',
      userAgent: navigator.userAgent
    };

    return this.handleApiError(error, networkContext, {
      logToConsole: true,
      reportToService: true
    });
  }

  // Handle validation errors
  handleValidationError(
    message: string,
    field?: string,
    value?: any
  ): ErrorDetails {
    return this.handleApiError(
      new Error(message),
      {
        errorType: 'VALIDATION_ERROR',
        field,
        value
      },
      {
        logToConsole: false,
        reportToService: false
      }
    );
  }

  // Get user-friendly HTTP error messages
  private getHttpErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please refresh the page.';
      case 403:
        return 'Access denied. You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timeout. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Request timeout. Please try again.';
      default:
        return `An error occurred (${statusCode}). Please try again.`;
    }
  }

  // Convert technical error messages to user-friendly ones
  private getUserFriendlyMessage(message: string): string {
    // Common error patterns and their user-friendly alternatives
    const errorMappings: Record<string, string> = {
      'fetch failed': 'Network connection failed. Please check your internet connection.',
      'NetworkError': 'Network error. Please check your connection and try again.',
      'TypeError: Failed to fetch': 'Unable to connect to the server. Please try again.',
      'AbortError': 'Request was cancelled. Please try again.',
      'TimeoutError': 'Request timed out. Please try again.',
      'Parse error': 'Invalid response format. Please try again.',
      'JSON.parse': 'Invalid response format. Please try again.',
      'Unexpected token': 'Invalid response format. Please try again.'
    };

    // Check for exact matches
    const exactMatch = errorMappings[message];
    if (exactMatch) {
      return exactMatch;
    }

    // Check for partial matches
    for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        return friendlyMessage;
      }
    }

    // Return original message if no mapping found, but sanitize it
    return this.sanitizeErrorMessage(message);
  }

  // Sanitize error messages to remove sensitive information
  private sanitizeErrorMessage(message: string): string {
    // Remove potential sensitive information
    return message
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // IP addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email addresses
      .replace(/\b[A-Za-z0-9]{20,}\b/g, '[TOKEN]') // Potential tokens
      .replace(/password[=:]\s*\S+/gi, 'password=[HIDDEN]') // Passwords
      .replace(/token[=:]\s*\S+/gi, 'token=[HIDDEN]') // Tokens
      .replace(/key[=:]\s*\S+/gi, 'key=[HIDDEN]'); // API keys
  }

  // Report error to external service
  private reportError(errorDetails: ErrorDetails): void {
    // In a real application, you would send this to your error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    
    try {
      // Example implementation:
      // errorReportingService.captureException(errorDetails);
      
      console.warn('Error reported:', {
        ...errorDetails,
        // Add additional context
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: errorDetails.timestamp
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  // Notify all error listeners
  private notifyListeners(errorDetails: ErrorDetails): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorDetails);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  // Create a fetch wrapper with error handling
  createFetchWrapper() {
    return async (url: string, options?: RequestInit): Promise<Response> => {
      try {
        const response = await fetch(url, {
          ...options,
          // Add timeout
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!response.ok) {
          throw response;
        }

        return response;
      } catch (error) {
        throw this.handleNetworkError(error, {
          url,
          method: options?.method || 'GET',
          headers: options?.headers
        });
      }
    };
  }
}

// Create singleton instance
export const globalErrorHandler = new GlobalErrorHandler();

// Export convenience functions
export const handleApiError = (error: any, context?: Record<string, any>, options?: ErrorHandlerOptions) =>
  globalErrorHandler.handleApiError(error, context, options);

export const handleNetworkError = (error: any, context?: Record<string, any>) =>
  globalErrorHandler.handleNetworkError(error, context);

export const handleValidationError = (message: string, field?: string, value?: any) =>
  globalErrorHandler.handleValidationError(message, field, value);

export const addErrorListener = (listener: (error: ErrorDetails) => void) =>
  globalErrorHandler.addErrorListener(listener);

export const createFetchWrapper = () => globalErrorHandler.createFetchWrapper();

// Set up global error handlers
if (typeof window !== 'undefined') {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    globalErrorHandler.handleApiError(event.reason, {
      type: 'unhandledrejection',
      promise: event.promise
    });
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global JavaScript error:', event.error);
    globalErrorHandler.handleApiError(event.error, {
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}