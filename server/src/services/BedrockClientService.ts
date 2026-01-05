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

      // Get or create session
      const sessionId = request.sessionId || this.sessionManager.createSession().id;
      const session = this.sessionManager.getSession(sessionId);
      
      if (!session) {
        throw this.errorHandler.createError(
          'SESSION_ERROR',
          'Invalid session ID',
          new Error(`Session ${sessionId} not found`)
        );
      }

      // Invoke Bedrock Agent via Core Gateway with retry logic
      const response = await this.invokeWithRetry(request.query, sessionId);
      
      // Update session
      this.sessionManager.updateSession(sessionId, {
        queryCount: session.queryCount + 1,
        context: { ...session.context, lastQuery: request.query }
      });

      return {
        success: true,
        content: response,
        sessionId,
        timestamp: new Date()
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

  private async invokeWithRetry(query: string, sessionId: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // JSON-RPC format required by AgentCore Gateway
        const requestBody = {
          jsonrpc: "2.0",
          id: `invoke_${Date.now()}`,
          method: "tools/call",
          params: {
            name: "multimodal-agent___invoke_bedrock_agent",
            arguments: {
              inputText: query,
              sessionId: sessionId
            }
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
            // Extract text content from the content array
            const textContent = data.result.content
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text)
              .join('\n');
            console.log('Extracted text content:', textContent);
            return textContent || JSON.stringify(data.result);
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