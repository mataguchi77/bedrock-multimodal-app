// Feature: multimodal-content-viewer
// Property-based tests for useSessionManager hook
// Property 6: Session Lifecycle Management
// Property 12: Session Reset Behavior

import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { useSessionManager } from '../useSessionManager';
import { ConversationEntry } from '../../types';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock crypto.getRandomValues for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

describe('useSessionManager Property-Based Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // Property 6: Session Lifecycle Management
  describe('Property 6: Session Lifecycle Management', () => {
    it('should maintain session consistency throughout lifecycle', () => {
      fc.assert(fc.property(
        fc.boolean(), // autoCreateSession
        fc.boolean(), // persistConversation
        fc.integer({ min: 10, max: 200 }), // maxConversationEntries
        (autoCreateSession, persistConversation, maxConversationEntries) => {
          const { result } = renderHook(() => useSessionManager({
            autoCreateSession,
            persistConversation,
            maxConversationEntries,
            enableCleanup: false // Disable for testing
          }));

          // Property: If autoCreateSession is true, session should be created automatically
          if (autoCreateSession) {
            expect(result.current.sessionId).toBeTruthy();
            expect(result.current.isSessionActive).toBe(true);
          } else {
            expect(result.current.sessionId).toBeNull();
            expect(result.current.isSessionActive).toBe(false);
          }

          // Property: Session stats should be consistent with session state
          const stats = result.current.getSessionStats();
          if (result.current.isSessionActive) {
            expect(stats.sessionAge).toBeGreaterThanOrEqual(0);
            expect(stats.queryCount).toBe(0); // New session should have 0 queries
          } else {
            expect(stats.sessionAge).toBe(0);
            expect(stats.lastActivity).toBeNull();
          }

          // Property: Conversation history should be empty for new sessions
          expect(result.current.conversationHistory).toHaveLength(0);
        }
      ), { numRuns: 50 });
    });

    it('should handle session updates correctly', () => {
      fc.assert(fc.property(
        fc.record({
          queryCount: fc.integer({ min: 0, max: 100 }),
          context: fc.dictionary(fc.string(), fc.anything())
        }),
        (updateData) => {
          const { result } = renderHook(() => useSessionManager({
            autoCreateSession: true,
            enableCleanup: false
          }));

          const initialSessionId = result.current.sessionId;
          const initialStats = result.current.getSessionStats();

          act(() => {
            result.current.updateSession(updateData);
          });

          // Property: Session ID should remain the same after update
          expect(result.current.sessionId).toBe(initialSessionId);

          // Property: Session should still be active after update
          expect(result.current.isSessionActive).toBe(true);

          // Property: Stats should reflect the update
          const updatedStats = result.current.getSessionStats();
          expect(updatedStats.sessionAge).toBeGreaterThanOrEqual(initialStats.sessionAge);
          expect(updatedStats.lastActivity).toBeTruthy();
        }
      ), { numRuns: 30 });
    });

    it('should manage conversation history correctly', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            type: fc.constantFrom('query', 'response', 'error'),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            sessionId: fc.string({ minLength: 1, maxLength: 32 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.integer({ min: 10, max: 100 }),
        (conversationEntries, maxEntries) => {
          const { result } = renderHook(() => useSessionManager({
            autoCreateSession: true,
            persistConversation: true,
            maxConversationEntries: maxEntries,
            enableCleanup: false
          }));

          const sessionId = result.current.sessionId!;

          // Add conversation entries
          conversationEntries.forEach(entry => {
            const conversationEntry: ConversationEntry = {
              ...entry,
              sessionId,
              timestamp: new Date()
            };

            act(() => {
              result.current.addToConversation(conversationEntry);
            });
          });

          // Property: Conversation history should not exceed max entries
          expect(result.current.conversationHistory.length).toBeLessThanOrEqual(maxEntries);

          // Property: If entries exceed max, only the most recent should be kept
          if (conversationEntries.length > maxEntries) {
            expect(result.current.conversationHistory.length).toBe(maxEntries);
          } else {
            expect(result.current.conversationHistory.length).toBe(conversationEntries.length);
          }

          // Property: All entries should have valid timestamps
          result.current.conversationHistory.forEach(entry => {
            expect(entry.timestamp).toBeInstanceOf(Date);
            expect(entry.sessionId).toBe(sessionId);
          });

          // Property: Query count should be updated for query entries
          const queryCount = conversationEntries.filter(e => e.type === 'query').length;
          const stats = result.current.getSessionStats();
          expect(stats.queryCount).toBe(Math.min(queryCount, maxEntries));
        }
      ), { numRuns: 20 });
    });
  });

  // Property 12: Session Reset Behavior
  describe('Property 12: Session Reset Behavior', () => {
    it('should reset session completely', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            type: fc.constantFrom('query', 'response', 'error'),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            sessionId: fc.string({ minLength: 1, maxLength: 32 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (conversationEntries) => {
          const { result } = renderHook(() => useSessionManager({
            autoCreateSession: true,
            persistConversation: true,
            enableCleanup: false
          }));

          const originalSessionId = result.current.sessionId;

          // Add some conversation entries
          conversationEntries.forEach(entry => {
            const conversationEntry: ConversationEntry = {
              ...entry,
              sessionId: originalSessionId!,
              timestamp: new Date()
            };

            act(() => {
              result.current.addToConversation(conversationEntry);
            });
          });

          // Update session with some data
          act(() => {
            result.current.updateSession({
              queryCount: 5,
              context: { testData: 'some data' }
            });
          });

          // Verify we have data before reset
          expect(result.current.conversationHistory.length).toBeGreaterThan(0);
          expect(result.current.getSessionStats().queryCount).toBeGreaterThan(0);

          // Reset session
          act(() => {
            result.current.resetSession();
          });

          // Property: New session should be created after reset
          expect(result.current.sessionId).toBeTruthy();
          expect(result.current.sessionId).not.toBe(originalSessionId);

          // Property: Session should be active after reset
          expect(result.current.isSessionActive).toBe(true);

          // Property: Conversation history should be cleared
          expect(result.current.conversationHistory).toHaveLength(0);

          // Property: Session stats should be reset
          const resetStats = result.current.getSessionStats();
          expect(resetStats.queryCount).toBe(0);
          expect(resetStats.conversationLength).toBe(0);
          expect(resetStats.sessionAge).toBeLessThan(1000); // Should be very recent
        }
      ), { numRuns: 20 });
    });

    it('should clear conversation independently of session reset', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            type: fc.constantFrom('query', 'response', 'error'),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            sessionId: fc.string({ minLength: 1, maxLength: 32 })
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (conversationEntries) => {
          const { result } = renderHook(() => useSessionManager({
            autoCreateSession: true,
            persistConversation: true,
            enableCleanup: false
          }));

          const originalSessionId = result.current.sessionId;

          // Add conversation entries
          conversationEntries.forEach(entry => {
            const conversationEntry: ConversationEntry = {
              ...entry,
              sessionId: originalSessionId!,
              timestamp: new Date()
            };

            act(() => {
              result.current.addToConversation(conversationEntry);
            });
          });

          // Verify we have conversation data
          expect(result.current.conversationHistory.length).toBeGreaterThan(0);

          // Clear conversation only
          act(() => {
            result.current.clearConversation();
          });

          // Property: Session ID should remain the same
          expect(result.current.sessionId).toBe(originalSessionId);

          // Property: Session should still be active
          expect(result.current.isSessionActive).toBe(true);

          // Property: Conversation history should be cleared
          expect(result.current.conversationHistory).toHaveLength(0);

          // Property: Session stats should reflect cleared conversation
          const stats = result.current.getSessionStats();
          expect(stats.conversationLength).toBe(0);
          // Note: queryCount is maintained in session data, not conversation history
        }
      ), { numRuns: 20 });
    });

    it('should handle session creation consistently', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 10 }),
        (iterations) => {
          const { result } = renderHook(() => useSessionManager({
            autoCreateSession: false, // Start without auto-creation
            enableCleanup: false
          }));

          // Initially should have no session
          expect(result.current.sessionId).toBeNull();
          expect(result.current.isSessionActive).toBe(false);

          const createdSessionIds: string[] = [];

          // Create multiple sessions
          for (let i = 0; i < iterations; i++) {
            act(() => {
              const newSessionId = result.current.createNewSession();
              createdSessionIds.push(newSessionId);
            });

            // Property: Each session ID should be unique
            const uniqueIds = new Set(createdSessionIds);
            expect(uniqueIds.size).toBe(createdSessionIds.length);

            // Property: Session should be active after creation
            expect(result.current.isSessionActive).toBe(true);
            expect(result.current.sessionId).toBe(createdSessionIds[i]);

            // Property: New session should have clean state
            const stats = result.current.getSessionStats();
            expect(stats.queryCount).toBe(0);
            expect(stats.conversationLength).toBe(0);
          }
        }
      ), { numRuns: 10 });
    });
  });

  // Integration property tests
  describe('Integration Properties', () => {
    it('should maintain data consistency across operations', () => {
      fc.assert(fc.property(
        fc.array(
          fc.oneof(
            fc.constant('createSession'),
            fc.constant('resetSession'),
            fc.constant('clearConversation'),
            fc.record({
              operation: fc.constant('addConversation'),
              entry: fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                type: fc.constantFrom('query', 'response', 'error'),
                content: fc.string({ minLength: 1, maxLength: 200 })
              })
            })
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (operations) => {
          const { result } = renderHook(() => useSessionManager({
            autoCreateSession: true,
            persistConversation: true,
            maxConversationEntries: 50,
            enableCleanup: false
          }));

          operations.forEach(operation => {
            if (operation === 'createSession') {
              act(() => {
                result.current.createNewSession();
              });
            } else if (operation === 'resetSession') {
              act(() => {
                result.current.resetSession();
              });
            } else if (operation === 'clearConversation') {
              act(() => {
                result.current.clearConversation();
              });
            } else if (typeof operation === 'object' && operation.operation === 'addConversation') {
              const conversationEntry: ConversationEntry = {
                ...operation.entry,
                sessionId: result.current.sessionId || 'test-session',
                timestamp: new Date()
              };

              act(() => {
                result.current.addToConversation(conversationEntry);
              });
            }

            // Property: Session state should always be consistent
            const stats = result.current.getSessionStats();
            
            if (result.current.isSessionActive) {
              expect(result.current.sessionId).toBeTruthy();
              expect(stats.sessionAge).toBeGreaterThanOrEqual(0);
              expect(stats.lastActivity).toBeTruthy();
            } else {
              expect(result.current.sessionId).toBeNull();
              expect(stats.sessionAge).toBe(0);
              expect(stats.lastActivity).toBeNull();
            }

            // Property: Conversation length should match actual history length
            expect(stats.conversationLength).toBe(result.current.conversationHistory.length);

            // Property: All conversation entries should have valid structure
            result.current.conversationHistory.forEach(entry => {
              expect(entry.id).toBeTruthy();
              expect(['query', 'response', 'error']).toContain(entry.type);
              expect(entry.content).toBeTruthy();
              expect(entry.timestamp).toBeInstanceOf(Date);
              expect(entry.sessionId).toBeTruthy();
            });
          });
        }
      ), { numRuns: 15 });
    });
  });
});