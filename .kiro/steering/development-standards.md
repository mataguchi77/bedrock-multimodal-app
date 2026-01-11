---
inclusion: always
---

# Development Standards and Best Practices

This steering document defines the development standards, coding practices, and architectural principles for the AWS Bedrock Multimodal Content Viewer project.

## Code Quality Standards

### TypeScript Best Practices

- **Strict Type Safety**: Always use strict TypeScript configuration with `noImplicitAny`, `noImplicitReturns`, and `exactOptionalPropertyTypes`
- **Interface-First Design**: Define interfaces before implementation for all data structures
- **Explicit Return Types**: Always specify return types for functions and methods
- **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`) operators
- **Generic Types**: Leverage generics for reusable components and services

```typescript
// Good: Explicit typing and error handling
interface QueryRequest {
  query: string;
  sessionId?: string;
}

async function processQuery(request: QueryRequest): Promise<QueryResponse> {
  const validation = validateQueryInput(request.query);
  if (!validation.isValid) {
    throw new ValidationError(validation.error!);
  }
  // Implementation...
}

// Avoid: Implicit any types and missing error handling
function processQuery(request) {
  // Implementation without validation...
}
```

### Error Handling Patterns

- **Structured Error Types**: Use custom error classes with specific error codes
- **Error Boundaries**: Implement React Error Boundaries for frontend error handling
- **Graceful Degradation**: Always provide fallback behavior for failed operations
- **Retry Logic**: Implement exponential backoff for transient failures
- **User-Friendly Messages**: Convert technical errors to user-understandable messages

```typescript
// Good: Structured error handling
class BedrockServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'BedrockServiceError';
  }
}

// Error handling with retry logic
async function invokeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
  
  throw new BedrockServiceError(
    `Operation failed after ${maxRetries} attempts`,
    'MAX_RETRIES_EXCEEDED',
    lastError!
  );
}
```

## Architecture Principles

### Service-Oriented Design

- **Single Responsibility**: Each service handles one specific domain
- **Dependency Injection**: Use constructor injection for service dependencies
- **Interface Segregation**: Define focused interfaces for each service capability
- **Loose Coupling**: Services communicate through well-defined interfaces

### Component Architecture (Frontend)

- **Functional Components**: Use React functional components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Props Interface**: Define explicit TypeScript interfaces for all component props
- **Memoization**: Use `React.memo`, `useMemo`, and `useCallback` for performance optimization

```typescript
// Good: Well-structured component with proper typing
interface QueryInterfaceProps {
  onSubmit: (query: string) => void;
  loading: boolean;
  onClear?: () => void;
}

const QueryInterface: React.FC<QueryInterfaceProps> = React.memo(({ 
  onSubmit, 
  loading, 
  onClear 
}) => {
  const [query, setQuery] = useState('');
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSubmit(query.trim());
    }
  }, [query, loading, onSubmit]);
  
  // Component implementation...
});
```

## Testing Standards

### Property-Based Testing

- **Use Fast-check**: Leverage property-based testing for comprehensive validation
- **Test Properties, Not Examples**: Focus on invariants and properties rather than specific test cases
- **Edge Case Coverage**: Ensure property tests cover boundary conditions
- **Minimum 100 Iterations**: Run property tests with sufficient iterations for confidence

```typescript
// Good: Property-based test for input validation
import fc from 'fast-check';

describe('Input Validation Properties', () => {
  it('should accept valid queries under character limit', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 2000 }),
      (query) => {
        const result = validateQueryInput(query.trim());
        expect(result.isValid).toBe(query.trim().length > 0);
      }
    ), { numRuns: 100 });
  });
  
  it('should reject queries over character limit', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 2001, maxLength: 3000 }),
      (query) => {
        const result = validateQueryInput(query);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('character limit');
      }
    ), { numRuns: 100 });
  });
});
```

### Integration Testing

- **End-to-End Scenarios**: Test complete user workflows
- **API Contract Testing**: Validate API request/response contracts
- **Error Scenario Testing**: Test failure modes and recovery
- **Performance Testing**: Validate response times and resource usage

## Security Guidelines

### Input Validation

- **Sanitize All Inputs**: Validate and sanitize all user inputs
- **Character Limits**: Enforce reasonable character limits on text inputs
- **Content Filtering**: Filter potentially harmful content
- **SQL Injection Prevention**: Use parameterized queries (if applicable)

### Authentication and Authorization

- **OAuth 2.0 Standard**: Follow OAuth 2.0 best practices
- **Token Security**: Store tokens securely and rotate regularly
- **Environment Variables**: Never commit credentials to version control
- **Least Privilege**: Grant minimum necessary permissions

### Data Protection

- **HTTPS Only**: All communications must use HTTPS
- **Sensitive Data Handling**: Encrypt sensitive data at rest and in transit
- **Logging Security**: Avoid logging sensitive information
- **Error Message Security**: Don't expose internal details in error messages

## Performance Standards

### Frontend Performance

- **Bundle Size**: Keep JavaScript bundles under 250KB gzipped
- **Lazy Loading**: Implement lazy loading for images and components
- **Memoization**: Use React optimization techniques appropriately
- **Accessibility**: Maintain WCAG 2.1 AA compliance

### Backend Performance

- **Response Times**: API responses should be under 2 seconds for 95th percentile
- **Memory Usage**: Monitor and optimize memory consumption
- **Caching**: Implement appropriate caching strategies
- **Database Optimization**: Optimize queries and use appropriate indexes

## Documentation Standards

### Code Documentation

- **JSDoc Comments**: Document all public functions and classes
- **README Files**: Maintain up-to-date README files for each major component
- **API Documentation**: Document all API endpoints with examples
- **Architecture Diagrams**: Maintain current architecture documentation

### Commit Standards

- **Conventional Commits**: Use conventional commit format
- **Descriptive Messages**: Write clear, descriptive commit messages
- **Atomic Commits**: Make small, focused commits
- **Branch Naming**: Use descriptive branch names with prefixes (feature/, fix/, docs/)

```bash
# Good commit messages
feat(auth): implement OAuth token refresh mechanism
fix(validation): handle edge case in query character counting
docs(api): update API testing guide with troubleshooting steps
test(properties): add property-based tests for content parsing

# Branch naming examples
feature/enhanced-session-manager
fix/json-rpc-parsing-error
docs/api-testing-guide
test/property-based-validation
```

## Development Workflow

### Code Review Process

- **Pull Request Reviews**: All code changes require review
- **Automated Testing**: All tests must pass before merge
- **Code Quality Checks**: Use linting and formatting tools
- **Security Scanning**: Run security scans on dependencies

### Continuous Integration

- **Automated Testing**: Run all tests on every commit
- **Build Verification**: Ensure builds succeed on all target environments
- **Dependency Scanning**: Check for security vulnerabilities
- **Performance Monitoring**: Track performance metrics over time

## Environment Management

### Development Environment

- **Local Development**: Use consistent development environment setup
- **Environment Variables**: Use `.env` files for local configuration
- **Hot Reloading**: Enable hot reloading for efficient development
- **Debug Tools**: Configure appropriate debugging tools

### Production Environment

- **Environment Separation**: Maintain separate environments for dev/staging/prod
- **Configuration Management**: Use environment-specific configuration
- **Monitoring**: Implement comprehensive monitoring and alerting
- **Backup and Recovery**: Maintain backup and recovery procedures

## Compliance and Standards

### Accessibility

- **WCAG 2.1 AA**: Meet Web Content Accessibility Guidelines
- **Keyboard Navigation**: Ensure full keyboard accessibility
- **Screen Reader Support**: Provide appropriate ARIA labels
- **Color Contrast**: Maintain sufficient color contrast ratios

### Browser Support

- **Modern Browsers**: Support latest 2 versions of major browsers
- **Progressive Enhancement**: Ensure basic functionality without JavaScript
- **Responsive Design**: Support mobile and desktop viewports
- **Performance**: Optimize for various device capabilities

---

These standards ensure consistent, high-quality development practices across the AWS Bedrock Multimodal Content Viewer project.