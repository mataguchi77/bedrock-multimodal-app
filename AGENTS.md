# AI Agents Documentation

This document describes the AI agents and intelligent systems integrated into the AWS Bedrock Multimodal Content Viewer application.

## Overview

The application leverages multiple AI agents and services to provide intelligent multimodal content processing and visualization capabilities.

## Primary AI Agents

### 1. AWS Bedrock Agent

**Purpose**: Core multimodal content processing and knowledge retrieval  
**Integration**: Via Bedrock AgentCore Gateway with JSON-RPC protocol  
**Capabilities**:
- Natural language query processing
- Knowledge base retrieval from multimodal content
- Context-aware conversational responses
- Session-based interaction management

**Configuration**:
- **Gateway URL**: `https://multimodal-agent-mkimw46b0u.gateway.bedrock-agentcore.ap-northeast-1.amazonaws.com/mcp`
- **Authentication**: Cognito OAuth 2.0 with automatic token refresh
- **Protocol**: JSON-RPC 2.0 with tool calling interface
- **Tool Name**: `multimodal-agent___invoke_bedrock_agent`

**Request Format**:
```json
{
  "jsonrpc": "2.0",
  "id": "invoke_timestamp",
  "method": "tools/call",
  "params": {
    "name": "multimodal-agent___invoke_bedrock_agent",
    "arguments": {
      "inputText": "user query",
      "sessionId": "session-id"
    }
  }
}
```

**Response Format**:
```json
{
  "jsonrpc": "2.0",
  "id": "invoke_timestamp",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Agent response content..."
      }
    ],
    "isError": false
  }
}
```

### 2. Content Processing Agent (Backend Service)

**Purpose**: Intelligent parsing and structuring of multimodal responses  
**Location**: `server/src/services/ContentProcessorService.ts`  
**Capabilities**:
- Automatic content type detection (text, images, videos, documents)
- Media URL validation and sanitization
- Content metadata extraction
- Intelligent fallback handling for malformed content
- Performance-optimized caching

**Processing Pipeline**:
1. **Content Analysis**: Identifies different media types in response
2. **URL Validation**: Verifies and sanitizes media URLs
3. **Metadata Extraction**: Extracts positioning and formatting information
4. **Structure Creation**: Builds typed multimodal content objects
5. **Caching**: Stores processed content for performance optimization

### 3. Session Management Agent (Backend Service)

**Purpose**: Intelligent session lifecycle and context management  
**Location**: `server/src/services/SessionManagerService.ts`  
**Capabilities**:
- Automatic session creation and recovery
- Context preservation across conversations
- Session expiration and cleanup
- Thread-safe session operations
- Performance monitoring and statistics

**Session Lifecycle**:
1. **Creation**: Generates unique session identifiers
2. **Context Management**: Maintains conversation history and state
3. **Recovery**: Automatic recovery from session errors
4. **Cleanup**: Intelligent session expiration and resource management

### 4. Error Handling Agent (Backend Service)

**Purpose**: Intelligent error detection, classification, and recovery  
**Location**: `server/src/services/ErrorHandlerService.ts`  
**Capabilities**:
- Error classification and categorization
- Automatic retry strategies with exponential backoff
- Structured error response generation
- Recovery strategy recommendations
- Performance impact monitoring

**Error Categories**:
- `AWS_AUTH_ERROR`: Authentication and authorization issues
- `BEDROCK_SERVICE_ERROR`: Bedrock Agent service errors
- `VALIDATION_ERROR`: Input validation failures
- `SESSION_ERROR`: Session management issues
- `NETWORK_ERROR`: Network connectivity problems

## Frontend AI-Enhanced Components

### 1. Intelligent Query Interface

**Location**: `client/src/components/QueryInterface.tsx`  
**AI Features**:
- Real-time input validation with intelligent feedback
- Context-aware character counting and limits
- Smart error recovery and user guidance
- Accessibility-enhanced interaction patterns

### 2. Adaptive Content Viewer

**Location**: `client/src/components/ContentViewer.tsx`  
**AI Features**:
- Intelligent content type detection and rendering
- Adaptive layout based on content complexity
- Smart error handling with fallback strategies
- Performance-optimized lazy loading

## Authentication Agent

### Cognito OAuth Service

**Purpose**: Automated authentication and token management  
**Location**: `server/src/services/AuthService.ts`  
**Capabilities**:
- Automatic OAuth token acquisition
- Intelligent token refresh before expiration
- Secure credential management
- Authentication error recovery

**Configuration**:
- **Token URL**: `https://my-domain-aplb3hxq.auth.ap-northeast-1.amazoncognito.com/oauth2/token`
- **Grant Type**: Client Credentials
- **Token Lifetime**: 3600 seconds (1 hour)
- **Refresh Strategy**: Automatic refresh 5 minutes before expiration

## Agent Communication Patterns

### 1. Request-Response Pattern
- **Frontend → Backend**: HTTP REST API
- **Backend → Bedrock Agent**: JSON-RPC over HTTPS
- **Error Propagation**: Structured error responses with recovery suggestions

### 2. Session Context Sharing
- **Session ID**: Shared across all agent interactions
- **Context Preservation**: Maintained throughout conversation lifecycle
- **State Synchronization**: Automatic state updates across components

### 3. Retry and Recovery Strategies
- **Exponential Backoff**: Intelligent retry timing with jitter
- **Circuit Breaker**: Automatic service degradation on repeated failures
- **Graceful Degradation**: Fallback responses when agents are unavailable

## Performance Optimization

### 1. Caching Strategies
- **Content Caching**: Processed multimodal content cached for reuse
- **Token Caching**: OAuth tokens cached until near expiration
- **Session Caching**: Active sessions maintained in memory

### 2. Load Balancing
- **Request Distribution**: Intelligent request routing
- **Resource Management**: Memory and CPU optimization
- **Performance Monitoring**: Real-time performance metrics

## Monitoring and Observability

### 1. Agent Health Monitoring
- **Health Check Endpoints**: `/api/health` for service status
- **Performance Metrics**: Response time and success rate tracking
- **Error Rate Monitoring**: Automatic alerting on error thresholds

### 2. Logging and Debugging
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Debug Mode**: Detailed request/response logging for troubleshooting
- **Performance Profiling**: Request timing and resource usage tracking

## Security Considerations

### 1. Authentication Security
- **OAuth 2.0**: Industry-standard authentication protocol
- **Token Rotation**: Automatic token refresh for security
- **Credential Protection**: Environment variable-based configuration

### 2. Input Validation
- **Query Sanitization**: Input validation and sanitization
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Content Filtering**: Safe content processing and display

## Development and Testing

### 1. Property-Based Testing
- **Agent Behavior Validation**: Automated testing of agent responses
- **Error Scenario Testing**: Comprehensive error condition testing
- **Performance Testing**: Load testing and performance validation

### 2. Integration Testing
- **End-to-End Flows**: Complete user journey testing
- **Agent Communication**: Inter-agent communication validation
- **Error Recovery**: Failure scenario and recovery testing

## Future Enhancements

### 1. Advanced AI Features
- **Multi-Agent Orchestration**: Coordinated multi-agent workflows
- **Intelligent Content Summarization**: AI-powered content summarization
- **Predictive Caching**: ML-based content pre-loading

### 2. Enhanced Monitoring
- **AI-Powered Anomaly Detection**: Intelligent error pattern recognition
- **Predictive Scaling**: ML-based resource scaling
- **Intelligent Alerting**: Context-aware alert generation

## Configuration Reference

### Environment Variables
```bash
# Bedrock Agent Configuration
BEDROCK_AGENT_CORE_GATEWAY_URL=https://your-gateway-url.amazonaws.com/mcp

# Authentication Configuration
COGNITO_TOKEN_URL=https://your-domain.auth.region.amazoncognito.com/oauth2/token
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret

# Service Configuration
PORT=5000
NODE_ENV=production
```

### API Endpoints
- **Health Check**: `GET /api/health`
- **Token Info**: `GET /api/token-info`
- **Agent Invocation**: `POST /api/invoke-agent`
- **Session Management**: `POST /api/session/new`, `GET /api/session/:id`

## Troubleshooting

### Common Issues
1. **Authentication Failures**: Check OAuth credentials and token expiration
2. **Gateway Timeouts**: Verify network connectivity and gateway status
3. **Session Errors**: Check session ID validity and expiration
4. **Content Processing Errors**: Verify content format and structure

### Debug Resources
- **API Testing Guide**: `docs/API_TESTING.md`
- **Server Logs**: Console output with detailed request/response logging
- **Health Endpoints**: Real-time service status and metrics

---

This documentation provides a comprehensive overview of the AI agents and intelligent systems powering the AWS Bedrock Multimodal Content Viewer application.