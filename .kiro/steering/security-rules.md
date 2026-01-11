---
inclusion: always
---

# Security Rules and Requirements

This document defines mandatory security rules and requirements for the AWS Bedrock Multimodal Content Viewer application.

## Authentication and Authorization

### OAuth 2.0 Implementation Rules
- **MUST**: Use HTTPS for all OAuth token exchanges
- **MUST**: Store tokens in memory only, never persist to disk
- **MUST**: Implement automatic token refresh 5 minutes before expiration
- **MUST**: Use secure, random session identifiers
- **MUST NOT**: Log authentication tokens or credentials
- **MUST NOT**: Include tokens in error messages or client-side code

### Session Management Rules
- **MUST**: Generate cryptographically secure session IDs
- **MUST**: Implement session timeout (maximum 30 minutes)
- **MUST**: Invalidate sessions on authentication errors
- **MUST**: Use secure session storage with proper cleanup
- **MUST NOT**: Store sensitive data in session context

## Input Validation and Sanitization

### User Input Rules
- **MUST**: Validate all user inputs on both client and server
- **MUST**: Sanitize inputs to prevent XSS attacks
- **MUST**: Enforce character limits (2000 chars for queries)
- **MUST**: Use parameterized queries for database operations
- **MUST NOT**: Trust any client-side validation alone
- **MUST NOT**: Execute user input as code

### Content Processing Rules
- **MUST**: Validate all URLs from external sources
- **MUST**: Only allow HTTPS URLs for media content
- **MUST**: Sanitize HTML content before rendering
- **MUST**: Implement Content Security Policy (CSP) headers
- **MUST NOT**: Allow arbitrary file uploads
- **MUST NOT**: Execute scripts from external content

## Data Protection

### Sensitive Data Handling
- **MUST**: Encrypt sensitive data in transit (HTTPS/TLS 1.2+)
- **MUST**: Use environment variables for configuration secrets
- **MUST**: Implement proper error handling without data leakage
- **MUST**: Sanitize logs to remove sensitive information
- **MUST NOT**: Store credentials in source code
- **MUST NOT**: Log personally identifiable information (PII)

### API Security Rules
- **MUST**: Implement rate limiting (10 requests per minute per IP)
- **MUST**: Use proper HTTP security headers
- **MUST**: Validate Content-Type headers
- **MUST**: Implement request size limits
- **MUST NOT**: Expose internal system information in responses
- **MUST NOT**: Allow unrestricted CORS origins

## Network Security

### Communication Rules
- **MUST**: Use HTTPS for all external communications
- **MUST**: Validate SSL/TLS certificates
- **MUST**: Implement proper timeout handling
- **MUST**: Use secure cipher suites only
- **MUST NOT**: Allow HTTP connections in production
- **MUST NOT**: Disable certificate validation

### External Service Integration
- **MUST**: Validate responses from external services
- **MUST**: Implement circuit breaker patterns for resilience
- **MUST**: Use allowlists for external domains when possible
- **MUST**: Monitor external service communications
- **MUST NOT**: Trust external service responses without validation
- **MUST NOT**: Expose internal service endpoints publicly

## Error Handling and Logging

### Error Response Rules
- **MUST**: Provide user-friendly error messages
- **MUST**: Log detailed errors server-side only
- **MUST**: Use consistent error response format
- **MUST**: Implement proper HTTP status codes
- **MUST NOT**: Expose stack traces to clients
- **MUST NOT**: Include sensitive data in error responses

### Logging Security Rules
- **MUST**: Log security-relevant events (auth failures, rate limits)
- **MUST**: Use structured logging with correlation IDs
- **MUST**: Implement log rotation and retention policies
- **MUST**: Protect log files with appropriate permissions
- **MUST NOT**: Log passwords, tokens, or other secrets
- **MUST NOT**: Log complete request/response bodies in production

## Dependency Management

### Third-Party Dependencies
- **MUST**: Regularly audit dependencies for vulnerabilities
- **MUST**: Use exact version pinning for production
- **MUST**: Review security advisories for all dependencies
- **MUST**: Implement automated vulnerability scanning
- **MUST NOT**: Use dependencies with known high-severity vulnerabilities
- **MUST NOT**: Include unnecessary or unused dependencies

### Package Security Rules
- **MUST**: Verify package integrity using checksums
- **MUST**: Use official package repositories only
- **MUST**: Review package permissions and access requirements
- **MUST**: Monitor for suspicious package updates
- **MUST NOT**: Install packages from untrusted sources
- **MUST NOT**: Use packages with excessive permissions

## Security Testing Requirements

### Mandatory Security Tests
- **MUST**: Test input validation with malicious payloads
- **MUST**: Test authentication and authorization flows
- **MUST**: Test rate limiting and DoS protection
- **MUST**: Test error handling for information disclosure
- **MUST**: Perform static code analysis for security issues
- **MUST**: Test HTTPS configuration and certificate validation

### Penetration Testing
- **MUST**: Conduct regular security assessments
- **MUST**: Test for OWASP Top 10 vulnerabilities
- **MUST**: Validate security controls under load
- **MUST**: Test session management security
- **MUST**: Verify data protection measures
- **MUST**: Document and remediate all findings

## Incident Response

### Security Incident Procedures
1. **Detection**: Monitor for security events and anomalies
2. **Containment**: Isolate affected systems immediately
3. **Assessment**: Determine scope and impact of incident
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore services with enhanced security
6. **Lessons Learned**: Document and improve security measures

### Breach Notification Requirements
- **MUST**: Notify security team within 1 hour of detection
- **MUST**: Document all incident response actions
- **MUST**: Preserve evidence for forensic analysis
- **MUST**: Assess legal and regulatory notification requirements
- **MUST**: Implement additional controls to prevent recurrence

## Compliance Requirements

### Data Privacy
- **MUST**: Implement data minimization principles
- **MUST**: Provide clear privacy notices to users
- **MUST**: Honor user data deletion requests
- **MUST**: Implement appropriate data retention policies
- **MUST NOT**: Collect unnecessary personal information
- **MUST NOT**: Share user data without explicit consent

### Regulatory Compliance
- **MUST**: Maintain audit trails for security events
- **MUST**: Implement appropriate access controls
- **MUST**: Document security policies and procedures
- **MUST**: Conduct regular compliance assessments
- **MUST**: Train development team on security requirements

---

These security rules are mandatory and must be followed in all development and deployment activities.