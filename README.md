# AWS Bedrock Multimodal Content Viewer

A React.js and Node.js application that integrates with AWS Bedrock Agent and Knowledge Base to visualize multimodal content.

## Features

- React frontend with clean, responsive UI
- Node.js backend with AWS Bedrock integration
- Multimodal content visualization (text, images, videos)
- Session management for conversational queries
- Real-time content rendering

## Setup

### Prerequisites

- Node.js (v16 or higher)
- AWS account with Bedrock access
- Configured AWS Bedrock Agent and Knowledge Base

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

3. Update the `.env` file with your AWS credentials and Bedrock configuration:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_AGENT_ID=your_agent_id
BEDROCK_AGENT_ALIAS_ID=your_agent_alias_id
BEDROCK_KNOWLEDGE_BASE_ID=your_knowledge_base_id
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

- **Frontend**: React.js with component-based architecture
- **Backend**: Express.js server with AWS SDK integration
- **AWS Integration**: Bedrock Agent Runtime for query processing
- **Content Parsing**: Basic multimodal content detection and rendering

## Next Steps

- Enhance multimodal content parsing
- Add authentication and user management
- Implement advanced visualization components
- Add error handling and retry logic
- Configure production deployment