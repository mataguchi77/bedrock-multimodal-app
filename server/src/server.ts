// Feature: multimodal-content-viewer
// Enhanced Express server with validation, error handling, and performance monitoring

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BedrockClientService } from './services/BedrockClientService';
import { SessionManagerService } from './services/SessionManagerService';
import { ErrorHandlerService } from './services/ErrorHandlerService';
import { ContentProcessorService } from './services/ContentProcessorService';
import { validateQueryInput, validateSessionId } from './utils/validation';
import { QueryRequest } from './types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize services
const errorHandler = new ErrorHandlerService();
const sessionManager = new SessionManagerService();
const contentProcessor = new ContentProcessorService(errorHandler);
const bedrockClient = new BedrockClientService(sessionManager, errorHandler);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Input validation middleware
const validateInvokeAgentRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { query, sessionId } = req.body as QueryRequest;

  // Validate query
  const queryValidation = validateQueryInput(query);
  if (!queryValidation.isValid) {
    res.status(400).json(
      errorHandler.createErrorResponse(
        errorHandler.createError('VALIDATION_ERROR', queryValidation.error!),
        sessionId
      )
    );
    return;
  }

  // Validate session ID if provided
  if (sessionId) {
    const sessionValidation = validateSessionId(sessionId);
    if (!sessionValidation.isValid) {
      res.status(400).json(
        errorHandler.createErrorResponse(
          errorHandler.createError('VALIDATION_ERROR', sessionValidation.error!),
          sessionId
        )
      );
      return;
    }
  }

  next();
};

// Performance monitoring middleware
const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Add performance data to response
  res.on('finish', () => {
    const processingTime = Date.now() - startTime;
    
    // Log slow requests (over 5 seconds)
    if (processingTime > 5000) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.path} took ${processingTime}ms`);
    }
  });
  
  next();
};

// Rate limiting (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  
  const clientData = rateLimitMap.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize rate limit data
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + RATE_WINDOW
    });
    return next();
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date()
    });
  }
  
  clientData.count++;
  next();
};

// Apply middleware to API routes
app.use('/api', performanceMonitor);
app.use('/api/invoke-agent', rateLimit);

// Routes

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const bedrockHealthy = await bedrockClient.healthCheck();
    const sessionStats = sessionManager.getSessionStats();
    const cacheStats = contentProcessor.getCacheStats();
    
    res.json({
      status: 'OK',
      timestamp: new Date(),
      services: {
        bedrock: bedrockHealthy ? 'healthy' : 'unhealthy',
        sessions: sessionStats,
        cache: cacheStats
      }
    });
  } catch (error) {
    res.status(500).json(
      errorHandler.createErrorResponse(
        errorHandler.createError('BEDROCK_SERVICE_ERROR', 'Health check failed', error as Error)
      )
    );
  }
});

// Token info endpoint for debugging
app.get('/api/token-info', (_req: Request, res: Response) => {
  try {
    const tokenInfo = (bedrockClient as any).authService.getTokenInfo();
    res.json({
      success: true,
      tokenInfo,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get token info',
      timestamp: new Date()
    });
  }
});

// Main query processing endpoint
app.post('/api/invoke-agent', validateInvokeAgentRequest, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const request: QueryRequest = req.body;
    
    // Process the query through Bedrock
    const response = await bedrockClient.invokeAgent(request);
    
    if (response.success && response.content) {
      // Check if content is already structured (has text/images/etc properties)
      let processedContent;
      
      if (typeof response.content === 'object' && 
          (response.content.text || response.content.images || response.content.documents)) {
        // Content is already structured from BedrockClientService
        processedContent = response.content;
      } else {
        // Process the content through the content processor
        processedContent = await contentProcessor.parseMultimodalResponse(
          String(response.content),
          'bedrock-agent'
        );
      }
      
      // Return structured response
      res.json({
        success: true,
        content: processedContent,
        sessionId: response.sessionId,
        timestamp: response.timestamp,
        processingTime: response.processingTime || (Date.now() - startTime)
      });
    } else {
      // Return error response
      res.status(500).json({
        ...response,
        processingTime: Date.now() - startTime
      });
    }
    
  } catch (error) {
    console.error('Error in invoke-agent endpoint:', error);
    
    res.status(500).json(
      errorHandler.createErrorResponse(
        error as Error,
        req.body.sessionId
      )
    );
  }
});

// Session management endpoints
app.post('/api/session/new', (_req: Request, res: Response) => {
  try {
    const session = sessionManager.createSession();
    res.json({
      success: true,
      session: {
        id: session.id,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    res.status(500).json(
      errorHandler.createErrorResponse(error as Error)
    );
  }
});

app.get('/api/session/:id', (req: Request, res: Response): void => {
  try {
    const sessionId = req.params.id;
    if (!sessionId) {
      res.status(400).json(
        errorHandler.createErrorResponse(
          errorHandler.createError('VALIDATION_ERROR', 'Session ID is required')
        )
      );
      return;
    }
    
    const sessionValidation = validateSessionId(sessionId);
    
    if (!sessionValidation.isValid) {
      res.status(400).json(
        errorHandler.createErrorResponse(
          errorHandler.createError('VALIDATION_ERROR', sessionValidation.error!)
        )
      );
      return;
    }
    
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND',
        timestamp: new Date()
      });
      return;
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        queryCount: session.queryCount
      }
    });
  } catch (error) {
    res.status(500).json(
      errorHandler.createErrorResponse(error as Error)
    );
  }
});

// Global error handler
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json(
    errorHandler.createErrorResponse(error)
  );
});

// Handle 404 routes
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    errorCode: 'ROUTE_NOT_FOUND',
    timestamp: new Date()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  sessionManager.destroy();
  contentProcessor.clearCache();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  sessionManager.destroy();
  contentProcessor.clearCache();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  errorHandler.handleUncaughtException(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  errorHandler.handleUnhandledRejection(reason, promise);
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`AWS Region: ${process.env.AWS_REGION || 'not configured'}`);
  });
}

// Export app for testing
export { app };