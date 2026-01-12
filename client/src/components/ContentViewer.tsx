// Feature: multimodal-content-viewer
// Enhanced ContentViewer Component with TypeScript, advanced rendering, performance optimization, and UX improvements

import { useState, useCallback, useRef, useEffect } from 'react';
import { ContentViewerProps, MultimodalContent } from '../types';
import './ContentViewer.css';

const ContentViewer: React.FC<ContentViewerProps> = ({ 
  content, 
  loading, 
  error 
}) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle image load errors
  const handleImageError = useCallback((url: string) => {
    setImageLoadErrors(prev => new Set(prev).add(url));
  }, []);

  // Handle fullscreen image
  const handleImageClick = useCallback((url: string) => {
    if (!imageLoadErrors.has(url)) {
      setFullscreenImage(url);
    }
  }, [imageLoadErrors]);

  // Close fullscreen
  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  // Handle keyboard events for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        closeFullscreen();
      }
    };

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [fullscreenImage, closeFullscreen]);

  // Render text content with proper formatting
  const renderTextContent = useCallback((text: string, index: number) => {
    // Handle markdown-like formatting
    const formatText = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    };

    return (
      <div 
        key={`text-${index}`} 
        className="content-text"
        dangerouslySetInnerHTML={{ __html: formatText(text) }}
      />
    );
  }, []);

  // Render image content with zoom and error handling
  const renderImageContent = useCallback((url: string, index: number, alt?: string) => {
    const hasError = imageLoadErrors.has(url);
    
    if (hasError) {
      return (
        <div key={`image-${index}`} className="content-image error">
          <div className="image-error">
            <span className="error-icon">🖼️</span>
            <p>Failed to load image</p>
            <small>{url}</small>
          </div>
        </div>
      );
    }

    return (
      <div key={`image-${index}`} className="content-image">
        <img
          src={url}
          alt={alt || `Content image ${index + 1}`}
          onClick={() => handleImageClick(url)}
          onError={() => handleImageError(url)}
          loading="lazy"
          className="zoomable-image"
          title="Click to view fullscreen"
        />
        <div className="image-overlay">
          <button
            onClick={() => handleImageClick(url)}
            className="zoom-button"
            aria-label="View fullscreen"
          >
            🔍
          </button>
        </div>
      </div>
    );
  }, [imageLoadErrors, handleImageClick, handleImageError]);

  // Parse and render multimodal content
  const renderMultimodalContent = useCallback((content: MultimodalContent) => {
    const elements: JSX.Element[] = [];

    // Render text content
    if (content.text && content.text.length > 0) {
      content.text.forEach((textItem, index) => {
        if (typeof textItem === 'string') {
          elements.push(renderTextContent(textItem, index));
        } else if (textItem && typeof textItem === 'object' && 'content' in textItem) {
          elements.push(renderTextContent(textItem.content, index));
        }
      });
    }

    // Render images
    if (content.images && content.images.length > 0) {
      content.images.forEach((imageItem, index) => {
        if (typeof imageItem === 'string') {
          elements.push(renderImageContent(imageItem, index));
        } else if (imageItem && typeof imageItem === 'object' && 'url' in imageItem) {
          elements.push(renderImageContent(imageItem.url, index, imageItem.alt));
        }
      });
    }

    return elements.length > 0 ? elements : [
      <div key="no-content" className="no-content">
        <p>No displayable content found in the response.</p>
      </div>
    ];
  }, [renderTextContent, renderImageContent]);

  // Main render logic
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner" aria-hidden="true"></div>
          <p>Querying Bedrock Agent...</p>
          <small>Processing multimodal content...</small>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-state" role="alert">
          <div className="error-icon">⚠️</div>
          <h3>Query Failed</h3>
          <p>{error}</p>
          <small>Please try again or contact support if the issue persists.</small>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h3>Ready to explore</h3>
          <p>Submit a query above to get content from your Bedrock Knowledge Base</p>
          <small>Supports text and images</small>
        </div>
      );
    }

    return (
      <div className="content-display">
        {renderMultimodalContent(content)}
        {content.metadata && (
          <div className="content-metadata">
            <details>
              <summary>Response Metadata</summary>
              <pre>{JSON.stringify(content.metadata, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="content-viewer">
      <div className="content-container" ref={contentRef}>
        {renderContent()}
      </div>

      {/* Fullscreen image modal */}
      {fullscreenImage && (
        <div className="fullscreen-overlay" onClick={closeFullscreen}>
          <div className="fullscreen-content">
            <img
              src={fullscreenImage}
              alt="Fullscreen view"
              className="fullscreen-image"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="fullscreen-close"
              onClick={closeFullscreen}
              aria-label="Close fullscreen"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentViewer;