// Feature: multimodal-content-viewer
// Session Manager Component with visual session controls and status display

import { useCallback } from 'react';
import { useSessionManager } from '../hooks/useSessionManager';
import './SessionManager.css';

interface SessionManagerProps {
  onSessionChange?: (sessionId: string | null) => void;
  className?: string;
}

const SessionManager: React.FC<SessionManagerProps> = ({ 
  onSessionChange, 
  className = '' 
}) => {
  const {
    sessionId,
    conversationHistory,
    isSessionActive,
    createNewSession,
    clearConversation,
    resetSession,
    getSessionStats
  } = useSessionManager({
    autoCreateSession: true,
    persistConversation: true,
    maxConversationEntries: 100,
    enableCleanup: true
  });

  const stats = getSessionStats();

  // Handle session creation
  const handleNewSession = useCallback(() => {
    const newSessionId = createNewSession();
    onSessionChange?.(newSessionId);
  }, [createNewSession, onSessionChange]);

  // Handle session reset
  const handleResetSession = useCallback(() => {
    resetSession();
    onSessionChange?.(null);
  }, [resetSession, onSessionChange]);

  // Handle conversation clear
  const handleClearConversation = useCallback(() => {
    clearConversation();
  }, [clearConversation]);

  // Format session age for display
  const formatSessionAge = (ageMs: number): string => {
    const minutes = Math.floor(ageMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  // Format last activity time
  const formatLastActivity = (lastActivity: Date | null): string => {
    if (!lastActivity) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className={`session-manager ${className}`}>
      <div className="session-status">
        <div className="session-indicator">
          <div 
            className={`status-dot ${isSessionActive ? 'active' : 'inactive'}`}
            title={isSessionActive ? 'Session active' : 'No active session'}
          />
          <span className="session-label">
            {isSessionActive ? 'Active Session' : 'No Session'}
          </span>
        </div>

        {sessionId && (
          <div className="session-info">
            <span className="session-id" title={`Session ID: ${sessionId}`}>
              {sessionId.slice(-8)}
            </span>
          </div>
        )}
      </div>

      {isSessionActive && (
        <div className="session-stats">
          <div className="stat-item">
            <span className="stat-label">Age:</span>
            <span className="stat-value">{formatSessionAge(stats.sessionAge)}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Queries:</span>
            <span className="stat-value">{stats.queryCount}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Messages:</span>
            <span className="stat-value">{stats.conversationLength}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Last Activity:</span>
            <span className="stat-value">{formatLastActivity(stats.lastActivity)}</span>
          </div>
        </div>
      )}

      <div className="session-controls">
        <button
          onClick={handleNewSession}
          className="session-button new-session"
          title="Create new session"
          aria-label="Create new session"
        >
          New Session
        </button>

        {conversationHistory.length > 0 && (
          <button
            onClick={handleClearConversation}
            className="session-button clear-conversation"
            title="Clear conversation history"
            aria-label="Clear conversation history"
          >
            Clear History
          </button>
        )}

        {isSessionActive && (
          <button
            onClick={handleResetSession}
            className="session-button reset-session"
            title="Reset session and clear all data"
            aria-label="Reset session"
          >
            Reset
          </button>
        )}
      </div>

      {conversationHistory.length > 0 && (
        <div className="conversation-summary">
          <details className="conversation-details">
            <summary className="conversation-summary-header">
              Conversation History ({conversationHistory.length} entries)
            </summary>
            
            <div className="conversation-list">
              {conversationHistory.slice(-5).map((entry) => (
                <div key={entry.id} className={`conversation-entry ${entry.type}`}>
                  <div className="entry-header">
                    <span className="entry-type">{entry.type}</span>
                    <span className="entry-time">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="entry-content">
                    {entry.content.length > 100 
                      ? `${entry.content.substring(0, 100)}...`
                      : entry.content
                    }
                  </div>
                </div>
              ))}
              
              {conversationHistory.length > 5 && (
                <div className="conversation-more">
                  ... and {conversationHistory.length - 5} more entries
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default SessionManager;