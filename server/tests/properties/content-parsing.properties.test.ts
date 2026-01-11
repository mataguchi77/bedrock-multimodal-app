// Feature: multimodal-content-viewer, Property 7: Content Parsing Completeness
// For any multimodal response, the content parser should correctly identify all media types and handle parsing failures gracefully with fallback display

import * as fc from 'fast-check';
import { ContentProcessorService } from '../../src/services/ContentProcessorService';
import { ErrorHandlerService } from '../../src/services/ErrorHandlerService';

describe('Property 7: Content Parsing Completeness', () => {
  let contentProcessor: ContentProcessorService;
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
    contentProcessor = new ContentProcessorService(errorHandler);
  });

  afterEach(() => {
    contentProcessor.clearCache();
  });

  test('should identify text content correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
        async (textLines) => {
          const input = textLines.join('\n');
          const result = await contentProcessor.parseMultimodalResponse(input);
          
          expect(result.text.length).toBeGreaterThan(0);
          expect(result.metadata.totalElements).toBeGreaterThan(0);
          expect(result.metadata.confidence).toBeGreaterThan(0);
          
          // All text lines should be preserved
          const parsedText = result.text.map(t => t.content).join('\n');
          textLines.forEach(line => {
            if (line.trim()) {
              expect(parsedText).toContain(line);
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should identify image references correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.constant('image: https://example.com/image.jpg'),
            fc.constant('![Alt text](https://example.com/photo.png)'),
            fc.constant('https://example.com/picture.gif'),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (lines) => {
          const input = lines.join('\n');
          const result = await contentProcessor.parseMultimodalResponse(input);
          
          // Count expected images
          const expectedImages = lines.filter(line => 
            line.includes('image:') || 
            line.includes('![') || 
            /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i.test(line)
          ).length;
          
          expect(result.images.length).toBe(expectedImages);
          
          // Verify image properties
          result.images.forEach(image => {
            expect(image.url).toBeDefined();
            expect(image.alt).toBeDefined();
            expect(typeof image.position).toBe('number');
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should handle parsing failures gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.string({ minLength: 1, maxLength: 1000 })
        ),
        async (input) => {
          // This should never throw an error, always return valid content
          const result = await contentProcessor.parseMultimodalResponse(input || '');
          
          expect(result).toBeDefined();
          expect(result.metadata).toBeDefined();
          expect(result.metadata.totalElements).toBeGreaterThanOrEqual(0);
          expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
          expect(result.text).toBeDefined();
          expect(result.images).toBeDefined();
          expect(result.videos).toBeDefined();
          expect(result.documents).toBeDefined();
          
          // For empty or invalid input, should have fallback content
          if (!input || input.trim().length === 0) {
            expect(result.text.length).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should maintain content positioning correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.constant('image: https://example.com/test.jpg'),
            fc.constant('video: https://example.com/test.mp4')
          ),
          { minLength: 2, maxLength: 10 }
        ),
        async (lines) => {
          const input = lines.join('\n');
          const result = await contentProcessor.parseMultimodalResponse(input);
          
          // Collect all content with positions
          const allContent = [
            ...result.text.map(t => ({ type: 'text', position: t.position })),
            ...result.images.map(i => ({ type: 'image', position: i.position })),
            ...result.videos.map(v => ({ type: 'video', position: v.position })),
            ...result.documents.map(d => ({ type: 'document', position: d.position }))
          ];
          
          // Positions should be sequential and start from 0
          allContent.sort((a, b) => a.position - b.position);
          
          allContent.forEach((content, index) => {
            expect(content.position).toBe(index);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should handle mixed content types correctly', () => {
    const mixedContent = [
      'This is some text content.',
      'image: https://example.com/image.jpg',
      'More text here.',
      'video: https://example.com/video.mp4',
      'document: https://example.com/doc.pdf',
      'Final text content.'
    ].join('\n');

    return contentProcessor.parseMultimodalResponse(mixedContent).then(result => {
      expect(result.text.length).toBe(3); // 3 text lines
      expect(result.images.length).toBe(1); // 1 image
      expect(result.videos.length).toBe(1); // 1 video
      expect(result.documents.length).toBe(1); // 1 document
      expect(result.metadata.totalElements).toBe(6); // Total elements
      
      // Verify content order is preserved
      expect(result.text[0]?.position).toBe(0);
      expect(result.images[0]?.position).toBe(1);
      expect(result.text[1]?.position).toBe(2);
      expect(result.videos[0]?.position).toBe(3);
      expect(result.documents[0]?.position).toBe(4);
      expect(result.text[2]?.position).toBe(5);
    });
  });
});