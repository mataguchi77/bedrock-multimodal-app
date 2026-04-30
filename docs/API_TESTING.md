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
# Replace these with your actual values from server/.env
$COGNITO_TOKEN_URL = "https://your-domain.auth.your-region.amazoncognito.com/oauth2/token"
$CLIENT_ID = "your_cognito_client_id"
$CLIENT_SECRET = "your_cognito_client_secret"

# Get OAuth token
$response = Invoke-RestMethod -Uri $COGNITO_TOKEN_URL -Method POST -Headers @{"Content-Type"="application/x-www-form-urlencoded"} -Body "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET"
$MYTOKEN = $response.access_token

Write-Host "Token obtained successfully!" -ForegroundColor Green
Write-Host "Token expires in: $($response.expires_in) seconds" -ForegroundColor Yellow
```

### Step 2: Verify AgentCore Gateway API

Test the gateway directly with the obtained token:

```powershell
# Replace with your actual gateway URL from server/.env
$GATEWAY_URL = "https://your-gateway-id.gateway.bedrock-agentcore.your-region.amazonaws.com/mcp"

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

$response = Invoke-RestMethod -Uri $GATEWAY_URL -Method POST -Headers $headers -Body $body

# Display the full response content
Write-Host "=== Full API Response ===" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10
```

### Step 3: Build and Start Backend Application

First, build and start your backend server:

```powershell
# Navigate to server directory and build
cd server
npm run build

# Start the development server
npm start
```

Wait for the server to start (you should see a message like "Server running on port 5000"), then open a new PowerShell window and test the backend:

```powershell
$headers = @{"Content-Type" = "application/json"}
$body = @{
    query = "Can you let me know AAP 2.x to 2.6 supported upgrade & migration paths?"
    sessionId = "test-session-456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/invoke-agent" -Method POST -Headers $headers -Body $body

# Display the full response
Write-Host "=== Backend Response ===" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10

# Display just the content text
Write-Host "`n=== Response Content ===" -ForegroundColor Yellow
if ($response.success) {
    # Handle both string and structured content
    if ($response.content.text) {
        $response.content.text | ForEach-Object { 
            if ($_.content) {
                Write-Host $_.content -ForegroundColor White
            } else {
                Write-Host $_ -ForegroundColor White
            }
        }
    } else {
        Write-Host $response.content -ForegroundColor White
    }
    
    # Display images if present
    if ($response.content.images -and $response.content.images.Count -gt 0) {
        Write-Host "`n=== Images ===" -ForegroundColor Cyan
        $response.content.images | ForEach-Object {
            Write-Host "- $($_.alt): $($_.url)" -ForegroundColor White
        }
    }
} else {
    Write-Host "Error: $($response.error)" -ForegroundColor Red
}
```

## Testing Multimodal Content

To test image retrieval (requires Bedrock Agent configuration):

```powershell
$headers = @{"Content-Type" = "application/json"}
$body = @{
    query = "Can you show me any diagram on AAP?"
    sessionId = "test-session-789"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/invoke-agent" -Method POST -Headers $headers -Body $body

# Check for images in response
if ($response.content.images -and $response.content.images.Count -gt 0) {
    Write-Host "✓ Images found in response!" -ForegroundColor Green
    $response.content.images | ForEach-Object {
        Write-Host "  - $($_.alt)" -ForegroundColor White
        Write-Host "    URL: $($_.url)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠ No images in response. Check Bedrock Agent configuration." -ForegroundColor Yellow
    Write-Host "  See NEXT_STEPS.md for configuration instructions." -ForegroundColor Gray
}
```

## Health Check Endpoint

Verify the backend services are healthy:

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET

Write-Host "=== Health Check ===" -ForegroundColor Green
$response | ConvertTo-Json -Depth 5

if ($response.services.bedrock -eq "healthy") {
    Write-Host "✓ Bedrock service is healthy" -ForegroundColor Green
} else {
    Write-Host "✗ Bedrock service is unhealthy" -ForegroundColor Red
}
```

## Token Info Endpoint (Debug)

Check current OAuth token status:

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/token-info" -Method GET

Write-Host "=== Token Info ===" -ForegroundColor Green
$response | ConvertTo-Json -Depth 5
```

## Troubleshooting

### Common Issues

1. **"Invalid session ID" error**:
   - The backend now handles session creation automatically
   - You can omit `sessionId` from the request body for new sessions
   - Subsequent requests should use the `sessionId` returned in the response

2. **"Authentication failed" error**:
   - Verify your Cognito credentials in `server/.env`
   - Check that the OAuth token hasn't expired
   - The backend automatically refreshes tokens, but manual testing may need fresh tokens

3. **"No images in response"**:
   - This is a Bedrock Agent configuration issue, not a code issue
   - See `NEXT_STEPS.md` for detailed configuration instructions
   - The application code is ready to display images once Bedrock returns them

4. **Backend not starting**:
   - Ensure all environment variables are set in `server/.env`
   - Run `npm install` in the server directory
   - Check that port 5000 is not already in use

### Viewing Backend Logs

The backend logs detailed information about each request:

```powershell
# In the terminal where you ran 'npm start', you'll see:
# - Request details (JSON-RPC format)
# - OAuth token status
# - Gateway response data
# - Processed content structure
```

Look for the "Processed content" log entry to see what content types were extracted from the Bedrock response.

## Example Complete Test Session

```powershell
# 1. Get OAuth token
$COGNITO_TOKEN_URL = "https://your-domain.auth.your-region.amazoncognito.com/oauth2/token"
$CLIENT_ID = "your_client_id"
$CLIENT_SECRET = "your_client_secret"

$tokenResponse = Invoke-RestMethod -Uri $COGNITO_TOKEN_URL -Method POST -Headers @{"Content-Type"="application/x-www-form-urlencoded"} -Body "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET"
$MYTOKEN = $tokenResponse.access_token

Write-Host "✓ Token obtained" -ForegroundColor Green

# 2. Test backend health
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
Write-Host "✓ Backend health: $($health.services.bedrock)" -ForegroundColor Green

# 3. Send a query
$headers = @{"Content-Type" = "application/json"}
$body = @{query = "What is AAP?"} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/invoke-agent" -Method POST -Headers $headers -Body $body

if ($response.success) {
    Write-Host "✓ Query successful" -ForegroundColor Green
    Write-Host "Session ID: $($response.sessionId)" -ForegroundColor Yellow
} else {
    Write-Host "✗ Query failed: $($response.error)" -ForegroundColor Red
}
```

## Additional Resources

- **Backend Logs**: Check the terminal where `npm start` is running for detailed request/response logs
- **Frontend Testing**: Open http://localhost:3000 in your browser to test the full application
- **Configuration Guide**: See `NEXT_STEPS.md` for Bedrock Agent configuration instructions
- **API Documentation**: See `AGENTS.md` for detailed API specifications


