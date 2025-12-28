// Feature: multimodal-content-viewer
// Content Processor Service for parsing and structuring multimodal responses

import { 
  MultimodalContent, 
  TextContent, 
  ImageContent, 
  VideoContent, 
  DocumentContent,
  ContentElement 
} from '@/types';
import { ErrorHandlerService } from './ErrorHandlerService';

export class ContentProcessorService {
  private contentCache: Map<string, MultimodalContent> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(_errorHandler: ErrorHandlerService) {
    // ErrorHandler available for future use
  }

  async parseMultimodalResponse(rawResponse: string, source: string = 'bedrock'): Promise<MultimodalContent> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(rawResponse);
      const cached = this.contentCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Parse the response
      const elements = this.extractContentElements(rawResponse);
      const content = this.organizeContentByType(elements);
      
      // Add metadata
      content.metadata = {
        totalElements: elements.length,
        processingTime: Date.now() - startTime,
        source,
        confidence: this.calculateConfidence(elements)
      };

      // Cache the result
      this.cacheContent(cacheKey, content);

      return content;

    } catch (error) {
      // Graceful fallback - return raw text as content
      console.warn('Content parsing failed, falling back to raw text:', error);
      
      return this.createFallbackContent(rawResponse, source, Date.now() - startTime);
    }
  }

  private extractContentElements(rawResponse: string): ContentElement[] {
    const elements: ContentElement[] = [];
    const lines = rawResponse.split('\n');
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      // Check for image references
      const imageMatch = this.extractImageContent(line, position);
      if (imageMatch) {
        elements.push(imageMatch);
        position++;
        continue;
      }

      // Check for video references
      const videoMatch = this.extractVideoContent(line, position);
      if (videoMatch) {
        elements.push(videoMatch);
        position++;
        continue;
      }

      // Check for document references
      const documentMatch = this.extractDocumentContent(line, position);
      if (documentMatch) {
        elements.push(documentMatch);
        position++;
        continue;
      }

      // Default to text content
      const textContent = this.extractTextContent(line, position);
      if (textContent) {
        elements.push(textContent);
        position++;
      }
    }

    return elements;
  }

  private extractImageContent(line: string, position: number): ContentElement | null {
    // Look for various image patterns
    const patterns = [
      /(?:image|img):\s*(.+)/i,
      /!\[([^\]]*)\]\(([^)]+)\)/,  // Markdown image
      /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?/i
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let url: string;
        let alt: string = '';

        if (pattern.source.includes('image|img')) {
          url = match[1]?.trim() || '';
        } else if (pattern.source.includes('!\\[')) {
          alt = match[1] || '';
          url = match[2] || '';
        } else {
          url = match[0] || '';
        }

        if (this.isValidUrl(url)) {
          const imageContent: ImageContent = {
            url,
            alt: alt || `Image ${position + 1}`,
            position
          };

          return {
            type: 'image',
            content: imageContent,
            position
          };
        }
      }
    }

    return null;
  }

  private extractVideoContent(line: string, position: number): ContentElement | null {
    // Look for video patterns
    const patterns = [
      /(?:video|vid):\s*(.+)/i,
      /https?:\/\/[^\s]+\.(mp4|webm|ogg|avi|mov)(\?[^\s]*)?/i,
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/i
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let url: string;
        let title: string = '';

        if (pattern.source.includes('video|vid')) {
          url = match[1]?.trim() || '';
        } else {
          url = match[0] || '';
        }

        if (this.isValidUrl(url) || pattern.source.includes('youtube')) {
          const videoContent: VideoContent = {
            url,
            title: title || `Video ${position + 1}`,
            position
          };

          return {
            type: 'video',
            content: videoContent,
            position
          };
        }
      }
    }

    return null;
  }

  private extractDocumentContent(line: string, position: number): ContentElement | null {
    // Look for document patterns
    const patterns = [
      /(?:document|doc|file):\s*(.+)/i,
      /https?:\/\/[^\s]+\.(pdf|doc|docx|txt|rtf)(\?[^\s]*)?/i
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let url: string;
        let title: string = '';

        if (pattern.source.includes('document|doc|file')) {
          url = match[1]?.trim() || '';
        } else {
          url = match[0] || '';
        }

        if (this.isValidUrl(url)) {
          const extension = this.getFileExtension(url);
          const documentContent: DocumentContent = {
            url,
            title: title || `Document ${position + 1}`,
            type: this.mapDocumentType(extension),
            position
          };

          return {
            type: 'document',
            content: documentContent,
            position
          };
        }
      }
    }

    return null;
  }

  private extractTextContent(line: string, position: number): ContentElement | null {
    if (line.length === 0) return null;

    const textContent: TextContent = {
      content: line,
      position,
      formatting: this.detectTextFormatting(line)
    };

    return {
      type: 'text',
      content: textContent,
      position
    };
  }

  private organizeContentByType(elements: ContentElement[]): MultimodalContent {
    const content: MultimodalContent = {
      text: [],
      images: [],
      videos: [],
      documents: [],
      metadata: {
        totalElements: 0,
        processingTime: 0,
        source: '',
        confidence: 0
      }
    };

    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          content.text.push(element.content as TextContent);
          break;
        case 'image':
          content.images.push(element.content as ImageContent);
          break;
        case 'video':
          content.videos.push(element.content as VideoContent);
          break;
        case 'document':
          content.documents.push(element.content as DocumentContent);
          break;
      }
    });

    return content;
  }

  private detectTextFormatting(text: string) {
    return {
      bold: /\*\*(.+?)\*\*/.test(text) || /__(.+?)__/.test(text),
      italic: /\*(.+?)\*/.test(text) || /_(.+?)_/.test(text)
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private getFileExtension(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const extension = pathname.split('.').pop()?.toLowerCase();
      return extension || '';
    } catch {
      return '';
    }
  }

  private mapDocumentType(extension: string): 'pdf' | 'doc' | 'other' {
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'doc';
      default:
        return 'other';
    }
  }

  private calculateConfidence(elements: ContentElement[]): number {
    if (elements.length === 0) return 0;

    let score = 0;
    elements.forEach(element => {
      switch (element.type) {
        case 'text':
          score += 0.8; // High confidence for text
          break;
        case 'image':
        case 'video':
        case 'document':
          score += 1.0; // Very high confidence for media
          break;
      }
    });

    return Math.min(score / elements.length, 1.0);
  }

  private generateCacheKey(content: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private cacheContent(key: string, content: MultimodalContent): void {
    this.contentCache.set(key, content);
    
    // Set timeout to clear cache entry
    setTimeout(() => {
      this.contentCache.delete(key);
    }, this.cacheTimeout);
  }

  private createFallbackContent(rawResponse: string, source: string, processingTime: number): MultimodalContent {
    return {
      text: [{
        content: rawResponse,
        position: 0
      }],
      images: [],
      videos: [],
      documents: [],
      metadata: {
        totalElements: 1,
        processingTime,
        source,
        confidence: 0.5 // Lower confidence for fallback
      }
    };
  }

  // Public method to clear cache
  clearCache(): void {
    this.contentCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.contentCache.size,
      timeout: this.cacheTimeout
    };
  }
}