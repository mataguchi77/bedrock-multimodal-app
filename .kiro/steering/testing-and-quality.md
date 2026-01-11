---
inclusion: always
---

# Testing and Quality Assurance Guidelines

This steering document defines comprehensive testing strategies and quality assurance practices for the AWS Bedrock Multimodal Content Viewer project.

## Property-Based Testing Framework

### Fast-check Integration

Use Fast-check for comprehensive property-based testing with minimum 100 iterations:

```typescript
// Good: Property-based test with comprehensive coverage
import fc from 'fast-check';

describe('Input Validation Properties', () => {
  it('should validate query input consistently', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 0, maxLength: 3000 }),
      (query) => {
        const result = validateQueryInput(query);
        
        // Property: Empty or whitespace-only strings are invalid
        if (!query.trim()) {
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('required');
        }
        
        // Property: Strings over 2000 chars are invalid
        else if (query.length > 2000) {
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('character limit');
        }
        
        // Property: Valid strings pass validation
        else {
          expect(result.isValid).toBe(true);
          expect(result.error).toBeNull();
        }
      }
    ), { numRuns: 100 });
  });
});
```

### Test Data Generators

Create custom generators for domain-specific testing:

```typescript
// Good: Custom generators for multimodal content
const multimodalContentGenerator = fc.record({
  text: fc.array(fc.string({ minLength: 1, maxLength: 1000 })),
  images: fc.array(fc.record({
    url: fc.webUrl({ validSchemes: ['https'] }),
    alt: fc.string({ minLength: 1, maxLength: 100 }),
    caption: fc.option(fc.string({ maxLength: 200 }))
  })),
  videos: fc.array(fc.record({
    url: fc.webUrl({ validSchemes: ['https'] }),
    title: fc.option(fc.string({ maxLength: 100 }))
  })),
  documents: fc.array(fc.record({
    url: fc.webUrl({ validSchemes: ['https'] }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom('pdf', 'doc', 'other')
  }))
});
```
## Unit Testing Standards

### Service Layer Testing

Test all service methods with comprehensive error scenarios:

```typescript
// Good: Comprehensive service testing
describe('BedrockClientService', () => {
  let service: BedrockClientService;
  let mockSessionManager: jest.Mocked<SessionManagerService>;
  let mockErrorHandler: jest.Mocked<ErrorHandlerService>;
  
  beforeEach(() => {
    mockSessionManager = createMockSessionManager();
    mockErrorHandler = createMockErrorHandler();
    service = new BedrockClientService(mockSessionManager, mockErrorHandler);
  });
  
  describe('invokeAgent', () => {
    it('should handle successful invocation', async () => {
      // Arrange
      const mockResponse = createMockBedrockResponse();
      jest.spyOn(global, 'fetch').mockResolvedValue(
        createMockFetchResponse(mockResponse)
      );
      
      // Act
      const result = await service.invokeAgent({
        query: 'test query',
        sessionId: 'test-session'
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(mockSessionManager.updateSession).toHaveBeenCalled();
    });
    
    it('should handle authentication failures', async () => {
      // Test authentication error scenarios
    });
    
    it('should implement retry logic for transient failures', async () => {
      // Test retry mechanism
    });
  });
});
```

### Component Testing Best Practices

Use React Testing Library with comprehensive user interaction testing:

```typescript
// Good: User-centric component testing
describe('ContentViewer Component', () => {
  it('should render multimodal content correctly', () => {
    const mockContent = {
      text: ['Sample text content'],
      images: [{ url: 'https://example.com/image.jpg', alt: 'Test image' }],
      videos: [],
      documents: []
    };
    
    render(<ContentViewer content={mockContent} loading={false} />);
    
    expect(screen.getByText('Sample text content')).toBeInTheDocument();
    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });
  
  it('should handle image fullscreen interaction', async () => {
    const user = userEvent.setup();
    const mockContent = {
      text: [],
      images: [{ url: 'https://example.com/image.jpg', alt: 'Test image' }],
      videos: [],
      documents: []
    };
    
    render(<ContentViewer content={mockContent} loading={false} />);
    
    const image = screen.getByAltText('Test image');
    await user.click(image);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```
## Integration Testing

### API Integration Testing

Test complete API workflows with proper mocking:

```typescript
// Good: End-to-end API integration testing
describe('API Integration', () => {
  let server: SetupServer;
  
  beforeAll(() => {
    server = setupServer(
      rest.post('/api/invoke-agent', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          content: { text: ['Mock response'] },
          sessionId: 'mock-session',
          timestamp: new Date().toISOString()
        }));
      })
    );
    server.listen();
  });
  
  afterAll(() => server.close());
  
  it('should complete full query workflow', async () => {
    render(<App />);
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    await userEvent.type(textarea, 'Test query');
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Mock response')).toBeInTheDocument();
    });
  });
});
```

### Error Scenario Testing

Test all error conditions and recovery mechanisms:

```typescript
// Good: Comprehensive error scenario testing
describe('Error Handling', () => {
  it('should handle network failures gracefully', async () => {
    server.use(
      rest.post('/api/invoke-agent', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );
    
    render(<App />);
    
    await userEvent.type(screen.getByRole('textbox'), 'Test query');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
  
  it('should handle authentication errors', async () => {
    server.use(
      rest.post('/api/invoke-agent', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
      })
    );
    
    // Test authentication error handling
  });
});
```
## Performance Testing

### Load Testing Guidelines

Implement performance testing for critical paths:

```typescript
// Good: Performance testing with timing assertions
describe('Performance Tests', () => {
  it('should process queries within acceptable time limits', async () => {
    const startTime = performance.now();
    
    const result = await bedrockClient.invokeAgent({
      query: 'Performance test query',
      sessionId: 'perf-test-session'
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000); // 2 second limit
  });
  
  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      bedrockClient.invokeAgent({
        query: `Concurrent query ${i}`,
        sessionId: `session-${i}`
      })
    );
    
    const startTime = performance.now();
    const results = await Promise.all(concurrentRequests);
    const endTime = performance.now();
    
    expect(results.every(r => r.success)).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // 5 second limit for 10 concurrent
  });
});
```

### Memory Leak Testing

Test for memory leaks in long-running scenarios:

```typescript
// Good: Memory leak detection
describe('Memory Management', () => {
  it('should not leak memory during session lifecycle', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create and destroy many sessions
    for (let i = 0; i < 100; i++) {
      const session = sessionManager.createSession();
      await sessionManager.updateSession(session.id, { queryCount: 1 });
      sessionManager.destroySession(session.id);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```
## Code Quality Standards

### Static Analysis and Linting

Configure comprehensive linting and static analysis:

```json
// Good: ESLint configuration for TypeScript
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off"
  }
}
```

### Code Coverage Requirements

Maintain high code coverage with meaningful tests:

```json
// Good: Jest coverage configuration
{
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/index.tsx"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Type Safety Enforcement

Use strict TypeScript configuration:

```json
// Good: Strict TypeScript configuration
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Continuous Integration

### Automated Testing Pipeline

Implement comprehensive CI/CD testing:

```yaml
# Good: GitHub Actions workflow
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd client && npm ci
          cd ../server && npm ci
      
      - name: Run linting
        run: |
          npm run lint
          cd client && npm run lint
          cd ../server && npm run lint
      
      - name: Run type checking
        run: |
          cd client && npm run type-check
          cd ../server && npm run type-check
      
      - name: Run tests
        run: |
          npm run test:coverage
          cd client && npm run test:coverage
          cd ../server && npm run test:coverage
      
      - name: Run property-based tests
        run: |
          cd client && npm run test:properties
          cd ../server && npm run test:properties
```

---

These guidelines ensure comprehensive testing coverage and high code quality standards.