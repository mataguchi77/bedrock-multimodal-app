// Feature: multimodal-content-viewer
// Main App component with comprehensive error handling, performance optimization, and session management

import { useState, useCallback, useEffect } from 'react';
import './App.css';
import QueryInterface from './components/QueryInterface';
import ContentViewer from './components/ContentViewer';
import SessionManager from './components/SessionManager';
import ErrorBoundary from './components/ErrorBoundary';
import { useSessionManager } from './hooks/useSessionManager';
import { MultimodalContent, QueryResponse, ConversationEntry } from './types';
import { 
  handleApiError, 
  handleNetworkError, 
  addErrorListener,
  ErrorDetails 
} from './utils/errorHandler';
import { 
  cacheResponse, 
  getCachedResponse, 
  generateQueryCacheKey,
  measurePerformance,
  preloadCriticalResources
} from './utils/performanceOptimizer';

function App() {
  const [content, setContent] = useState<MultimodalContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<ErrorDetails | null>(null);

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

  // Set up global error listener
  useEffect(() => {
    const unsubscribe = addErrorListener((errorDetails) => {
      setGlobalError(errorDetails);
      
      // Auto-clear global error after 10 seconds
      setTimeout(() => {
        setGlobalError(null);
      }, 10000);
    });

    return unsubscribe;
  }, []);

  const handleQuerySubmit = useCallback(async (query: string) => {
    if (!sessionId) {
      handleApiError(
        new Error('No active session available'),
        { action: 'query_submit', query: query.substring(0, 50) }
      );
      setError('No active session. Please create a new session.');
      return;
    }

    setLoading(true);
    setError(null);
    setGlobalError(null);
    
    // Generate cache key and check cache first
    const cacheKey = generateQueryCacheKey(query, sessionId);
    const cachedResponse = getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      console.log('Using cached response for query');
      setContent(cachedResponse.content || null);
      setLoading(false);
      
      // Still add to conversation history
      const queryEntry: ConversationEntry = {
        id: `query_${Date.now()}`,
        type: 'query',
        content: query,
        timestamp: new Date(),
        sessionId,
        metadata: { characterCount: query.length, cached: true }
      };
      addToConversation(queryEntry);
      
      return;
    }
    
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
      const response = await measurePerformance('API Query', async () => {
        const apiResponse = await fetch('/api/invoke-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            sessionId,
          }),
          // Add timeout
          signal: AbortSignal.timeout(30000) // 30 seconds
        });

        if (!response.ok) {
          throw apiResponse;
        }

        return apiResponse.json();
      });

      const data: QueryResponse = response;
      
      if (data.success) {
        setContent(data.content || null);
        setError(null);
        
        // Cache the successful response
        cacheResponse(cacheKey, data, { ttl: 5 * 60 * 1000 }); // 5 minutes
        
        // Preload critical resources
        if (data.content) {
          preloadCriticalResources(data.content).catch(error => {
            console.warn('Failed to preload resources:', error);
          });
        }
        
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
              images: data.content?.images?.length || 0
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
        
        const errorDetails = handleApiError(
          new Error(errorMessage),
          { 
            action: 'query_failed', 
            query: query.substring(0, 50),
            sessionId 
          }
        );
        
        setError(errorDetails.message);
        setContent(null);
        
        // Add error to conversation history
        const errorEntry: ConversationEntry = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: errorDetails.message,
          timestamp: new Date(),
          sessionId: sessionId,
          metadata: { errorCode: 'QUERY_FAILED', originalError: errorMessage }
        };
        addToConversation(errorEntry);
      }
    } catch (error) {
      console.error('Network error:', error);
      
      const errorDetails = handleNetworkError(error, {
        action: 'query_network_error',
        query: query.substring(0, 50),
        sessionId
      });
      
      setError(errorDetails.message);
      setContent(null);
      
      // Add network error to conversation history
      const networkErrorEntry: ConversationEntry = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: errorDetails.message,
        timestamp: new Date(),
        sessionId: sessionId,
        metadata: { 
          errorCode: errorDetails.code || 'NETWORK_ERROR',
          statusCode: errorDetails.statusCode
        }
      };
      addToConversation(networkErrorEntry);
    } finally {
      setLoading(false);
    }
  }, [sessionId, addToConversation, updateSession]);

  const handleClear = useCallback(() => {
    setContent(null);
    setError(null);
    setGlobalError(null);
  }, []);

  const handleSessionChange = useCallback((newSessionId: string | null) => {
    // Clear current content when session changes
    setContent(null);
    setError(null);
    setGlobalError(null);
    console.log('Session changed to:', newSessionId);
  }, []);

  const handleGlobalErrorDismiss = useCallback(() => {
    setGlobalError(null);
  }, []);

  const handleErrorBoundaryError = useCallback((error: Error, errorInfo: any) => {
    handleApiError(error, {
      type: 'react_error_boundary',
      componentStack: errorInfo.componentStack
    });
  }, []);

  return (
    <ErrorBoundary onError={handleErrorBoundaryError}>
      <div className="App">
        <header className="App-header">
          <h1>AWS Bedrock Multimodal Content Viewer</h1>
          <p>Query your knowledge base and visualize multimodal content</p>
        </header>
        
        {/* Global error notification */}
        {globalError && (
          <div className="global-error-notification">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{globalError.message}</span>
              <button 
                onClick={handleGlobalErrorDismiss}
                className="error-dismiss"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        <main className="App-main">
          <ErrorBoundary
            fallback={
              <div className="component-error">
                <p>Session manager encountered an error. Please refresh the page.</p>
              </div>
            }
          >
            <SessionManager onSessionChange={handleSessionChange} />
          </ErrorBoundary>
          
          <ErrorBoundary
            fallback={
              <div className="component-error">
                <p>Query interface encountered an error. Please refresh the page.</p>
              </div>
            }
          >
            <QueryInterface 
              onSubmit={handleQuerySubmit} 
              loading={loading}
              onClear={handleClear}
            />
          </ErrorBoundary>
          
          <ErrorBoundary
            fallback={
              <div className="component-error">
                <p>Content viewer encountered an error. Please refresh the page.</p>
              </div>
            }
          >
            <ContentViewer 
              content={content} 
              loading={loading}
              error={error}
            />
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;