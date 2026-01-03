// Feature: multimodal-content-viewer
// Frontend type definitions

export interface QueryRequest {
  query: string;
  sessionId?: string;
}

export interface QueryResponse {
  success: boolean;
  content?: MultimodalContent;
  sessionId: string;
  error?: string;
  timestamp: string;
  processingTime?: number;
}

export interface MultimodalContent {
  text: TextContent[];
  images: ImageContent[];
  videos: VideoContent[];
  documents: DocumentContent[];
  metadata: ContentMetadata;
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
}

export interface VideoContent {
  url: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  position: number;
}

export interface DocumentContent {
  url: string;
  title: string;
  type: 'pdf' | 'doc' | 'other';
  size?: number;
  position: number;
}

export interface ContentMetadata {
  totalElements: number;
  processingTime: number;
  source: string;
  confidence?: number;
}

export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  color?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Component Props
export interface QueryInterfaceProps {
  onSubmit: (query: string) => void;
  loading: boolean;
  onClear?: () => void;
}

export interface ContentViewerProps {
  content: MultimodalContent | null;
  loading: boolean;
  error?: string | null;
}

export interface SessionManagerProps {
  onSessionChange: (sessionId: string) => void;
  currentSessionId?: string;
}