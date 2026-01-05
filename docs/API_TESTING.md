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

$response = Invoke-RestMethod -Uri "https://multimodal-agent-mkimw46b0u.gateway.bedrock-agentcore.ap-northeast-1.amazonaws.com/mcp" -Method POST -Headers $headers -Body $body

# Display the full response content
Write-Host "=== Full API Response ===" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10

# Display just the content text
Write-Host "`n=== Content Text ===" -ForegroundColor Yellow
$response.result.content | ForEach-Object { 
    if ($_.type -eq "text") { 
        Write-Host $_.text -ForegroundColor White
    }
}
```

### Step 3: Build and Start Backend Application

First, build and start your backend server:

```powershell
# Navigate to server directory and build
cd server
npm run build

# Start the development server
npm run dev
```

Wait for the server to start (you should see a message like "Server running on port 5000"), then open a new PowerShell window and test the backend:

```powershell
$headers = @{"Content-Type" = "application/json"}
$body = @{query = "What is the infrastructure automation defined by AAP?"} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/invoke-agent" -Method POST -Headers $headers -Body $body

# Display the full response
Write-Host "=== Backend Response ===" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10

# Display just the content text
Write-Host "`n=== Response Content ===" -ForegroundColor Yellow
if ($response.success) {
    $response.content.text | ForEach-Object { Write-Host $_ -ForegroundColor White }
} else {
    Write-Host "Error: $($response.error)" -ForegroundColor Red
}
```

## Expected Responses

### Step 1: Successful OAuth Token Response
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Step 2: Successful Gateway API Response
```json
{
  "jsonrpc": "2.0",
  "id": "test_invoke",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Infrastructure automation in AAP (Ansible Automation Platform) is defined through..."
      }
    ],
    "isError": false
  }
}
```

### Step 3: Successful Backend Response
```json
{
  "success": true,
  "content": {
    "text": ["Hello! I'm ready to help you with your queries about multimodal content..."],
    "images": [],
    "videos": [],
    "documents": [],
    "metadata": {
      "totalElements": 1,
      "processingTime": 1234,
      "source": "bedrock-agent"
    }
  },
  "sessionId": "session_5ed0511b-dc41-4409-94de-4e5f28449b24",
  "timestamp": "2026-01-05T12:34:56.789Z",
  "processingTime": 878
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your OAuth credentials and token expiration
2. **403 Forbidden**: Verify your Cognito client has proper permissions
3. **Connection Refused**: Ensure your backend server is running on port 5000
4. **CORS Errors**: Check that your frontend is properly configured to proxy to backend
5. **Parse error - Invalid JSON format**: Backend is receiving malformed JSON from AgentCore Gateway

### Parse Error Troubleshooting

If you see `Parse error - Invalid JSON format`, this indicates the backend was sending the wrong format to the AgentCore Gateway. **This has been fixed** - the backend now sends the correct JSON-RPC format.

**Solution**: Rebuild and restart your backend:

```powershell
cd server
npm run build
npm run dev
```

**If you still get the parse error, follow these debugging steps:**

1. **Rebuild and restart the backend** (this is critical):
   ```powershell
   cd server
   npm run build  # This should complete without errors
   npm run dev    # Start the server
   ```

2. **Look at the server console logs** when you make the request. The updated code now shows detailed logging:
   - Request being sent to gateway
   - OAuth token being used
   - Gateway response status and data
   - Any errors encountered

3. **Test with the verbose error handling**:
   ```powershell
   try {
       $headers = @{"Content-Type" = "application/json"}
       $body = @{query = "test"} | ConvertTo-Json
       $response = Invoke-RestMethod -Uri "http://localhost:5000/api/invoke-agent" -Method POST -Headers $headers -Body $body
       Write-Host "Success!" -ForegroundColor Green
       $response | ConvertTo-Json -Depth 10
   } catch {
       Write-Host "Error details:" -ForegroundColor Red
       Write-Host $_.Exception.Message -ForegroundColor Red
       if ($_.ErrorDetails) {
           Write-Host "Response body:" -ForegroundColor Yellow
           Write-Host $_.ErrorDetails.Message -ForegroundColor White
       }
   }
   ```

4. **Check your .env file** has the correct gateway URL:
   ```powershell
   cd server
   Get-Content .env | Select-String "BEDROCK_AGENT_CORE_GATEWAY_URL"
   ```

The backend now sends the correct JSON-RPC format:
```json
{
  "jsonrpc": "2.0",
  "id": "invoke_timestamp",
  "method": "tools/call",
  "params": {
    "name": "multimodal-agent___invoke_bedrock_agent",
    "arguments": {
      "inputText": "your query",
      "sessionId": "session-id"
    }
  }
}
```

Other troubleshooting steps:

1. **Check backend logs**: Look at the server console for detailed error messages
2. **Verify token is valid**: Test the AgentCore Gateway directly (Step 2) first
3. **Check environment variables**: Ensure `.env` file has correct gateway URL and credentials

```powershell
# Check if environment variables are loaded
cd server
Get-Content .env
```

4. **Test with a simpler query**:
```powershell
$headers = @{"Content-Type" = "application/json"}
$body = @{query = "test"} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/invoke-agent" -Method POST -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 10
```

5. **Check backend health endpoint**:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

### Debug Commands

Check if backend is running:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

If the backend isn't responding, check if it's built and running:
```powershell
# Check if server is running on port 5000
netstat -an | Select-String ":5000"

# Or test with a simple connection
Test-NetConnection -ComputerName localhost -Port 5000
```

Build and restart backend if needed:
```powershell
cd server
npm run build
npm run dev
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