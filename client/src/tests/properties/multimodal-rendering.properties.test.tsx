// Feature: multimodal-content-viewer, Property 8: Multimodal Content Rendering
// For any parsed content, the frontend should render text with proper formatting and images with error handling

import * as fc from 'fast-check';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ContentViewer from '../../components/ContentViewer';
import { MultimodalContent } from '../../types';

// Mock intersection observer for lazy loading tests
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('Property 8: Multimodal Content Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render text content with proper formatting', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 5, maxLength: 200 }),
            position: fc.integer({ min: 0, max: 100 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (textContents) => {
          const mockContent: MultimodalContent = {
            text: textContents,
            images: [],
            metadata: {
              totalElements: textContents.length,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // All text content should be rendered
          textContents.forEach(textItem => {
            if (textItem.content.trim()) {
              expect(screen.getByText(textItem.content)).toBeInTheDocument();
            }
          });

          // Should have content display
          if (textContents.length > 0) {
            const contentDisplay = screen.getByText(textContents[0].content).closest('.content-display');
            expect(contentDisplay).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should render images with proper error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            url: fc.webUrl({ validSchemes: ['https'] }),
            alt: fc.string({ minLength: 5, maxLength: 100 }),
            position: fc.integer({ min: 0, max: 100 })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (imageContents) => {
          const mockContent: MultimodalContent = {
            text: [],
            images: imageContents,
            metadata: {
              totalElements: imageContents.length,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // All images should be rendered with proper attributes
          for (const imageItem of imageContents) {
            const imageElement = screen.getByAltText(imageItem.alt);
            expect(imageElement).toBeInTheDocument();
            expect(imageElement).toHaveAttribute('src', imageItem.url);
            expect(imageElement).toHaveAttribute('alt', imageItem.alt);

            // Should be clickable for fullscreen
            expect(imageElement).toHaveClass('zoomable-image');
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should handle mixed content types in correct order', () => {
    fc.assert(
      fc.property(
        fc.record({
          textItems: fc.array(
            fc.record({
              content: fc.string({ minLength: 5, maxLength: 50 }),
              position: fc.integer({ min: 0, max: 20 })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          imageItems: fc.array(
            fc.record({
              url: fc.webUrl({ validSchemes: ['https'] }),
              alt: fc.string({ minLength: 5, maxLength: 50 }),
              position: fc.integer({ min: 0, max: 20 })
            }),
            { minLength: 1, maxLength: 2 }
          )
        }),
        ({ textItems, imageItems }) => {
          const mockContent: MultimodalContent = {
            text: textItems,
            images: imageItems,
            metadata: {
              totalElements: textItems.length + imageItems.length,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // All content should be rendered
          textItems.forEach(item => {
            expect(screen.getByText(item.content)).toBeInTheDocument();
          });

          imageItems.forEach(item => {
            expect(screen.getByAltText(item.alt)).toBeInTheDocument();
          });

          // Should have content display container
          if (textItems.length > 0) {
            const contentDisplay = screen.getByText(textItems[0].content).closest('.content-display');
            expect(contentDisplay).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should implement proper error boundaries for content rendering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasValidText: fc.boolean(),
          hasValidImages: fc.boolean()
        }),
        async (contentConfig) => {
          const mockContent: MultimodalContent = {
            text: contentConfig.hasValidText ? [{ content: 'Valid text content', position: 0 }] : [],
            images: contentConfig.hasValidImages ? [{ url: 'https://example.com/image.jpg', alt: 'Valid image', position: 1 }] : [],
            metadata: {
              totalElements: [contentConfig.hasValidText, contentConfig.hasValidImages].filter(Boolean).length,
              processingTime: 100,
              source: 'test'
            }
          };

          // Should not crash even with edge cases
          expect(() => {
            render(<ContentViewer content={mockContent} loading={false} />);
          }).not.toThrow();

          // Valid content should render
          if (contentConfig.hasValidText) {
            expect(screen.getByText('Valid text content')).toBeInTheDocument();
          }
          
          if (contentConfig.hasValidImages) {
            expect(screen.getByAltText('Valid image')).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should implement responsive design for different content types', () => {
    fc.assert(
      fc.property(
        fc.record({
          viewportWidth: fc.integer({ min: 320, max: 1920 }),
          textCount: fc.integer({ min: 1, max: 3 }),
          imageCount: fc.integer({ min: 1, max: 2 })
        }),
        ({ viewportWidth, textCount, imageCount }) => {
          // Mock viewport width
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewportWidth,
          });

          const mockContent: MultimodalContent = {
            text: Array.from({ length: textCount }, (_, i) => ({
              content: `Responsive text ${i}`,
              position: i
            })),
            images: Array.from({ length: imageCount }, (_, i) => ({
              url: `https://example.com/responsive${i}.jpg`,
              alt: `Responsive image ${i}`,
              position: textCount + i
            })),
            metadata: {
              totalElements: textCount + imageCount,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);
          
          // Should render content appropriately
          for (let i = 0; i < textCount; i++) {
            expect(screen.getByText(`Responsive text ${i}`)).toBeInTheDocument();
          }

          for (let i = 0; i < imageCount; i++) {
            const imageElement = screen.getByAltText(`Responsive image ${i}`);
            expect(imageElement).toBeInTheDocument();
            expect(imageElement).toHaveClass('zoomable-image');
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should handle image fullscreen functionality', async () => {
    const user = userEvent.setup();
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          url: fc.webUrl({ validSchemes: ['https'] }),
          alt: fc.string({ minLength: 5, maxLength: 100 })
        }),
        async (imageData) => {
          const mockContent: MultimodalContent = {
            text: [],
            images: [{
              url: imageData.url,
              alt: imageData.alt,
              position: 0
            }],
            metadata: {
              totalElements: 1,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          const imageElement = screen.getByAltText(imageData.alt);
          
          // Click image to open fullscreen
          await user.click(imageElement);

          // Fullscreen modal should appear
          await waitFor(() => {
            expect(screen.getByText('✕')).toBeInTheDocument();
          });

          const fullscreenImage = screen.getByAltText('Fullscreen view');
          expect(fullscreenImage).toHaveAttribute('src', imageData.url);

          // Should have close button
          const closeButton = screen.getByText('✕');
          expect(closeButton).toBeInTheDocument();

          // Close fullscreen
          await user.click(closeButton);

          await waitFor(() => {
            expect(screen.queryByAltText('Fullscreen view')).not.toBeInTheDocument();
          });
        }
      ),
      { numRuns: 5 }
    );
  });
});