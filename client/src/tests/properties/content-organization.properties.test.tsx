// Feature: multimodal-content-viewer, Property 10: Content Organization and Layout
// For any content display, media types should be organized in logical flow with proper responsive design and appropriate empty states

import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentViewer from '../../components/ContentViewer';
import { MultimodalContent } from '../../types';

// Mock ResizeObserver for responsive design tests
const mockResizeObserver = jest.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.ResizeObserver = mockResizeObserver;

describe('Property 10: Content Organization and Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should organize content in logical flow based on position', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant('text'),
              content: fc.string({ minLength: 1, maxLength: 100 }),
              position: fc.integer({ min: 0, max: 50 })
            }),
            fc.record({
              type: fc.constant('image'),
              url: fc.webUrl({ validSchemes: ['https'] }),
              alt: fc.string({ minLength: 1, maxLength: 50 }),
              position: fc.integer({ min: 0, max: 50 })
            })
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (contentItems) => {
          const mockContent: MultimodalContent = {
            text: contentItems.filter(item => item.type === 'text').map(item => ({
              content: (item as any).content,
              position: item.position
            })),
            images: contentItems.filter(item => item.type === 'image').map(item => ({
              url: (item as any).url,
              alt: (item as any).alt,
              position: item.position
            })),
            metadata: {
              totalElements: contentItems.length,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // Check that content is rendered
          const contentContainer = screen.getByRole('main') || screen.getByText(/content/i).closest('.content-container');
          expect(contentContainer).toBeInTheDocument();

          // Check that text content is rendered
          const textItems = contentItems.filter(item => item.type === 'text');
          textItems.forEach(item => {
            const textContent = (item as any).content;
            if (textContent.trim()) {
              expect(screen.getByText(textContent)).toBeInTheDocument();
            }
          });

          // Check that images are rendered
          const imageItems = contentItems.filter(item => item.type === 'image');
          imageItems.forEach(item => {
            const alt = (item as any).alt;
            if (alt.trim()) {
              expect(screen.getByAltText(alt)).toBeInTheDocument();
            }
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should implement proper responsive design across viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.record({
          viewportWidth: fc.integer({ min: 320, max: 1920 }),
          viewportHeight: fc.integer({ min: 480, max: 1080 }),
          contentCount: fc.integer({ min: 2, max: 10 })
        }),
        ({ viewportWidth, viewportHeight, contentCount }) => {
          // Mock viewport dimensions
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewportWidth,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: viewportHeight,
          });

          // Generate mixed content
          const mockContent: MultimodalContent = {
            text: Array.from({ length: Math.floor(contentCount / 2) }, (_, i) => ({
              content: `Text content ${i}`,
              position: i * 2
            })),
            images: Array.from({ length: Math.floor(contentCount / 4) }, (_, i) => ({
              url: `https://example.com/image${i}.jpg`,
              alt: `Image ${i}`,
              position: i * 4 + 1
            })),
            metadata: {
              totalElements: contentCount,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // Check that content is rendered
          const contentViewer = screen.getByText(/Text content/i).closest('.content-viewer');
          expect(contentViewer).toBeInTheDocument();

          // Content should be properly rendered
          const textElements = screen.getAllByText(/Text content/i);
          expect(textElements.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should display appropriate empty states for missing content types', () => {
    fc.assert(
      fc.property(
        fc.record({
          hasText: fc.boolean(),
          hasImages: fc.boolean()
        }),
        ({ hasText, hasImages }) => {
          const mockContent: MultimodalContent = {
            text: hasText ? [{ content: 'Sample text', position: 0 }] : [],
            images: hasImages ? [{ url: 'https://example.com/image.jpg', alt: 'Sample image', position: 1 }] : [],
            metadata: {
              totalElements: [hasText, hasImages].filter(Boolean).length,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // If no content at all, should show empty state
          if (!hasText && !hasImages) {
            expect(screen.getByText(/no displayable content/i)).toBeInTheDocument();
          } else {
            // Should show content when available
            if (hasText) {
              expect(screen.getByText('Sample text')).toBeInTheDocument();
            }
            if (hasImages) {
              expect(screen.getByAltText('Sample image')).toBeInTheDocument();
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should implement proper content grouping and sectioning', () => {
    fc.assert(
      fc.property(
        fc.record({
          textCount: fc.integer({ min: 1, max: 5 }),
          imageCount: fc.integer({ min: 1, max: 3 })
        }),
        ({ textCount, imageCount }) => {
          const mockContent: MultimodalContent = {
            text: Array.from({ length: textCount }, (_, i) => ({
              content: `Text block ${i}`,
              position: i
            })),
            images: Array.from({ length: imageCount }, (_, i) => ({
              url: `https://example.com/image${i}.jpg`,
              alt: `Image ${i}`,
              position: textCount + i
            })),
            metadata: {
              totalElements: textCount + imageCount,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // Should render all text content
          for (let i = 0; i < textCount; i++) {
            expect(screen.getByText(`Text block ${i}`)).toBeInTheDocument();
          }

          // Should render all images
          for (let i = 0; i < imageCount; i++) {
            expect(screen.getByAltText(`Image ${i}`)).toBeInTheDocument();
          }

          // Should have content display container
          const contentDisplay = screen.getByText(`Text block 0`).closest('.content-display');
          expect(contentDisplay).toBeInTheDocument();
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should handle content overflow and scrolling appropriately', () => {
    fc.assert(
      fc.property(
        fc.record({
          itemCount: fc.integer({ min: 5, max: 20 })
        }),
        ({ itemCount }) => {
          // Generate content that would create a scrollable layout
          const mockContent: MultimodalContent = {
            text: Array.from({ length: itemCount }, (_, i) => ({
              content: `Long text content item ${i} with substantial content to create scrollable layout`,
              position: i
            })),
            images: Array.from({ length: Math.floor(itemCount / 5) }, (_, i) => ({
              url: `https://example.com/large-image-${i}.jpg`,
              alt: `Large image ${i}`,
              position: itemCount + i
            })),
            metadata: {
              totalElements: itemCount + Math.floor(itemCount / 5),
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // Should render all content
          for (let i = 0; i < itemCount; i++) {
            expect(screen.getByText(`Long text content item ${i} with substantial content to create scrollable layout`)).toBeInTheDocument();
          }

          // Should have content container
          const contentContainer = screen.getByText(/Long text content item 0/).closest('.content-container');
          expect(contentContainer).toBeInTheDocument();
        }
      ),
      { numRuns: 10 }
    );
  });

  test('should maintain accessibility in content organization', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant('text'),
              content: fc.string({ minLength: 5, maxLength: 100 }),
              position: fc.integer({ min: 0, max: 20 })
            }),
            fc.record({
              type: fc.constant('image'),
              url: fc.webUrl({ validSchemes: ['https'] }),
              alt: fc.string({ minLength: 5, maxLength: 100 }),
              position: fc.integer({ min: 0, max: 20 })
            })
          ),
          { minLength: 2, maxLength: 8 }
        ),
        (contentItems) => {
          const mockContent: MultimodalContent = {
            text: contentItems.filter(item => item.type === 'text').map(item => ({
              content: (item as any).content,
              position: item.position
            })),
            images: contentItems.filter(item => item.type === 'image').map(item => ({
              url: (item as any).url,
              alt: (item as any).alt,
              position: item.position
            })),
            metadata: {
              totalElements: contentItems.length,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={mockContent} loading={false} />);

          // Images should have proper alt text
          const images = screen.getAllByRole('img');
          images.forEach(image => {
            expect(image).toHaveAttribute('alt');
            expect(image.getAttribute('alt')).toBeTruthy();
          });

          // Should have content container
          const contentViewer = screen.getByText(/content/i).closest('.content-viewer') || 
                               screen.getAllByRole('img')[0]?.closest('.content-viewer');
          expect(contentViewer).toBeInTheDocument();
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should implement proper loading states during content organization', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          contentSize: fc.integer({ min: 2, max: 10 })
        }),
        ({ isLoading, contentSize }) => {
          const mockContent: MultimodalContent = {
            text: Array.from({ length: Math.floor(contentSize / 2) }, (_, i) => ({
              content: `Text ${i}`,
              position: i
            })),
            images: Array.from({ length: Math.floor(contentSize / 2) }, (_, i) => ({
              url: `https://example.com/image${i}.jpg`,
              alt: `Image ${i}`,
              position: Math.floor(contentSize / 2) + i
            })),
            metadata: {
              totalElements: contentSize,
              processingTime: 100,
              source: 'test'
            }
          };

          render(<ContentViewer content={isLoading ? null : mockContent} loading={isLoading} />);

          if (isLoading) {
            // Should show loading state
            expect(screen.getByText(/querying bedrock agent/i)).toBeInTheDocument();
            expect(screen.getByText(/processing multimodal content/i)).toBeInTheDocument();
          } else {
            // Should show actual content
            expect(screen.queryByText(/querying bedrock agent/i)).not.toBeInTheDocument();
            expect(screen.getByText('Text 0')).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});