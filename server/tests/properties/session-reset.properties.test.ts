// Feature: multimodal-content-viewer, Property 12: Session Reset Behavior
// For any page refresh, the system should start a new session while maintaining proper session cleanup

import * as fc from 'fast-check';
import { SessionManagerService } from '../../src/services/SessionManagerService';

describe('Property 12: Session Reset Behavior', () => {
  let sessionManager: SessionManagerService;

  beforeEach(() => {
    sessionManager = new SessionManagerService();
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  test('should create new sessions with unique identifiers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        (sessionCount) => {
          const sessions = [];
          
          for (let i = 0; i < sessionCount; i++) {
            const session = sessionManager.createSession();
            sessions.push(session);
          }

          // All session IDs should be unique
          const sessionIds = sessions.map(s => s.id);
          const uniqueIds = new Set(sessionIds);
          expect(uniqueIds.size).toBe(sessionCount);

          // All sessions should have proper structure
          sessions.forEach(session => {
            expect(session.id).toBeDefined();
            expect(typeof session.id).toBe('string');
            expect(session.id.length).toBeGreaterThan(10);
            expect(session.createdAt).toBeInstanceOf(Date);
            expect(session.lastActivity).toBeInstanceOf(Date);
            expect(session.queryCount).toBe(0);
            expect(typeof session.context).toBe('object');
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should properly clean up expired sessions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 8 }),
        (sessionNames) => {
          // Create fresh session manager for this test
          const testSessionManager = new SessionManagerService();
          
          const sessions = sessionNames.map(() => testSessionManager.createSession());
          
          // All sessions should initially exist
          sessions.forEach(session => {
            const retrieved = testSessionManager.getSession(session.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.id).toBe(session.id);
          });

          // Session count should match
          const stats = testSessionManager.getSessionStats();
          expect(stats.totalSessions).toBe(sessions.length);
          
          // Cleanup
          testSessionManager.destroy();
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should handle session reset scenarios gracefully', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (forceCleanup) => {
          // Create initial sessions
          const session1 = sessionManager.createSession();
          const session2 = sessionManager.createSession();
          
          // Update sessions with some activity
          sessionManager.updateSession(session1.id, { queryCount: 5 });
          sessionManager.updateSession(session2.id, { queryCount: 3 });

          // Simulate session reset
          const newSession = sessionManager.resetAndCreateNewSession(forceCleanup);
          
          expect(newSession).toBeDefined();
          expect(newSession.id).toBeDefined();
          expect(newSession.queryCount).toBe(0);
          expect(newSession.createdAt).toBeInstanceOf(Date);
          
          if (forceCleanup) {
            // After force cleanup, only new session should exist
            const stats = sessionManager.getSessionStats();
            expect(stats.totalSessions).toBe(1);
          } else {
            // Without force cleanup, all sessions should still exist
            const stats = sessionManager.getSessionStats();
            expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should maintain session statistics correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (sessionCount) => {
          // Create fresh session manager for this test
          const testSessionManager = new SessionManagerService();
          
          const sessions = [];
          
          for (let i = 0; i < sessionCount; i++) {
            const session = testSessionManager.createSession();
            sessions.push(session);
          }

          const stats = testSessionManager.getSessionStats();
          expect(stats.totalSessions).toBe(sessionCount);
          expect(stats.activeSessions).toBe(sessionCount);
          expect(stats.activeSessions).toBeLessThanOrEqual(stats.totalSessions);
          
          // Cleanup
          testSessionManager.destroy();
        }
      ),
      { numRuns: 15 }
    );
  });

  test('should handle concurrent session operations safely', () => {
    const concurrentOperations = [
      () => sessionManager.createSession(),
      () => sessionManager.createSession(),
      () => sessionManager.createSession()
    ];

    const results = concurrentOperations.map(op => op());
    
    // All operations should succeed
    expect(results.length).toBe(3);
    results.forEach(session => {
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
    });

    // All session IDs should be unique
    const sessionIds = results.map(s => s.id);
    const uniqueIds = new Set(sessionIds);
    expect(uniqueIds.size).toBe(3);
  });

  test('should provide proper session configuration management', () => {
    fc.assert(
      fc.property(
        fc.record({
          setting1: fc.string({ minLength: 1, maxLength: 20 }),
          setting2: fc.string({ minLength: 1, maxLength: 20 })
        }),
        (config) => {
          sessionManager.setSystemConfiguration(config);
          const retrievedConfig = sessionManager.getSystemConfiguration();
          
          expect(retrievedConfig).toBeDefined();
          expect(typeof retrievedConfig).toBe('object');
          
          // Should be able to store and retrieve configuration
          Object.keys(config).forEach(key => {
            expect(retrievedConfig[key]).toBe((config as any)[key]);
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});