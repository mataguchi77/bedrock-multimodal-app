# Bedrock AgentCore Gateway API Testing Guide

This document provides step-by-step instructions for testing and verifying your Bedrock AgentCore Gateway API integration using Windows PowerShell.

## Prerequisites

- Bedrock AgentCore Gateway deployed and configured
- Cognito OAuth credentials (client ID and secret)
- Backend application running on localhost:5000
- Windows PowerShell

## API Verification Flow

### Step 1: Get OAuth Token

Use PowerShell to obtain an OAuth token from Cognito:

```powershell
$response = Invoke-RestMethod -Uri "https://my-domain-aplb3hxq.auth.ap-northeast-1.amazoncognito.com/oauth2/token" -Method POST -Headers @{"Content-Type"="application/x-www-form-urlencoded"} -Body "grant_type=client_credentials&client_id=5qknid8ddu8995tkdgoavvinde&client_secret=1ojsj0r07lju99lbr1n756kud862f5q7so4basi57kjdg2i1nkmd"
$MYTOKEN = $response.access_token
```

### Step 2: Verify AgentCore Gateway API

Test the gateway directly with the obtained token:

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $MYTOKEN"
}
$body = @{
    jsonrpc = "2.0"
    id = "test_invoke"
    method = "tools/call"
    params = @{
        name = "multimodal-agent___invoke_bedrock_agent"
        arguments = @{
            inputText = "What is the infrastructure automation defined by AAP?"
            sessionId = "test-session-123"
        }
    }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Uri "https://multimodal-agent-mkimw46b0u.gateway.bedrock-agentcore.ap-northeast-1.amazonaws.com/mcp" -Method POST -Headers $headers -Body $body
```

### Step 3: Verify Backend Application

Test your local backend application:

```powershell
$headers = @{"Content-Type" = "application/json"}
$body = @{query = "Hello, test query"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/invoke-agent" -Method POST -Headers $headers -Body $body
```

## Expected Responses

### Successful OAuth Token Response
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Successful Gateway API Response
```json
{
  "jsonrpc": "2.0",
  "id": "test_invoke",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Response from Bedrock Agent..."
      }
    ]
  }
}
```

### Successful Backend Response
```json
{
  "success": true,
  "content": {
    "text": ["Response content..."],
    "images": [],
    "videos": [],
    "documents": []
  },
  "sessionId": "session_abc123",
  "timestamp": "2026-01-04T...",
  "processingTime": 1234
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your OAuth credentials and token expiration
2. **403 Forbidden**: Verify your Cognito client has proper permissions
3. **Connection Refused**: Ensure your backend server is running on port 5000
4. **CORS Errors**: Check that your frontend is properly configured to proxy to backend

### Debug Commands

Check if backend is running:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

Verify token validity (if userInfo endpoint is available):
```powershell
$headers = @{"Authorization" = "Bearer $MYTOKEN"}
Invoke-RestMethod -Uri "https://your-cognito-domain/oauth2/userInfo" -Method GET -Headers $headers
```

## Configuration Files

- **Backend Environment**: `server/.env`
- **Frontend Proxy**: `client/package.json` (proxy setting)
- **Gateway URL**: Configured in `server/.env` as `BEDROCK_AGENT_CORE_GATEWAY_URL`

## Security Notes

- Never commit OAuth tokens or credentials to version control
- Tokens expire after 1 hour by default
- Use environment variables for sensitive configuration
- Implement proper error handling for token refresh in production