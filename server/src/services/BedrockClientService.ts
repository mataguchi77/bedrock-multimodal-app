// Feature: multimodal-content-viewer
// Enhanced Bedrock Client Service using Bedrock Agent Core Gateway

import { QueryRequest, QueryResponse } from '../types';
import { SessionManagerService } from './SessionManagerService';
import { ErrorHandlerService } from './ErrorHandlerService';
import { AuthService } from './AuthService';

export class BedrockClientService {
  private sessionManager: SessionManagerService;
  private errorHandler: ErrorHandlerService;
  private authService: AuthService;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private gatewayUrl!: string;

  constructor(
    sessionManager: SessionManagerService,
    errorHandler: ErrorHandlerService
  ) {
    this.sessionManager = sessionManager;
    this.errorHandler = errorHandler;
    this.authService = new AuthService();
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const gatewayUrl = process.env.BEDROCK_AGENT_CORE_GATEWAY_URL;

      if (!gatewayUrl) {
        throw new Error('Missing required BEDROCK_AGENT_CORE_GATEWAY_URL environment variable');
      }

      this.gatewayUrl = gatewayUrl;
    } catch (error) {
      throw this.errorHandler.createError(
        'AWS_AUTH_ERROR',
        'Failed to initialize Bedrock Agent Core Gateway client',
        error instanceof Error ? error : new Error('Unknown initialization error')
      );
    }
  }

  async invokeAgent(request: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      await this.validateConfiguration();

      // For first request without sessionId, let Bedrock create the session
      // For subsequent requests, use the provided sessionId
      let sessionId: string = request.sessionId || '';
      let session = sessionId ? this.sessionManager.getSession(sessionId) : null;
      
      // If no session exists locally, create one
      if (!session) {
        const newSession = this.sessionManager.createSession();
        sessionId = newSession.id;
        session = newSession;
      }

      // Invoke Bedrock Agent via Core Gateway with retry logic
      // Note: For first call, we may not send sessionId to let Bedrock create it
      const response = await this.invokeWithRetry(request.query, sessionId, !request.sessionId);
      
      // Update session
      this.sessionManager.updateSession(sessionId, {
        queryCount: session.queryCount + 1,
        context: { ...session.context, lastQuery: request.query }
      });

      return {
        success: true,
        content: response,
        sessionId: sessionId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Bedrock Agent Core Gateway invocation failed after ${processingTime}ms:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        sessionId: request.sessionId || 'unknown',
        timestamp: new Date()
      };
    }
  }

  private async validateConfiguration(): Promise<void> {
    if (!process.env.BEDROCK_AGENT_CORE_GATEWAY_URL) {
      throw this.errorHandler.createError(
        'AWS_AUTH_ERROR',
        'Bedrock Agent Core Gateway URL not configured',
        new Error('Missing BEDROCK_AGENT_CORE_GATEWAY_URL environment variable')
      );
    }
  }

  private async invokeWithRetry(query: string, sessionId: string, isFirstCall: boolean = false): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // JSON-RPC format required by AgentCore Gateway
        const requestArguments: any = {
          inputText: query
        };
        
        // Only include sessionId if it's not the first call
        // Let Bedrock create the session on first call
        if (!isFirstCall && sessionId) {
          requestArguments.sessionId = sessionId;
        }
        
        const requestBody = {
          jsonrpc: "2.0",
          id: `invoke_${Date.now()}`,
          method: "tools/call",
          params: {
            name: "multimodal-agent___invoke_bedrock_agent",
            arguments: requestArguments
          }
        };

        console.log('Sending request to AgentCore Gateway:', JSON.stringify(requestBody, null, 2));

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Get valid token (auto-refreshes if needed)
        const token = await this.authService.getValidToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Using OAuth token:', token.substring(0, 20) + '...');
        } else {
          console.warn('No OAuth token available');
        }

        console.log('Gateway URL:', this.gatewayUrl);

        const response = await fetch(this.gatewayUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        console.log('Gateway response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Gateway error response:', errorText);
          throw new Error(`Bedrock Agent Core Gateway request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as any;
        console.log('Gateway response data:', JSON.stringify(data, null, 2));
        
        // Handle JSON-RPC response format
        if (data.error) {
          console.error('JSON-RPC error:', data.error);
          throw new Error(`Gateway error: ${data.error.message} (code: ${data.error.code})`);
        }
        
        if (data.result) {
          // Extract content from JSON-RPC result
          if (data.result.content && Array.isArray(data.result.content)) {
            // Process all content items (text, images, etc.)
            const processedContent: any = {
              text: [],
              images: [],
              documents: [],
              videos: []
            };
            
            data.result.content.forEach((item: any) => {
              if (item.type === 'text') {
                let text = item.text;
                
                // Try to parse if it looks like JSON
                if (typeof text === 'string' && text.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(text);
                    
                    // Check for nested body structure (Lambda response format)
                    if (parsed.statusCode && parsed.body) {
                      const bodyParsed = JSON.parse(parsed.body);
                      if (bodyParsed.response) {
                        text = bodyParsed.response.trim();
                      }
                    }
                    
                    // Check for direct response field
                    if (parsed.response) {
                      text = parsed.response.trim();
                    }
                  } catch (e) {
                    // If parsing fails, use original text
                    console.log('Could not parse nested JSON, using original text');
                  }
                }
                
                processedContent.text.push(text);
              } else if (item.type === 'image') {
                // Handle image content
                processedContent.images.push({
                  url: item.source?.url || item.url,
                  alt: item.alt || 'Image from Bedrock',
                  caption: item.caption
                });
              } else if (item.type === 'document') {
                // Handle document content
                processedContent.documents.push({
                  url: item.source?.url || item.url,
                  title: item.title || 'Document',
                  type: item.documentType || 'unknown'
                });
              }
            });
            
            console.log('Processed content:', JSON.stringify(processedContent, null, 2));
            
            // Return structured content if we have multiple types, otherwise just text
            if (processedContent.images.length > 0 || processedContent.documents.length > 0 || processedContent.videos.length > 0) {
              return processedContent;
            } else {
              return processedContent.text.join('\n');
            }
          }
          console.log('Returning full result:', JSON.stringify(data.result));
          return JSON.stringify(data.result);
        }
        
        // Fallback to entire response
        console.log('Fallback: returning entire response');
        return JSON.stringify(data);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(`Bedrock Agent Core Gateway request attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
          await this.sleep(delay);
        }
      }
    }

    throw this.errorHandler.createError(
      'BEDROCK_SERVICE_ERROR',
      `Bedrock Agent Core Gateway request failed after ${this.maxRetries} attempts`,
      lastError!
    );
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.floor(exponentialDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method for monitoring
  async healthCheck(): Promise<boolean> {
    try {
      await this.validateConfiguration();
      
      // Optional: Make a simple test request to verify gateway is accessible
      const testResponse = await fetch(this.gatewayUrl, {
        method: 'OPTIONS', // Use OPTIONS for health check to avoid actual invocation
      });
      
      return testResponse.status < 500; // Accept any non-server-error status
    } catch {
      return false;
    }
  }
}