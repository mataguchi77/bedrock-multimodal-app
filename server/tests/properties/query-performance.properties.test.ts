// Feature: multimodal-content-viewer, Property 2: Query Processing Performance
// For any valid query submission, the system should send the request to Bedrock Agent within 500ms and provide user feedback within 3 seconds

import * as fc from 'fast-check';
import { ContentProcessorService } from '../../src/services/ContentProcessorService';
import { ErrorHandlerService } from '../../src/services/ErrorHandlerService';
import { SessionManagerService } from '../../src/services/SessionManagerService';

describe('Property 2: Query Processing Performance', () => {
  let contentProcessor: ContentProcessorService;
  let sessionManager: SessionManagerService;
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
    contentProcessor = new ContentProcessorService(errorHandler);
    sessionManager = new SessionManagerService();
  });

  afterEach(() => {
    contentProcessor.destroy();
    sessionManager.destroy();
  });

  test('should process queries within acceptable time limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (query) => {
          const startTime = Date.now();
          
          // Process the query content
          const result = await contentProcessor.parseMultimodalResponse(query);
          
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          // Should complete within reasonable time (simulating user feedback requirement)
          expect(processingTime).toBeLessThan(1000); // 1 second for content processing
          
          // Should return valid result structure
          expect(result).toBeDefined();
          expect(result.metadata).toBeDefined();
          expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
          expect(result.metadata.totalElements).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should handle concurrent query processing efficiently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 3, maxLength: 8 }),
        async (queries) => {
          const startTime = Date.now();
          
          // Process queries concurrently
          const promises = queries.map(query => 
            contentProcessor.parseMultimodalResponse(query)
          );
          
          const results = await Promise.all(promises);
          
          const endTime = Date.now();
          const totalTime = endTime - startTime;

          // Concurrent processing should be efficient
          expect(totalTime).toBeLessThan(queries.length * 500); // Should be faster than sequential
          
          // All results should be valid
          expect(results.length).toBe(queries.length);
          results.forEach(result => {
            expect(result).toBeDefined();
            expect(result.metadata).toBeDefined();
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should provide performance metrics for monitoring', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 5, maxLength: 10 }),
        async (queries) => {
          // Process multiple queries to generate metrics
          for (const query of queries) {
            await contentProcessor.parseMultimodalResponse(query);
          }

          const metrics = contentProcessor.getPerformanceMetrics();

          // Should provide comprehensive performance data
          expect(metrics).toBeDefined();
          expect(metrics.totalRequests).toBeGreaterThanOrEqual(queries.length);
          expect(metrics.averageProcessingTime).toBeGreaterThan(0);
          expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
          expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
          
          // Performance should be within acceptable ranges
          expect(metrics.averageProcessingTime).toBeLessThan(500); // Average under 500ms
        }
      ),
      { numRuns: 8 }
    );
  });

  test('should optimize performance through caching', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (query) => {
          // First request - should process and cache
          const startTime1 = Date.now();
          const result1 = await contentProcessor.parseMultimodalResponse(query);
          const endTime1 = Date.now();
          const firstTime = endTime1 - startTime1;

          // Second request - should use cache and be faster
          const startTime2 = Date.now();
          const result2 = await contentProcessor.parseMultimodalResponse(query);
          const endTime2 = Date.now();
          const secondTime = endTime2 - startTime2;

          // Results should be consistent
          expect(result2.text.length).toBe(result1.text.length);
          expect(result2.images.length).toBe(result1.images.length);
          
          // Second request should indicate caching
          expect(result2.metadata.cached).toBe(true);
          
          // Performance should be optimized through caching
          expect(secondTime).toBeLessThanOrEqual(firstTime + 10); // Allow small variance
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should maintain session performance under load', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (sessionCount) => {
          const startTime = Date.now();
          
          const sessions = [];
          for (let i = 0; i < sessionCount; i++) {
            const session = sessionManager.createSession();
            sessionManager.updateSession(session.id, { queryCount: i + 1 });
            sessions.push(session);
          }
          
          const endTime = Date.now();
          const totalTime = endTime - startTime;

          // Session operations should be fast
          expect(totalTime).toBeLessThan(sessionCount * 10); // Under 10ms per session
          
          // All sessions should be properly created
          expect(sessions.length).toBe(sessionCount);
          sessions.forEach(session => {
            expect(session.id).toBeDefined();
            expect(session.queryCount).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should handle performance degradation gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 50, maxLength: 200 }), { minLength: 10, maxLength: 20 }),
        async (largeQueries) => {
          const startTime = Date.now();
          
          // Process large queries that might stress the system
          const results = [];
          for (const query of largeQueries) {
            const result = await contentProcessor.parseMultimodalResponse(query);
            results.push(result);
          }
          
          const endTime = Date.now();
          const totalTime = endTime - startTime;
          const averageTime = totalTime / largeQueries.length;

          // Even under stress, should maintain reasonable performance
          expect(averageTime).toBeLessThan(200); // Average under 200ms per query
          
          // All queries should still be processed successfully
          expect(results.length).toBe(largeQueries.length);
          results.forEach(result => {
            expect(result).toBeDefined();
            expect(result.metadata.totalElements).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 5 }
    );
  });
});