// Feature: multimodal-content-viewer, Property 4: Error Display Consistency
// For any failed operation, the system should display appropriate error messages that are clear and actionable

import * as fc from 'fast-check';
import { ErrorHandlerService } from '../../src/services/ErrorHandlerService';

describe('Property 4: Error Display Consistency', () => {
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
  });

  test('should provide consistent error message format', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('VALIDATION_ERROR'),
          fc.constant('NETWORK_TIMEOUT'),
          fc.constant('AWS_AUTH_ERROR'),
          fc.constant('BEDROCK_SERVICE_ERROR'),
          fc.constant('SESSION_ERROR')
        ),
        fc.string({ minLength: 5, maxLength: 100 }),
        (errorType, errorMessage) => {
          const mockError = new Error(errorMessage);
          const categorizedError = errorHandler.categorizeError(mockError, errorType.toLowerCase().replace('_error', ''));
          
          // Should have consistent structure
          expect(categorizedError).toBeDefined();
          expect(categorizedError.code).toBeDefined();
          expect(categorizedError.message).toBeDefined();
          expect(categorizedError.userMessage).toBeDefined();
          expect(typeof categorizedError.retryable).toBe('boolean');
          expect(typeof categorizedError.retryAfter).toBe('number');
          
          // User message should be clear and actionable
          expect(categorizedError.userMessage.length).toBeGreaterThan(10);
          expect(categorizedError.userMessage).not.toContain('undefined');
          expect(categorizedError.userMessage).not.toContain('null');
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should sanitize sensitive information from error messages', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('password123 failed'),
          fc.constant('secret key sk-abc123'),
          fc.constant('token expired: eyJhbGciOiJIUzI1NiJ9'),
          fc.constant('credentials invalid'),
          fc.string({ minLength: 10, maxLength: 100 })
        ),
        (sensitiveMessage) => {
          const mockError = new Error(sensitiveMessage);
          const sanitizedMessage = errorHandler.sanitizeErrorMessage(mockError);
          
          // Should not contain sensitive patterns
          expect(sanitizedMessage).not.toContain('password123');
          expect(sanitizedMessage).not.toContain('sk-');
          expect(sanitizedMessage).not.toContain('eyJ');
          expect(sanitizedMessage).not.toContain('secret');
          
          // Should still be meaningful
          expect(sanitizedMessage.length).toBeGreaterThan(5);
          expect(typeof sanitizedMessage).toBe('string');
        }
      ),
      { numRuns: 25 }
    );
  });

  test('should provide localized error messages', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('VALIDATION_ERROR'),
          fc.constant('NETWORK_ERROR'),
          fc.constant('AUTH_ERROR'),
          fc.constant('SERVICE_ERROR'),
          fc.constant('UNKNOWN_ERROR')
        ),
        (errorCode) => {
          const localizedMessage = errorHandler.getLocalizedErrorMessage(errorCode);
          
          // Should provide user-friendly localized message
          expect(localizedMessage).toBeDefined();
          expect(typeof localizedMessage).toBe('string');
          expect(localizedMessage.length).toBeGreaterThan(10);
          
          // Should not contain technical jargon
          expect(localizedMessage).not.toContain('undefined');
          expect(localizedMessage).not.toContain('null');
          expect(localizedMessage).not.toContain('Error:');
          
          // Should be actionable
          expect(
            localizedMessage.includes('try') ||
            localizedMessage.includes('check') ||
            localizedMessage.includes('verify') ||
            localizedMessage.includes('contact')
          ).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should handle different error types appropriately', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.oneof(
            fc.constant('validation'),
            fc.constant('network'),
            fc.constant('auth'),
            fc.constant('service')
          ),
          message: fc.string({ minLength: 5, maxLength: 50 })
        }),
        ({ type, message }) => {
          const mockError = new Error(message);
          const categorizedError = errorHandler.categorizeError(mockError, type);
          
          // Different error types should have appropriate retry strategies
          switch (type) {
            case 'validation':
              expect(categorizedError.retryable).toBe(false);
              expect(categorizedError.userMessage).toContain('check');
              break;
            case 'network':
              expect(categorizedError.retryable).toBe(true);
              expect(categorizedError.retryAfter).toBeGreaterThan(0);
              break;
            case 'auth':
              expect(categorizedError.retryable).toBe(false);
              expect(categorizedError.userMessage).toContain('credentials');
              break;
            case 'service':
              expect(categorizedError.retryable).toBe(true);
              expect(categorizedError.userMessage).toContain('service');
              break;
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('should maintain error message consistency across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 50 }),
        (errorMessage) => {
          const mockError = new Error(errorMessage);
          
          // Call multiple times with same error
          const result1 = errorHandler.categorizeError(mockError, 'validation');
          const result2 = errorHandler.categorizeError(mockError, 'validation');
          const result3 = errorHandler.categorizeError(mockError, 'validation');
          
          // Results should be consistent
          expect(result1.code).toBe(result2.code);
          expect(result1.code).toBe(result3.code);
          expect(result1.userMessage).toBe(result2.userMessage);
          expect(result1.userMessage).toBe(result3.userMessage);
          expect(result1.retryable).toBe(result2.retryable);
          expect(result1.retryable).toBe(result3.retryable);
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should handle edge cases in error messages gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant(' '),
          fc.constant('\n'),
          fc.constant('a'),
          fc.string({ minLength: 1000, maxLength: 2000 })
        ),
        (edgeCaseMessage) => {
          const mockError = new Error(edgeCaseMessage);
          const categorizedError = errorHandler.categorizeError(mockError, 'validation');
          
          // Should handle edge cases gracefully
          expect(categorizedError).toBeDefined();
          expect(categorizedError.userMessage).toBeDefined();
          expect(typeof categorizedError.userMessage).toBe('string');
          expect(categorizedError.userMessage.length).toBeGreaterThan(5);
          
          // Should provide meaningful message even for edge cases
          expect(categorizedError.userMessage).not.toBe('');
          expect(categorizedError.userMessage.trim()).not.toBe('');
        }
      ),
      { numRuns: 20 }
    );
  });
});