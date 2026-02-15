// Feature: multimodal-content-viewer
// Enhanced Session Manager Hook with browser storage persistence and automatic recovery

import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionData, ConversationEntry, SessionManagerOptions } from '../types';

const SESSION_STORAGE_KEY = 'bedrock-multimodal-session';
const CONVERSATION_STORAGE_KEY = 'bedrock-multimodal-conversation';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface UseSessionManagerReturn {
  sessionId: string | null;
  conversationHistory: ConversationEntry[];
  isSessionActive: boolean;
  createNewSession: () => string;
  updateSession: (data: Partial<SessionData>) => void;
  addToConversation: (entry: ConversationEntry) => void;
  clearConversation: () => void;
  resetSession: () => void;
  getSessionStats: () => SessionStats;
}

interface SessionStats {
  sessionAge: number;
  conversationLength: number;
  lastActivity: Date | null;
  queryCount: number;
}

export function useSessionManager(options: SessionManagerOptions = {}): UseSessionManagerReturn {
  const {
    autoCreateSession = true,
    persistConversation = true,
    maxConversationEntries = 100,
    enableCleanup = true
  } = options;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());

  // Generate cryptographically secure session ID
  const generateSessionId = useCallback((): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }, []);

  // Load session from browser storage
  const loadSessionFromStorage = useCallback((): SessionData | null => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;

      const session: SessionData = JSON.parse(stored);
      
      // Validate session hasn't expired
      const now = Date.now();
      const sessionAge = now - new Date(session.createdAt).getTime();
      const timeSinceActivity = now - new Date(session.lastActivity).getTime();
      
      if (sessionAge > SESSION_TIMEOUT || timeSinceActivity > SESSION_TIMEOUT) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      return {
        ...session,
        createdAt: new Date(session.createdAt),
        lastActivity: new Date(session.lastActivity)
      };
    } catch (error) {
      console.warn('Failed to load session from storage:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }, []);

  // Save session to browser storage
  const saveSessionToStorage = useCallback((session: SessionData): void => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to save session to storage:', error);
    }
  }, []);

  // Load conversation from browser storage
  const loadConversationFromStorage = useCallback((): ConversationEntry[] => {
    if (!persistConversation) return [];

    try {
      const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      if (!stored) return [];

      const conversation: ConversationEntry[] = JSON.parse(stored);
      return conversation.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
    } catch (error) {
      console.warn('Failed to load conversation from storage:', error);
      localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      return [];
    }
  }, [persistConversation]);

  // Save conversation to browser storage
  const saveConversationToStorage = useCallback((conversation: ConversationEntry[]): void => {
    if (!persistConversation) return;

    try {
      // Keep only the most recent entries
      const trimmedConversation = conversation.slice(-maxConversationEntries);
      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(trimmedConversation));
    } catch (error) {
      console.warn('Failed to save conversation to storage:', error);
    }
  }, [persistConversation, maxConversationEntries]);

  // Create new session
  const createNewSession = useCallback((): string => {
    const newSessionId = generateSessionId();
    const now = new Date();
    
    const newSession: SessionData = {
      id: newSessionId,
      createdAt: now,
      lastActivity: now,
      queryCount: 0,
      context: {}
    };

    setSessionData(newSession);
    setIsSessionActive(true);
    saveSessionToStorage(newSession);
    lastActivityRef.current = now;

    console.log('Created new session:', newSessionId);
    return newSessionId;
  }, [generateSessionId, saveSessionToStorage]);

  // Update session data
  const updateSession = useCallback((updates: Partial<SessionData>): void => {
    if (!sessionData) return;

    const now = new Date();
    const updatedSession: SessionData = {
      ...sessionData,
      ...updates,
      lastActivity: now
    };

    setSessionData(updatedSession);
    saveSessionToStorage(updatedSession);
    lastActivityRef.current = now;
  }, [sessionData, saveSessionToStorage]);

  // Add entry to conversation history
  const addToConversation = useCallback((entry: ConversationEntry): void => {
    const newEntry = {
      ...entry,
      timestamp: new Date()
    };

    setConversationHistory(prev => {
      const updated = [...prev, newEntry];
      saveConversationToStorage(updated);
      return updated;
    });

    // Update session query count if it's a user query
    if (entry.type === 'query' && sessionData) {
      updateSession({ queryCount: sessionData.queryCount + 1 });
    }
  }, [sessionData, updateSession, saveConversationToStorage]);

  // Clear conversation history
  const clearConversation = useCallback((): void => {
    setConversationHistory([]);
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);
  }, []);

  // Reset session (create new session and clear conversation)
  const resetSession = useCallback((): void => {
    // Clean up old session
    if (sessionData) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    
    clearConversation();
    
    if (autoCreateSession) {
      createNewSession();
    } else {
      setSessionData(null);
      setIsSessionActive(false);
    }
  }, [sessionData, clearConversation, autoCreateSession, createNewSession]);

  // Get session statistics
  const getSessionStats = useCallback((): SessionStats => {
    if (!sessionData) {
      return {
        sessionAge: 0,
        conversationLength: conversationHistory.length,
        lastActivity: null,
        queryCount: 0
      };
    }

    return {
      sessionAge: Date.now() - sessionData.createdAt.getTime(),
      conversationLength: conversationHistory.length,
      lastActivity: sessionData.lastActivity,
      queryCount: sessionData.queryCount
    };
  }, [sessionData, conversationHistory.length]);

  // Session cleanup routine
  const performCleanup = useCallback((): void => {
    if (!sessionData) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current.getTime();

    // Check if session has expired
    if (timeSinceActivity > SESSION_TIMEOUT) {
      console.log('Session expired, cleaning up');
      resetSession();
      return;
    }

    // Clean up old conversation entries
    if (conversationHistory.length > maxConversationEntries) {
      const trimmed = conversationHistory.slice(-maxConversationEntries);
      setConversationHistory(trimmed);
      saveConversationToStorage(trimmed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, conversationHistory.length, maxConversationEntries]);

  // Initialize session manager
  useEffect(() => {
    // Load existing session and conversation
    const existingSession = loadSessionFromStorage();
    const existingConversation = loadConversationFromStorage();

    if (existingSession) {
      setSessionData(existingSession);
      setIsSessionActive(true);
      lastActivityRef.current = existingSession.lastActivity;
      console.log('Restored session:', existingSession.id);
    } else if (autoCreateSession) {
      createNewSession();
    }

    if (existingConversation.length > 0) {
      setConversationHistory(existingConversation);
    }

    // Set up cleanup interval
    if (enableCleanup) {
      cleanupIntervalRef.current = setInterval(performCleanup, CLEANUP_INTERVAL);
    }

    // Cleanup on unmount
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle page visibility change (cleanup on tab close)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Save current state before potential tab close
        if (sessionData) {
          saveSessionToStorage(sessionData);
        }
        if (conversationHistory.length > 0) {
          saveConversationToStorage(conversationHistory);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionData, conversationHistory, saveSessionToStorage, saveConversationToStorage]);

  // Handle beforeunload (browser close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Final save before page unload
      if (sessionData) {
        saveSessionToStorage(sessionData);
      }
      if (conversationHistory.length > 0) {
        saveConversationToStorage(conversationHistory);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionData, conversationHistory, saveSessionToStorage, saveConversationToStorage]);

  return {
    sessionId: sessionData?.id || null,
    conversationHistory,
    isSessionActive,
    createNewSession,
    updateSession,
    addToConversation,
    clearConversation,
    resetSession,
    getSessionStats
  };
}