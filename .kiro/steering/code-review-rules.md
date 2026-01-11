---
inclusion: manual
---

# Code Review Rules and Checklist

This document provides mandatory rules and checklists for code reviews in the AWS Bedrock Multimodal Content Viewer project.

## Mandatory Review Checklist

### TypeScript and Type Safety
- [ ] All functions have explicit return types
- [ ] No `any` types used (use proper interfaces instead)
- [ ] All props interfaces are properly documented with JSDoc
- [ ] Strict null checks are satisfied (no potential undefined access)
- [ ] Generic types are used appropriately for reusable components

### AWS Bedrock Integration
- [ ] JSON-RPC 2.0 format is used for all gateway requests
- [ ] OAuth tokens are checked for expiration before use
- [ ] Retry logic with exponential backoff is implemented
- [ ] Error responses include proper error codes and user-friendly messages
- [ ] All URLs from Bedrock responses are validated and sanitized

### React Components
- [ ] Components use React.memo when appropriate
- [ ] Event handlers are wrapped in useCallback
- [ ] Expensive calculations are wrapped in useMemo
- [ ] Components have proper accessibility attributes (ARIA labels, roles)
- [ ] Keyboard navigation is supported where applicable

### Error Handling
- [ ] All async operations have proper try-catch blocks
- [ ] Errors are logged with sufficient context
- [ ] User-facing error messages are helpful and actionable
- [ ] Error boundaries are implemented for component trees
- [ ] Graceful degradation is provided for failed operations

### Testing Requirements
- [ ] Property-based tests are included for validation logic
- [ ] Component tests cover user interactions, not implementation details
- [ ] Integration tests cover complete workflows
- [ ] Error scenarios are tested comprehensively
- [ ] Performance tests are included for critical paths

### Security Checklist
- [ ] All user inputs are validated and sanitized
- [ ] No sensitive data is logged or exposed in error messages
- [ ] HTTPS is enforced for all external communications
- [ ] Authentication tokens are stored securely (memory only)
- [ ] Rate limiting is implemented for API endpoints

## Automatic Rejection Criteria

Code reviews must be rejected if any of these conditions are met:

1. **Security Violations**
   - Hardcoded credentials or API keys
   - SQL injection vulnerabilities
   - XSS vulnerabilities in user input handling
   - Insecure HTTP communications

2. **Type Safety Violations**
   - Use of `any` type without justification
   - Missing return type annotations
   - Potential null/undefined access without checks

3. **Performance Issues**
   - Memory leaks in component lifecycle
   - Unnecessary re-renders without memoization
   - Blocking operations on main thread
   - Missing lazy loading for large content

4. **Accessibility Violations**
   - Missing ARIA labels for interactive elements
   - Insufficient color contrast ratios
   - No keyboard navigation support
   - Missing semantic HTML structure

## Review Process

### Before Submitting PR
1. Run all linting and type checking locally
2. Execute full test suite including property-based tests
3. Verify build succeeds without warnings
4. Test accessibility with screen reader
5. Check performance with browser dev tools

### During Review
1. Verify all checklist items are satisfied
2. Test the feature manually in browser
3. Review test coverage and quality
4. Check for potential edge cases
5. Validate error handling scenarios

### Approval Criteria
- All automated checks pass (CI/CD pipeline)
- Manual testing confirms expected behavior
- Code follows established patterns and conventions
- Documentation is updated if needed
- Performance impact is acceptable

---

These rules ensure consistent code quality and maintainability across the project.