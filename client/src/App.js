import React, { useState } from 'react';
import './App.css';
import QueryInterface from './components/QueryInterface';
import ContentViewer from './components/ContentViewer';

function App() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const handleQuerySubmit = async (query) => {
    setLoading(true);
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

      const data = await response.json();
      
      if (data.success) {
        setContent(data.response);
        setSessionId(data.sessionId);
      } else {
        console.error('Error:', data.error);
        setContent(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      setContent(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AWS Bedrock Multimodal Content Viewer</h1>
        <p>Query your knowledge base and visualize multimodal content</p>
      </header>
      
      <main className="App-main">
        <QueryInterface onSubmit={handleQuerySubmit} loading={loading} />
        <ContentViewer content={content} loading={loading} />
      </main>
    </div>
  );
}

export default App;