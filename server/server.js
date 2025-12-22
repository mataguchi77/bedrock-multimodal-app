const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// AWS Bedrock client configuration
const bedrockClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Route to invoke Bedrock Agent
app.post('/api/invoke-agent', async (req, res) => {
  try {
    const { query, sessionId } = req.body;

    const command = new InvokeAgentCommand({
      agentId: process.env.BEDROCK_AGENT_ID,
      agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
      sessionId: sessionId || 'default-session',
      inputText: query,
    });

    const response = await bedrockClient.send(command);
    
    // Process the streaming response
    const chunks = [];
    for await (const chunk of response.completion) {
      if (chunk.chunk) {
        chunks.push(chunk.chunk.bytes);
      }
    }

    const responseText = Buffer.concat(chunks).toString('utf-8');
    
    res.json({
      success: true,
      response: responseText,
      sessionId: response.sessionId,
    });
  } catch (error) {
    console.error('Error invoking Bedrock Agent:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});