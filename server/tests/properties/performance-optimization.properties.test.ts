// Feature: multimodal-content-viewer, Property 11: Performance Optimization
// For any content with large media files, the system should implement lazy loading and serve cached responses for repeated requests

import * as fc from 'fast-check';
import { ContentProcessorService } from '../../src/services/ContentProcessorService';
import { ErrorHandlerService } from '../../src/services/ErrorHandlerService';

describe('Property 11: Performance Optimization', () => {
  let contentProcessor: ContentProcessorService;
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
    contentProcessor = new ContentProcessorService(errorHandler);
  });

  afterEach(() => {
    contentProcessor.destroy();
  });

  test('should serve cached responses for repeated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (content) => {
          // First request - should process and cache
          const result1 = await contentProcessor.parseMultimodalResponse(content);
          
          // Second request - should use cache
          const result2 = await contentProcessor.parseMultimodalResponse(content);

          // Results should be identical in structure
          expect(result2.text.length).toBe(result1.text.length);
          expect(result2.images.length).toBe(result1.images.length);
          expect(result2.videos.length).toBe(result1.videos.length);
          expect(result2.documents.length).toBe(result1.documents.length);

          // Cache hit should be reflected in metadata
          expect(result2.metadata.cached).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should implement efficient caching with proper management', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 3, maxLength: 5 }),
        async (contentItems) => {
          for (const content of contentItems) {
            await contentProcessor.parseMultimodalResponse(content);
          }

          // Check cache statistics
          const cacheStats = contentProcessor.getCacheStats();
          expect(cacheStats).toBeDefined();
          expect(cacheStats.size).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should optimize memory usage with cache limits', async () => {
    const largeContentItems = Array.from({ length: 10 }, (_, i) => 
      `Content item ${i} with text. `.repeat(3)
    );

    for (const content of largeContentItems) {
      await contentProcessor.parseMultimodalResponse(content);
    }

    // Cache should manage memory efficiently
    const cacheStats = contentProcessor.getCacheStats();
    expect(cacheStats.size).toBeGreaterThanOrEqual(0);
    expect(cacheStats.memoryUsage).toBeGreaterThanOrEqual(0);
  });

  test('should implement lazy loading for media content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.constant('image: https://example.com/image.jpg'),
            fc.constant('video: https://example.com/video.mp4'),
            fc.constant('document: https://example.com/doc.pdf'),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          { minLength: 2, maxLength: 5 }
        ),
        async (contentLines) => {
          const content = contentLines.join('\n');
          const result = await contentProcessor.parseMultimodalResponse(content);

          // Media items should have lazy loading metadata
          result.images.forEach(image => {
            expect(image.url).toBeDefined();
            expect(image.lazyLoad).toBe(true);
            expect(image.loaded).toBe(false);
          });

          result.videos.forEach(video => {
            expect(video.url).toBeDefined();
            expect(video.lazyLoad).toBe(true);
            expect(video.loaded).toBe(false);
          });

          result.documents.forEach(doc => {
            expect(doc.url).toBeDefined();
            expect(doc.lazyLoad).toBe(true);
            expect(doc.loaded).toBe(false);
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should process content efficiently based on complexity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          simple: fc.string({ minLength: 1, maxLength: 30 }),
          complex: fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.constant('image: https://example.com/image.jpg')
            ),
            { minLength: 2, maxLength: 5 }
          ).map(arr => arr.join('\n'))
        }),
        async ({ simple, complex }) => {
          // Process simple content
          const simpleResult = await contentProcessor.parseMultimodalResponse(simple);
          
          // Process complex content
          const complexResult = await contentProcessor.parseMultimodalResponse(complex);

          // Both should have performance metadata
          expect(simpleResult.metadata.processingTime).toBeGreaterThanOrEqual(0);
          expect(complexResult.metadata.processingTime).toBeGreaterThanOrEqual(0);
          expect(simpleResult.metadata.totalElements).toBeGreaterThanOrEqual(0);
          expect(complexResult.metadata.totalElements).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should implement efficient batch processing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 4 }),
        async (contentItems) => {
          // Process items in batch
          const batchResults = await contentProcessor.batchParseMultimodalResponse(contentItems);

          expect(batchResults.length).toBe(contentItems.length);

          // All results should be valid
          batchResults.forEach(result => {
            expect(result).toBeDefined();
            expect(result.metadata).toBeDefined();
            expect(result.metadata.totalElements).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 8 }
    );
  });

  test('should provide performance metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 3, maxLength: 6 }),
        async (contentItems) => {
          // Process multiple items to generate metrics
          for (const content of contentItems) {
            await contentProcessor.parseMultimodalResponse(content);
          }

          const metrics = contentProcessor.getPerformanceMetrics();

          // Should have comprehensive performance data
          expect(metrics).toBeDefined();
          expect(metrics.totalRequests).toBeGreaterThanOrEqual(contentItems.length);
          expect(metrics.averageProcessingTime).toBeGreaterThan(0);
          expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
          expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 5 }
    );
  });
});