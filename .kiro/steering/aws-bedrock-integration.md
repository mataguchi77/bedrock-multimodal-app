---
inclusion: fileMatch
fileMatchPattern: '**/services/**'
---

# AWS Bedrock Integration Guidelines

This steering document provides specific guidance for integrating with AWS Bedrock services, particularly the AgentCore Gateway and multimodal content processing.

## AgentCore Gateway Integration

### JSON-RPC Protocol Standards

Always use the correct JSON-RPC 2.0 format when communicating with the AgentCore Gateway:

```typescript
// Correct JSON-RPC request format
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
```

### Authentication Best Practices

- **OAuth Token Management**: Always check token expiration before making requests
- **Automatic Refresh**: Implement token refresh 5 minutes before expiration
- **Error Handling**: Handle authentication failures gracefully with retry logic
- **Secure Storage**: Store tokens in memory only, never persist to disk

```typescript
// Good: Proper token management
async function getValidToken(): Promise<string | null> {
  if (this.currentToken && this.tokenExpiresAt) {
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    if (this.tokenExpiresAt > fiveMinutesFromNow) {
      return this.currentToken;
    }
  }
  
  // Token expired or about to expire, refresh it
  return await this.refreshToken();
}
```

### Error Handling Patterns

- **Retry Logic**: Implement exponential backoff for transient failures
- **Circuit Breaker**: Prevent cascading failures with circuit breaker pattern
- **Graceful Degradation**: Provide fallback responses when Bedrock is unavailable
- **Structured Errors**: Use consistent error codes and messages

```typescript
// Good: Comprehensive error handling
async function invokeWithRetry(query: string, sessionId: string): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < this.maxRetries; attempt++) {
    try {
      const response = await this.makeRequest(query, sessionId);
      return this.processResponse(response);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication errors
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      if (attempt < this.maxRetries - 1) {
        const delay = this.calculateBackoffDelay(attempt);
        await this.sleep(delay);
      }
    }
  }
  
  throw new BedrockServiceError(
    `Request failed after ${this.maxRetries} attempts`,
    'MAX_RETRIES_EXCEEDED',
    lastError!
  );
}
```

## Response Processing Guidelines

### Content Type Detection

Implement robust content type detection for multimodal responses:

```typescript
// Good: Comprehensive content parsing
function parseMultimodalContent(response: any): MultimodalContent {
  const content: MultimodalContent = {
    text: [],
    images: [],
    videos: [],
    documents: [],
    metadata: {}
  };
  
  if (response.result?.content && Array.isArray(response.result.content)) {
    response.result.content.forEach((item: any) => {
      switch (item.type) {
        case 'text':
          content.text?.push(item.text);
          break;
        case 'image':
          if (this.isValidImageUrl(item.url)) {
            content.images?.push({
              url: item.url,
              alt: item.alt || 'Generated image',
              caption: item.caption
            });
          }
          break;
        // Handle other content types...
      }
    });
  }
  
  return content;
}
```

### URL Validation and Security

Always validate and sanitize URLs from Bedrock responses:

```typescript
// Good: URL validation and sanitization
function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS URLs
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    // Check for allowed domains (if applicable)
    const allowedDomains = process.env.ALLOWED_IMAGE_DOMAINS?.split(',') || [];
    if (allowedDomains.length > 0 && !allowedDomains.includes(parsedUrl.hostname)) {
      return false;
    }
    
    // Check file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      parsedUrl.pathname.toLowerCase().endsWith(ext)
    );
    
    return hasValidExtension;
  } catch {
    return false;
  }
}
```

## Session Management

### Session Lifecycle

Implement proper session lifecycle management:

```typescript
// Good: Complete session management
class SessionManager {
  private sessions = new Map<string, Session>();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  createSession(): Session {
    const session: Session = {
      id: this.generateSessionId(),
      createdAt: new Date(),
      lastActivity: new Date(),
      queryCount: 0,
      context: {}
    };
    
    this.sessions.set(session.id, session);
    this.scheduleCleanup(session.id);
    
    return session;
  }
  
  updateSession(sessionId: string, updates: Partial<Session>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivity: new Date() });
      this.scheduleCleanup(sessionId); // Reset cleanup timer
    }
  }
  
  private scheduleCleanup(sessionId: string): void {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && Date.now() - session.lastActivity.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }, this.sessionTimeout);
  }
}
```

## Performance Optimization

### Caching Strategies

Implement intelligent caching for Bedrock responses:

```typescript
// Good: Response caching with TTL
class ContentCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  
  set(key: string, value: any, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + ttl,
      accessCount: 0
    };
    
    this.cache.set(key, entry);
    this.scheduleCleanup();
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    entry.accessCount++;
    return entry.value;
  }
  
  private generateCacheKey(query: string, sessionId: string): string {
    // Create deterministic cache key
    const normalizedQuery = query.trim().toLowerCase();
    return `${sessionId}:${this.hashString(normalizedQuery)}`;
  }
}
```

### Request Batching

For high-volume scenarios, implement request batching:

```typescript
// Good: Request batching for performance
class RequestBatcher {
  private pendingRequests: PendingRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchSize = 5;
  private readonly batchDelay = 100; // ms
  
  async addRequest(query: string, sessionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ query, sessionId, resolve, reject });
      
      if (this.pendingRequests.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchDelay);
      }
    });
  }
  
  private async processBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    const batch = this.pendingRequests.splice(0, this.batchSize);
    
    // Process batch requests concurrently
    const promises = batch.map(async (request) => {
      try {
        const result = await this.processIndividualRequest(request.query, request.sessionId);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    });
    
    await Promise.allSettled(promises);
  }
}
```

## Monitoring and Observability

### Metrics Collection

Implement comprehensive metrics for Bedrock integration:

```typescript
// Good: Metrics collection
class BedrockMetrics {
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private responseTimeHistogram: number[] = [];
  
  recordRequest(responseTime: number, success: boolean): void {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    this.responseTimeHistogram.push(responseTime);
    
    if (!success) {
      this.errorCount++;
    }
    
    // Keep histogram size manageable
    if (this.responseTimeHistogram.length > 1000) {
      this.responseTimeHistogram = this.responseTimeHistogram.slice(-500);
    }
  }
  
  getMetrics(): BedrockMetricsSnapshot {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      p95ResponseTime: this.calculatePercentile(this.responseTimeHistogram, 0.95),
      p99ResponseTime: this.calculatePercentile(this.responseTimeHistogram, 0.99)
    };
  }
}
```

### Health Checks

Implement comprehensive health checks:

```typescript
// Good: Health check implementation
async function healthCheck(): Promise<HealthStatus> {
  const checks: HealthCheck[] = [];
  
  // Check AgentCore Gateway connectivity
  checks.push(await this.checkGatewayHealth());
  
  // Check OAuth token validity
  checks.push(await this.checkAuthHealth());
  
  // Check session manager health
  checks.push(await this.checkSessionHealth());
  
  // Check cache health
  checks.push(await this.checkCacheHealth());
  
  const overallHealth = checks.every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
  
  return {
    status: overallHealth,
    timestamp: new Date(),
    checks,
    metrics: this.metrics.getMetrics()
  };
}
```

## Configuration Management

### Environment-Specific Configuration

Use environment-specific configuration for different deployment stages:

```typescript
// Good: Environment-aware configuration
interface BedrockConfig {
  gatewayUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  maxRetries: number;
  requestTimeout: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

function loadBedrockConfig(): BedrockConfig {
  const config: BedrockConfig = {
    gatewayUrl: process.env.BEDROCK_AGENT_CORE_GATEWAY_URL!,
    tokenUrl: process.env.COGNITO_TOKEN_URL!,
    clientId: process.env.COGNITO_CLIENT_ID!,
    clientSecret: process.env.COGNITO_CLIENT_SECRET!,
    maxRetries: parseInt(process.env.BEDROCK_MAX_RETRIES || '3'),
    requestTimeout: parseInt(process.env.BEDROCK_REQUEST_TIMEOUT || '30000'),
    cacheEnabled: process.env.BEDROCK_CACHE_ENABLED === 'true',
    cacheTTL: parseInt(process.env.BEDROCK_CACHE_TTL || '300000')
  };
  
  // Validate required configuration
  const requiredFields = ['gatewayUrl', 'tokenUrl', 'clientId', 'clientSecret'];
  for (const field of requiredFields) {
    if (!config[field as keyof BedrockConfig]) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }
  
  return config;
}
```

## Testing Guidelines

### Integration Testing

Test Bedrock integration with proper mocking:

```typescript
// Good: Integration test with proper mocking
describe('BedrockClientService Integration', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let bedrockClient: BedrockClientService;
  
  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    bedrockClient = new BedrockClientService(sessionManager, errorHandler);
  });
  
  it('should handle successful agent invocation', async () => {
    const mockResponse = {
      jsonrpc: '2.0',
      id: 'test',
      result: {
        content: [{ type: 'text', text: 'Test response' }],
        isError: false
      }
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);
    
    const result = await bedrockClient.invokeAgent({
      query: 'test query',
      sessionId: 'test-session'
    });
    
    expect(result.success).toBe(true);
    expect(result.content).toContain('Test response');
  });
  
  it('should handle authentication errors properly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    } as Response);
    
    const result = await bedrockClient.invokeAgent({
      query: 'test query',
      sessionId: 'test-session'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('authentication');
  });
});
```

---

These guidelines ensure robust, secure, and performant integration with AWS Bedrock services.