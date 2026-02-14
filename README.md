# AWS Bedrock Multimodal Content Viewer

A React.js and Node.js application that integrates with AWS Bedrock Agent and Knowledge Base to visualize multimodal content.

## Features

- **Enhanced React Frontend**: TypeScript components with input validation, real-time character counting, and multimodal content rendering
- **Node.js Backend**: Express server with AgentCore Gateway integration and automatic OAuth token management
- **Multimodal Content Visualization**: Support for text, images (with fullscreen zoom), videos, and documents
- **Session Management**: Persistent conversation sessions with automatic recovery
- **Error Handling**: Graceful error recovery with user-friendly messages
- **Accessibility**: Full keyboard navigation and screen reader support
- **Testing**: Comprehensive unit and integration testing

## Setup

### Prerequisites

- Node.js (v16 or higher)
- AWS Bedrock AgentCore Gateway deployed
- Cognito OAuth credentials (client ID and secret)

### Installation

1. Install all dependencies:
```bash
npm run install-all
```

2. Configure AWS credentials:
```bash
cd server
cp .env.example .env
```

3. Update the `.env` file with your AgentCore Gateway configuration:
```
BEDROCK_AGENT_CORE_GATEWAY_URL=https://your-gateway-url.amazonaws.com/mcp
COGNITO_TOKEN_URL=https://your-domain.auth.region.amazoncognito.com/oauth2/token
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
PORT=5000
```

### Running the Application

Start both frontend and backend:
```bash
npm run dev
```

Or run them separately:
```bash
# Backend (from root directory)
npm run server

# Frontend (from root directory)
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

1. Enter your query in the text area
2. Click "Query Agent" to send the request to AWS Bedrock
3. View the multimodal content response in the content viewer
4. Continue the conversation with follow-up queries

## Architecture

- **Frontend**: React.js with TypeScript, enhanced components with validation and accessibility
- **Backend**: Express.js server with AgentCore Gateway integration and OAuth authentication
- **AWS Integration**: Bedrock AgentCore Gateway → Lambda → Bedrock Agent flow
- **Authentication**: Cognito OAuth with automatic token refresh
- **Content Processing**: Advanced multimodal content parsing and rendering with error handling

## Testing

### API Testing
For detailed API testing instructions, see [docs/API_TESTING.md](docs/API_TESTING.md)

### Running Tests
Run tests for frontend and backend:
```bash
# Frontend tests
cd client
npm test

# Backend tests  
cd server
npm test
```

## Next Steps

- ✅ Enhanced QueryInterface with validation and UX improvements
- ✅ Enhanced ContentViewer with multimodal rendering and fullscreen support
- 🔄 Enhanced Session Manager with browser storage persistence
- 🔄 Error Boundary and global error handling
- 🔄 End-to-end integration testing
- 🔄 Performance optimization and caching
- 🔄 Production deployment configuration

## Documentation

- [API Testing Guide](docs/API_TESTING.md) - Detailed instructions for testing the AgentCore Gateway API
- [Implementation Tasks](.kiro/specs/multimodal-content-viewer/tasks.md) - Systematic development tasks
- [Design Document](.kiro/specs/multimodal-content-viewer/design.md) - Architecture and correctness properties
- [Requirements](.kiro/specs/multimodal-content-viewer/requirements.md) - User stories and acceptance criteria


