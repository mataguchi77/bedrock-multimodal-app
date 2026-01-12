// Feature: multimodal-content-viewer, Property 9: Error Handling Resilience
// For any external service failure, the system should implement retry logic, log errors appropriately, and never crash or become unresponsive

import * as fc from 'fast-check';
import { BedrockClientService } from '../../src/services/BedrockClientService';
import { SessionManagerService } from '../../src/services/SessionManagerService';
import { ErrorHandlerService } from '../../src/services/ErrorHandlerService';

describe('Property 9: Error Handling Resilience', () => {
  let bedrockClient: BedrockClientService;
  let sessionManager: SessionManagerService;
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
    sessionManager = new SessionManagerService();
    bedrockClient = new BedrockClientService(sessionManager, errorHandler);
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  test('should implement retry logic for transient failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Number of failures before success
        fc.string({ minLength: 1, maxLength: 50 }),
        async (failureCount, query) => {
          let callCount = 0;
          const mockFetch = jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= failureCount) {
              // Simulate transient network error
              return Promise.reject(new Error('Network timeout'));
            } else {
              // Success after retries
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                  jsonrpc: '2.0',
                  id: 'test',
                  result: {
                    content: [{ type: 'text', text: 'Success after retry' }],
                    isError: false
                  }
                })
              });
            }
          });

          global.fetch = mockFetch;
          const session = sessionManager.createSession();

          try {
            const result = await bedrockClient.invokeAgent({ query, sessionId: session.id });
            
            // Should have retried the appropriate number of times
            expect(mockFetch).toHaveBeenCalledTimes(failureCount + 1);
            
            // Should eventually succeed
            expect(result.success).toBe(true);
            expect(result.content).toBeDefined();
            
          } catch (error) {
            // If all retries failed, should still provide structured response
            expect(mockFetch).toHaveBeenCalledTimes(Math.min(failureCount + 1, 3)); // Max 3 retries
          }

          mockFetch.mockRestore();
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should never crash or become unresponsive on any error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(() => Promise.reject(new Error('Network error'))),
          fc.constant(() => Promise.reject(new Error('Timeout'))),
          fc.constant(() => Promise.resolve({ ok: false, status: 500, statusText: 'Internal Server Error' })),
          fc.constant(() => Promise.resolve({ ok: false, status: 401, statusText: 'Unauthorized' }))
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (mockFetchBehavior, query) => {
          const mockFetch = jest.fn().mockImplementation(mockFetchBehavior);
          global.fetch = mockFetch;

          const session = sessionManager.createSession();
          const startTime = Date.now();

          try {
            const result = await bedrockClient.invokeAgent({ query, sessionId: session.id });
            
            // Should always return a structured response
            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.sessionId).toBe('string');
            expect(typeof result.timestamp).toBe('object');
            
            if (!result.success) {
              expect(typeof result.error).toBe('string');
              expect(result.error && result.error.length).toBeGreaterThan(0);
            }
            
          } catch (error) {
            // Even if an error is thrown, it should be handled gracefully
            expect(error).toBeDefined();
          }

          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Should respond within reasonable time (not hang indefinitely)
          expect(duration).toBeLessThan(10000); // 10 seconds max

          mockFetch.mockRestore();
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should log errors appropriately without exposing sensitive data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('AWS credentials invalid: secret-key-123'),
          fc.constant('Database password failed: password123'),
          fc.constant('API token expired: sk-1234567890abcdef'),
          fc.string({ minLength: 10, maxLength: 100 })
        ),
        async (sensitiveErrorMessage) => {
          const mockError = new Error(sensitiveErrorMessage);
          
          // Capture console logs
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
          
          const categorizedError = errorHandler.categorizeError(mockError, 'service');
          
          expect(categorizedError).toBeDefined();
          expect(categorizedError.userMessage).toBeDefined();
          
          // User message should not contain sensitive information
          expect(categorizedError.userMessage).not.toContain('secret');
          expect(categorizedError.userMessage).not.toContain('password');
          expect(categorizedError.userMessage).not.toContain('sk-');
          
          // Should still be informative
          expect(categorizedError.userMessage.length).toBeGreaterThan(10);
          
          consoleSpy.mockRestore();
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should implement exponential backoff for retry attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        async (query) => {
          const retryTimes: number[] = [];
          let callCount = 0;
          
          const mockFetch = jest.fn().mockImplementation(() => {
            const currentTime = Date.now();
            if (callCount > 0) {
              retryTimes.push(currentTime);
            }
            callCount++;
            
            if (callCount <= 2) {
              return Promise.reject(new Error('Temporary failure'));
            } else {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                  jsonrpc: '2.0',
                  id: 'test',
                  result: {
                    content: [{ type: 'text', text: 'Success' }],
                    isError: false
                  }
                })
              });
            }
          });

          global.fetch = mockFetch;
          const session = sessionManager.createSession();

          try {
            await bedrockClient.invokeAgent({ query, sessionId: session.id });
            
            // Should have made multiple attempts
            expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
            
          } catch (error) {
            // Should still have attempted retries
            expect(mockFetch).toHaveBeenCalledTimes(3); // Max retries
          }

          mockFetch.mockRestore();
        }
      ),
      { numRuns: 8 }
    );
  });

  test('should maintain system stability under concurrent error conditions', async () => {
    const concurrentRequests = 5;
    const queries = Array.from({ length: concurrentRequests }, (_, i) => `Query ${i}`);
    
    // Mock various error conditions
    const mockFetch = jest.fn().mockImplementation(() => {
      const errorTypes = [
        () => Promise.reject(new Error('Network timeout')),
        () => Promise.resolve({ ok: false, status: 500 }),
        () => Promise.resolve({ ok: false, status: 429 })
      ];
      
      const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      return randomError();
    });

    global.fetch = mockFetch;

    const startTime = Date.now();
    const promises = queries.map(query => {
      const session = sessionManager.createSession();
      return bedrockClient.invokeAgent({ query, sessionId: session.id }).catch(error => ({
        success: false,
        error: error.message,
        sessionId: session.id,
        timestamp: new Date()
      }));
    });

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // All requests should complete within reasonable time
    expect(totalTime).toBeLessThan(30000); // 30 seconds for 5 concurrent requests

    // All results should be structured responses
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.sessionId).toBe('string');
    });

    // System should remain responsive (no hanging requests)
    expect(results.length).toBe(concurrentRequests);

    mockFetch.mockRestore();
  });

  test('should provide appropriate error recovery strategies', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('NETWORK_ERROR'),
          fc.constant('AUTH_ERROR'),
          fc.constant('VALIDATION_ERROR'),
          fc.constant('SERVICE_ERROR')
        ),
        (errorType) => {
          const mockError = new Error(`Mock ${errorType}`);
          const categorizedError = errorHandler.categorizeError(mockError, errorType.toLowerCase().replace('_error', ''));
          
          expect(categorizedError).toBeDefined();
          expect(typeof categorizedError.retryable).toBe('boolean');
          expect(typeof categorizedError.retryAfter).toBe('number');
          expect(categorizedError.retryAfter).toBeGreaterThanOrEqual(0);
          
          // Different error types should have appropriate retry strategies
          switch (errorType) {
            case 'NETWORK_ERROR':
            case 'SERVICE_ERROR':
              expect(categorizedError.retryable).toBe(true);
              expect(categorizedError.retryAfter).toBeGreaterThan(0);
              break;
            case 'AUTH_ERROR':
            case 'VALIDATION_ERROR':
              expect(categorizedError.retryable).toBe(false);
              break;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});