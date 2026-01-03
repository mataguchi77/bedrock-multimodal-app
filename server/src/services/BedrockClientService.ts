// Feature: multimodal-content-viewer
// Enhanced Bedrock Client Service using Bedrock Agent Core Gateway

import { QueryRequest, QueryResponse } from '@/types';
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
        // Simplified request body - Lambda handles AWS configuration
        const requestBody = {
          sessionId,
          inputText: query,
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Get valid token (auto-refreshes if needed)
        const token = await this.authService.getValidToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(this.gatewayUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Bedrock Agent Core Gateway request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        
        // Handle different response formats from the gateway
        if (data.body) {
          // If response is wrapped in API Gateway format
          const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          return parsedBody.response || parsedBody.content || parsedBody.output || JSON.stringify(parsedBody);
        } else if (data.response || data.content || data.output) {
          // Direct response format
          return data.response || data.content || data.output;
        } else {
          // Fallback to entire response
          return JSON.stringify(data);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
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