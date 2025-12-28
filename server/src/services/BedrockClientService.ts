// Feature: multimodal-content-viewer
// Enhanced Bedrock Client Service with error handling, retry logic, and streaming response processing

import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { QueryRequest, QueryResponse, BedrockAgentResponse } from '@/types';
import { SessionManagerService } from './SessionManagerService';
import { ErrorHandlerService } from './ErrorHandlerService';

export class BedrockClientService {
  private client!: BedrockAgentRuntimeClient;
  private sessionManager: SessionManagerService;
  private errorHandler: ErrorHandlerService;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  constructor(
    sessionManager: SessionManagerService,
    errorHandler: ErrorHandlerService
  ) {
    this.sessionManager = sessionManager;
    this.errorHandler = errorHandler;
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const region = process.env.AWS_REGION;
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

      if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error('Missing required AWS environment variables');
      }

      this.client = new BedrockAgentRuntimeClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } catch (error) {
      throw this.errorHandler.createError(
        'AWS_AUTH_ERROR',
        'Failed to initialize AWS Bedrock client',
        error instanceof Error ? error : new Error('Unknown initialization error')
      );
    }
  }

  async invokeAgent(request: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      // Validate AWS credentials
      await this.validateAuthentication();

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

      // Invoke Bedrock Agent with retry logic
      const response = await this.invokeWithRetry(request.query, sessionId);
      
      // Process streaming response
      const content = await this.processStreamingResponse(response);
      
      // Update session
      this.sessionManager.updateSession(sessionId, {
        lastActivity: new Date(),
        queryCount: session.queryCount + 1,
        context: { ...session.context, lastQuery: request.query }
      });

      return {
        success: true,
        content,
        sessionId,
        timestamp: new Date()
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Bedrock invocation failed after ${processingTime}ms:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        sessionId: request.sessionId || 'unknown',
        timestamp: new Date()
      };
    }
  }

  private async validateAuthentication(): Promise<void> {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw this.errorHandler.createError(
        'AWS_AUTH_ERROR',
        'AWS credentials not configured',
        new Error('Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY')
      );
    }

    if (!process.env.BEDROCK_AGENT_ID || !process.env.BEDROCK_AGENT_ALIAS_ID) {
      throw this.errorHandler.createError(
        'AWS_AUTH_ERROR',
        'Bedrock configuration incomplete',
        new Error('Missing BEDROCK_AGENT_ID or BEDROCK_AGENT_ALIAS_ID')
      );
    }
  }

  private async invokeWithRetry(query: string, sessionId: string): Promise<BedrockAgentResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const command = new InvokeAgentCommand({
          agentId: process.env.BEDROCK_AGENT_ID!,
          agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID!,
          sessionId,
          inputText: query,
        });

        const response = await this.client.send(command);
        
        return {
          completion: response.completion!,
          sessionId: response.sessionId || sessionId
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(`Bedrock invocation attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
          await this.sleep(delay);
        }
      }
    }

    throw this.errorHandler.createError(
      'BEDROCK_SERVICE_ERROR',
      `Bedrock invocation failed after ${this.maxRetries} attempts`,
      lastError!
    );
  }

  private async processStreamingResponse(response: BedrockAgentResponse): Promise<any> {
    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          chunks.push(chunk.chunk.bytes);
        }
      }

      if (chunks.length === 0) {
        throw new Error('No content received from Bedrock Agent');
      }

      const responseText = Buffer.concat(chunks).toString('utf-8');
      
      // Basic validation of response
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response received from Bedrock Agent');
      }

      return responseText;

    } catch (error) {
      throw this.errorHandler.createError(
        'CONTENT_PARSE_ERROR',
        'Failed to process streaming response',
        error instanceof Error ? error : new Error('Unknown streaming error')
      );
    }
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
      await this.validateAuthentication();
      return true;
    } catch {
      return false;
    }
  }
}