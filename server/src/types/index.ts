// Feature: multimodal-content-viewer
// Type definitions for the Multimodal Content Viewer application

export interface QueryRequest {
  query: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface QueryResponse {
  success: boolean;
  content?: string | MultimodalContent;
  sessionId: string;
  error?: string;
  timestamp: Date;
  processingTime?: number;
}

export interface MultimodalContent {
  text: TextContent[];
  images: ImageContent[];
  documents?: DocumentContent[];
  videos?: VideoContent[];
  metadata: ContentMetadata;
}

export interface DocumentContent {
  url: string;
  title: string;
  type: string;
  position?: number;
}

export interface VideoContent {
  url: string;
  title?: string;
  thumbnail?: string;
  position?: number;
}

export interface TextContent {
  content: string;
  formatting?: TextFormatting;
  position: number;
}

export interface ImageContent {
  url: string;
  alt: string;
  caption?: string;
  dimensions?: { width: number; height: number };
  position: number;
  lazyLoad?: boolean;
  loaded?: boolean;
}

export interface ContentMetadata {
  totalElements: number;
  processingTime: number;
  source: string;
  confidence?: number;
  cached?: boolean;
}

export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  queryCount: number;
  context: Record<string, any>;
}

export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  color?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  timestamp: Date;
  sessionId?: string;
}

// Remove BedrockAgentResponse since we're using API Gateway
export interface ContentElement {
  type: 'text' | 'image';
  content: TextContent | ImageContent;
  position: number;
}

// Error types for structured error handling
export type ErrorType = 
  | 'AWS_AUTH_ERROR'
  | 'NETWORK_TIMEOUT'
  | 'CONTENT_PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'SESSION_ERROR'
  | 'BEDROCK_SERVICE_ERROR';

export interface ErrorRecoveryStrategy {
  retryable: boolean;
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  fallbackAction: 'display_error' | 'retry_with_fallback' | 'graceful_degradation';
  userNotification: boolean;
}