// Happy path tests for backend services

import { ContentProcessorService } from '../src/services/ContentProcessorService';
import { SessionManagerService } from '../src/services/SessionManagerService';
import { ErrorHandlerService } from '../src/services/ErrorHandlerService';

describe('ContentProcessorService - Happy Path', () => {
  let contentProcessor: ContentProcessorService;
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
    contentProcessor = new ContentProcessorService(errorHandler);
  });

  afterEach(() => {
    contentProcessor.destroy();
  });

  it('should parse simple text content', async () => {
    const rawResponse = 'This is a simple text response';
    const result = await contentProcessor.parseMultimodalResponse(rawResponse);

    expect(result.text).toHaveLength(1);
    expect(result.text[0]?.content).toBe('This is a simple text response');
    expect(result.images).toHaveLength(0);
  });

  it('should parse text with image URL', async () => {
    const rawResponse = 'Here is an image: https://example.com/image.jpg';
    const result = await contentProcessor.parseMultimodalResponse(rawResponse);

    expect(result.images).toHaveLength(1);
    expect(result.images[0]?.url).toBe('https://example.com/image.jpg');
  });

  it('should parse multiple lines of text', async () => {
    const rawResponse = 'Line 1\nLine 2\nLine 3';
    const result = await contentProcessor.parseMultimodalResponse(rawResponse);

    expect(result.text).toHaveLength(3);
    expect(result.text[0]?.content).toBe('Line 1');
    expect(result.text[1]?.content).toBe('Line 2');
    expect(result.text[2]?.content).toBe('Line 3');
  });

  it('should cache parsed content', async () => {
    const rawResponse = 'Cached content test';
    
    const result1 = await contentProcessor.parseMultimodalResponse(rawResponse);
    const result2 = await contentProcessor.parseMultimodalResponse(rawResponse);

    expect(result1.text[0]?.content).toBe(result2.text[0]?.content);
    expect(result2.metadata?.cached).toBe(true);
  });

  it('should clear cache successfully', () => {
    contentProcessor.clearCache();
    const stats = contentProcessor.getCacheStats();
    
    expect(stats.size).toBe(0);
  });
});

describe('SessionManagerService - Happy Path', () => {
  let sessionManager: SessionManagerService;

  beforeEach(() => {
    sessionManager = new SessionManagerService();
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  it('should create a new session', () => {
    const session = sessionManager.createSession();

    expect(session.id).toBeDefined();
    expect(session.id).toContain('session_');
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.queryCount).toBe(0);
  });

  it('should retrieve an existing session', () => {
    const session = sessionManager.createSession();
    const retrieved = sessionManager.getSession(session.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(session.id);
  });

  it('should update session successfully', () => {
    const session = sessionManager.createSession();
    const updated = sessionManager.updateSession(session.id, { queryCount: 5 });

    expect(updated).not.toBeNull();
    expect(updated?.queryCount).toBe(5);
  });

  it('should delete session successfully', () => {
    const session = sessionManager.createSession();
    const deleted = sessionManager.deleteSession(session.id);

    expect(deleted).toBe(true);
    expect(sessionManager.getSession(session.id)).toBeNull();
  });

  it('should create or recover session', () => {
    const session1 = sessionManager.createSession();
    const session2 = sessionManager.createOrRecoverSession(session1.id);

    expect(session2.id).toBe(session1.id);
  });

  it('should get session statistics', () => {
    sessionManager.createSession();
    sessionManager.createSession();
    
    const stats = sessionManager.getSessionStats();

    expect(stats.totalSessions).toBe(2);
    expect(stats.activeSessions).toBe(2);
  });
});

describe('ErrorHandlerService - Happy Path', () => {
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = new ErrorHandlerService();
  });

  it('should create validation error', () => {
    const error = errorHandler.createError('VALIDATION_ERROR', 'Validation failed');

    expect(error.message).toBe('Validation failed');
    expect((error as any).errorType).toBe('VALIDATION_ERROR');
  });

  it('should create network error', () => {
    const error = errorHandler.createError('NETWORK_TIMEOUT', 'Network timeout');

    expect(error.message).toBe('Network timeout');
    expect((error as any).errorType).toBe('NETWORK_TIMEOUT');
  });

  it('should format user-friendly error messages', () => {
    const error = errorHandler.createError('BEDROCK_SERVICE_ERROR', 'Service unavailable');
    const userMessage = errorHandler.formatUserMessage(error);

    expect(userMessage).toBeDefined();
    expect(userMessage.length).toBeGreaterThan(0);
  });

  it('should determine if error is retryable', () => {
    const retryableError = errorHandler.createError('NETWORK_TIMEOUT', 'Timeout');
    const nonRetryableError = errorHandler.createError('VALIDATION_ERROR', 'Invalid input');

    expect(errorHandler.isRetryableError(retryableError)).toBe(true);
    expect(errorHandler.isRetryableError(nonRetryableError)).toBe(false);
  });

  it('should create error response for API', () => {
    const error = errorHandler.createError('VALIDATION_ERROR', 'Invalid query');
    const response = errorHandler.createErrorResponse(error, 'test-session');

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.errorCode).toBe('VALIDATION_ERROR');
    expect(response.sessionId).toBe('test-session');
  });
});
