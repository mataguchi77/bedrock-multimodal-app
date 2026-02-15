// Happy path tests for useSessionManager hook

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionManager } from '../useSessionManager';

describe('useSessionManager - Happy Path', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Use fake timers to speed up tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with a new session', async () => {
    const { result } = renderHook(() => useSessionManager());

    await waitFor(() => {
      expect(result.current.sessionId).toBeDefined();
    }, { timeout: 100 });
    
    expect(result.current.sessionId).toContain('');
    expect(result.current.isSessionActive).toBe(true);
  });

  it('should create a new session', async () => {
    const { result } = renderHook(() => useSessionManager());

    await waitFor(() => {
      expect(result.current.sessionId).toBeDefined();
    }, { timeout: 100 });

    const oldSessionId = result.current.sessionId;

    act(() => {
      result.current.createNewSession();
    });

    expect(result.current.sessionId).toBeDefined();
    expect(result.current.sessionId).not.toBe(oldSessionId);
  });

  it('should add to conversation history', async () => {
    const { result } = renderHook(() => useSessionManager());

    await waitFor(() => {
      expect(result.current.sessionId).toBeDefined();
    }, { timeout: 100 });

    act(() => {
      result.current.addToConversation({
        id: 'test-1',
        type: 'query',
        content: 'Test query',
        timestamp: new Date(),
        sessionId: result.current.sessionId || 'test-session'
      });
    });

    await waitFor(() => {
      expect(result.current.conversationHistory).toHaveLength(1);
    }, { timeout: 100 });
    
    expect(result.current.conversationHistory[0]?.content).toBe('Test query');
  });

  it('should clear conversation history', async () => {
    const { result } = renderHook(() => useSessionManager());

    await waitFor(() => {
      expect(result.current.sessionId).toBeDefined();
    }, { timeout: 100 });

    act(() => {
      result.current.addToConversation({
        id: 'test-1',
        type: 'query',
        content: 'Test query',
        timestamp: new Date(),
        sessionId: result.current.sessionId || 'test-session'
      });
    });

    await waitFor(() => {
      expect(result.current.conversationHistory).toHaveLength(1);
    }, { timeout: 100 });

    act(() => {
      result.current.clearConversation();
    });

    expect(result.current.conversationHistory).toHaveLength(0);
  });

  it('should get session statistics', async () => {
    const { result } = renderHook(() => useSessionManager());

    await waitFor(() => {
      expect(result.current.sessionId).toBeDefined();
    }, { timeout: 100 });

    const stats = result.current.getSessionStats();

    expect(stats).toHaveProperty('sessionAge');
    expect(stats).toHaveProperty('conversationLength');
    expect(stats).toHaveProperty('queryCount');
  });
});
