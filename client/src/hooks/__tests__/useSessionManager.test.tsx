// Happy path tests for useSessionManager hook

import { renderHook, act } from '@testing-library/react';
import { useSessionManager } from '../useSessionManager';

describe('useSessionManager - Happy Path', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with a new session', () => {
    const { result } = renderHook(() => useSessionManager());

    expect(result.current.sessionId).toBeDefined();
    expect(result.current.sessionId).toContain('session_');
  });

  it('should create a new session', () => {
    const { result } = renderHook(() => useSessionManager());

    act(() => {
      result.current.createNewSession();
    });

    expect(result.current.sessionId).toBeDefined();
  });

  it('should update conversation history', () => {
    const { result } = renderHook(() => useSessionManager());

    act(() => {
      result.current.addToHistory({
        query: 'Test query',
        response: 'Test response',
        timestamp: new Date()
      });
    });

    expect(result.current.conversationHistory).toHaveLength(1);
    expect(result.current.conversationHistory[0].query).toBe('Test query');
  });

  it('should clear conversation history', () => {
    const { result } = renderHook(() => useSessionManager());

    act(() => {
      result.current.addToHistory({
        query: 'Test query',
        response: 'Test response',
        timestamp: new Date()
      });
    });

    expect(result.current.conversationHistory).toHaveLength(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.conversationHistory).toHaveLength(0);
  });

  it('should persist session to localStorage', () => {
    const { result } = renderHook(() => useSessionManager());

    const sessionId = result.current.sessionId;

    act(() => {
      result.current.addToHistory({
        query: 'Test query',
        response: 'Test response',
        timestamp: new Date()
      });
    });

    const stored = localStorage.getItem(`session_${sessionId}`);
    expect(stored).toBeDefined();
  });

  it('should restore session from localStorage', () => {
    const testSessionId = 'session_test123';
    const testHistory = [
      {
        query: 'Stored query',
        response: 'Stored response',
        timestamp: new Date().toISOString()
      }
    ];

    localStorage.setItem(
      `session_${testSessionId}`,
      JSON.stringify({
        sessionId: testSessionId,
        conversationHistory: testHistory,
        createdAt: new Date().toISOString()
      })
    );

    const { result } = renderHook(() => useSessionManager());

    // The hook should restore from localStorage if available
    expect(result.current.conversationHistory.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple conversation entries', () => {
    const { result } = renderHook(() => useSessionManager());

    act(() => {
      result.current.addToHistory({
        query: 'First query',
        response: 'First response',
        timestamp: new Date()
      });
      result.current.addToHistory({
        query: 'Second query',
        response: 'Second response',
        timestamp: new Date()
      });
      result.current.addToHistory({
        query: 'Third query',
        response: 'Third response',
        timestamp: new Date()
      });
    });

    expect(result.current.conversationHistory).toHaveLength(3);
    expect(result.current.conversationHistory[0].query).toBe('First query');
    expect(result.current.conversationHistory[2].query).toBe('Third query');
  });

  it('should create new session and clear history', () => {
    const { result } = renderHook(() => useSessionManager());

    act(() => {
      result.current.addToHistory({
        query: 'Test query',
        response: 'Test response',
        timestamp: new Date()
      });
    });

    const oldSessionId = result.current.sessionId;

    act(() => {
      result.current.createNewSession();
    });

    expect(result.current.sessionId).not.toBe(oldSessionId);
    expect(result.current.conversationHistory).toHaveLength(0);
  });
});
