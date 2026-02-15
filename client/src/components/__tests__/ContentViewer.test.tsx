// Happy path tests for ContentViewer component

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentViewer from '../ContentViewer';
import { MultimodalContent } from '../../types';

describe('ContentViewer - Happy Path', () => {
  it('should render text content', () => {
    const content: MultimodalContent = {
      text: [{ content: 'Test text content', position: 0 }],
      images: [],
      metadata: {
        totalElements: 1,
        processingTime: 100,
        source: 'test',
        confidence: 1.0
      }
    };

    render(<ContentViewer content={content} loading={false} />);

    expect(screen.getByText('Test text content')).toBeInTheDocument();
  });

  it('should render multiple text items', () => {
    const content: MultimodalContent = {
      text: [
        { content: 'First line', position: 0 },
        { content: 'Second line', position: 1 },
        { content: 'Third line', position: 2 }
      ],
      images: [],
      metadata: {
        totalElements: 3,
        processingTime: 100,
        source: 'test',
        confidence: 1.0
      }
    };

    render(<ContentViewer content={content} loading={false} />);

    expect(screen.getByText('First line')).toBeInTheDocument();
    expect(screen.getByText('Second line')).toBeInTheDocument();
    expect(screen.getByText('Third line')).toBeInTheDocument();
  });

  it('should render image content', () => {
    const content: MultimodalContent = {
      text: [],
      images: ['https://example.com/image.jpg'],
      metadata: {
        totalElements: 1,
        processingTime: 100,
        source: 'test',
        confidence: 1.0
      }
    };

    render(<ContentViewer content={content} loading={false} />);

    const image = screen.getByAltText(/content image/i);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should render mixed content (text and images)', () => {
    const content: MultimodalContent = {
      text: [{ content: 'Here is an image:', position: 0 }],
      images: ['https://example.com/image.jpg'],
      metadata: {
        totalElements: 2,
        processingTime: 100,
        source: 'test',
        confidence: 1.0
      }
    };

    render(<ContentViewer content={content} loading={false} />);

    expect(screen.getByText('Here is an image:')).toBeInTheDocument();
    expect(screen.getByAltText(/content image/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const content: MultimodalContent = {
      text: [],
      images: [],
      metadata: {
        totalElements: 0,
        processingTime: 0,
        source: 'test',
        confidence: 0
      }
    };

    render(<ContentViewer content={content} loading={true} />);

    expect(screen.getByText(/querying bedrock agent/i)).toBeInTheDocument();
  });

  it('should show empty state when no content', () => {
    const content: MultimodalContent = {
      text: [],
      images: [],
      metadata: {
        totalElements: 0,
        processingTime: 0,
        source: 'test',
        confidence: 0
      }
    };

    render(<ContentViewer content={content} loading={false} />);

    expect(screen.getByText(/no displayable content/i)).toBeInTheDocument();
  });

  it('should render image without errors', () => {
    const content: MultimodalContent = {
      text: [],
      images: ['https://example.com/image.jpg'],
      metadata: {
        totalElements: 1,
        processingTime: 100,
        source: 'test',
        confidence: 1.0
      }
    };

    render(<ContentViewer content={content} loading={false} />);

    const image = screen.getByAltText(/content image/i);
    expect(image).toBeInTheDocument();
  });

  it('should handle image click for fullscreen', async () => {
    const user = userEvent.setup();
    
    const content: MultimodalContent = {
      text: [],
      images: ['https://example.com/image.jpg'],
      metadata: {
        totalElements: 1,
        processingTime: 100,
        source: 'test',
        confidence: 1.0
      }
    };

    render(<ContentViewer content={content} loading={false} />);

    const image = screen.getByAltText(/content image/i);
    await user.click(image);

    // Fullscreen modal should appear with "Fullscreen view" alt text
    expect(screen.getByAltText('Fullscreen view')).toBeInTheDocument();
  });
});
