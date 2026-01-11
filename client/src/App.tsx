// Feature: multimodal-content-viewer
// Main App component with TypeScript, enhanced functionality, and session management

import { useState, useCallback } from 'react';
import './App.css';
import QueryInterface from './components/QueryInterface';
import ContentViewer from './components/ContentViewer';
import SessionManager from './components/SessionManager';
import { useSessionManager } from './hooks/useSessionManager';
import { MultimodalContent, QueryResponse, ConversationEntry } from './types';

function App() {
  const [content, setContent] = useState<MultimodalContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the session manager hook
  const {
    sessionId,
    addToConversation,
    updateSession
  } = useSessionManager({
    autoCreateSession: true,
    persistConversation: true,
    maxConversationEntries: 100,
    enableCleanup: true
  });

  const handleQuerySubmit = useCallback(async (query: string) => {
    if (!sessionId) {
      setError('No active session. Please create a new session.');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Add query to conversation history
    const queryEntry: ConversationEntry = {
      id: `query_${Date.now()}`,
      type: 'query',
      content: query,
      timestamp: new Date(),
      sessionId,
      metadata: { characterCount: query.length }
    };
    addToConversation(queryEntry);
    
    try {
      const response = await fetch('/api/invoke-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: QueryResponse = await response.json();
      
      if (data.success) {
        setContent(data.content || null);
        setError(null);
        
        // Add successful response to conversation history
        const responseContent = data.content?.text?.[0];
        const responseText = typeof responseContent === 'string' 
          ? responseContent 
          : responseContent?.content || 'Response received';
        
        const responseEntry: ConversationEntry = {
          id: `response_${Date.now()}`,
          type: 'response',
          content: responseText,
          timestamp: new Date(),
          sessionId: data.sessionId,
          metadata: { 
            processingTime: data.processingTime,
            contentTypes: {
              text: data.content?.text?.length || 0,
              images: data.content?.images?.length || 0,
              videos: data.content?.videos?.length || 0,
              documents: data.content?.documents?.length || 0
            }
          }
        };
        addToConversation(responseEntry);
        
        // Update session with successful query
        updateSession({
          context: {
            lastQuery: query,
            lastResponse: data.content,
            lastProcessingTime: data.processingTime
          }
        });
      } else {
        console.error('Query failed:', data.error);
        const errorMessage = data.error || 'Unknown error occurred';
        setError(errorMessage);
        setContent(null);
        
        // Add error to conversation history
        const errorEntry: ConversationEntry = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: errorMessage,
          timestamp: new Date(),
          sessionId: sessionId,
          metadata: { errorCode: 'QUERY_FAILED' }
        };
        addToConversation(errorEntry);
      }
    } catch (error) {
      console.error('Network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      setError(errorMessage);
      setContent(null);
      
      // Add network error to conversation history
      const networkErrorEntry: ConversationEntry = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: errorMessage,
        timestamp: new Date(),
        sessionId: sessionId,
        metadata: { errorCode: 'NETWORK_ERROR' }
      };
      addToConversation(networkErrorEntry);
    } finally {
      setLoading(false);
    }
  }, [sessionId, addToConversation, updateSession]);

  const handleClear = useCallback(() => {
    setContent(null);
    setError(null);
  }, []);

  const handleSessionChange = useCallback((newSessionId: string | null) => {
    // Clear current content when session changes
    setContent(null);
    setError(null);
    console.log('Session changed to:', newSessionId);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AWS Bedrock Multimodal Content Viewer</h1>
        <p>Query your knowledge base and visualize multimodal content</p>
      </header>
      
      <main className="App-main">
        <SessionManager onSessionChange={handleSessionChange} />
        
        <QueryInterface 
          onSubmit={handleQuerySubmit} 
          loading={loading}
          onClear={handleClear}
        />
        
        <ContentViewer 
          content={content} 
          loading={loading}
          error={error}
        />
      </main>
    </div>
  );
}

export default App;