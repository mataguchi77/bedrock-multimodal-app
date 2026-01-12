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
$body = @{query = "Can you let me know AAP 2.x to 2.6 supported upgrade & migration paths?"} | ConvertTo-Json
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

