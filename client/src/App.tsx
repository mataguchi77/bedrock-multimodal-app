// Feature: multimodal-content-viewer
// Main App component with TypeScript and enhanced functionality

import { useState, useCallback } from 'react';
import './App.css';
import QueryInterface from './components/QueryInterface';
import ContentViewer from './components/ContentViewer';
import { MultimodalContent, QueryResponse } from './types';

function App() {
  const [content, setContent] = useState<MultimodalContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuerySubmit = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
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
        setSessionId(data.sessionId);
        setError(null);
      } else {
        console.error('Query failed:', data.error);
        setError(data.error || 'Unknown error occurred');
        setContent(null);
      }
    } catch (error) {
      console.error('Network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      setError(errorMessage);
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleClear = useCallback(() => {
    setContent(null);
    setError(null);
  }, []);

  const handleNewSession = useCallback(() => {
    setSessionId(null);
    setContent(null);
    setError(null);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AWS Bedrock Multimodal Content Viewer</h1>
        <p>Query your knowledge base and visualize multimodal content</p>
        {sessionId && (
          <div className="session-info">
            <span className="session-id">Session: {sessionId.slice(-8)}</span>
            <button 
              onClick={handleNewSession}
              className="new-session-button"
              title="Start new session"
            >
              New Session
            </button>
          </div>
        )}
      </header>
      
      <main className="App-main">
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