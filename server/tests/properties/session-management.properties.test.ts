// Feature: multimodal-content-viewer, Property 6: Session Lifecycle Management
// For any user session, the system should create unique session identifiers, maintain continuity across queries, and handle session recovery automatically

import * as fc from 'fast-check';
import { SessionManagerService } from '../../src/services/SessionManagerService';

describe('Property 6: Session Lifecycle Management', () => {
  let sessionManager: SessionManagerService;

  beforeEach(() => {
    sessionManager = new SessionManagerService();
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  test('should create unique session identifiers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (sessionCount) => {
          const sessionIds = new Set<string>();
          
          for (let i = 0; i < sessionCount; i++) {
            const session = sessionManager.createSession();
            expect(sessionIds.has(session.id)).toBe(false);
            sessionIds.add(session.id);
          }
          
          expect(sessionIds.size).toBe(sessionCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should maintain session continuity across operations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        (queries) => {
          const session = sessionManager.createSession();
          const originalId = session.id;
          let currentSession = session;
          
          queries.forEach((query, index) => {
            const updated = sessionManager.updateSession(currentSession.id, {
              queryCount: currentSession.queryCount + 1, // Explicitly increment query count
              context: { ...currentSession.context, [`query_${index}`]: query }
            });
            
            expect(updated).not.toBeNull();
            expect(updated!.id).toBe(originalId);
            expect(updated!.queryCount).toBe(index + 1);
            currentSession = updated!;
          });
          
          const finalSession = sessionManager.getSession(originalId);
          expect(finalSession).not.toBeNull();
          expect(finalSession!.id).toBe(originalId);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should handle session recovery automatically', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 50 }),
        (invalidSessionId) => {
          // Test recovery with invalid session ID
          const recoveredSession = sessionManager.createOrRecoverSession(invalidSessionId);
          
          expect(recoveredSession).toBeDefined();
          expect(recoveredSession.id).toBeDefined();
          expect(recoveredSession.createdAt).toBeInstanceOf(Date);
          expect(recoveredSession.queryCount).toBe(0);
          
          // Test recovery with valid session ID
          const validSession = sessionManager.createSession();
          const recoveredValidSession = sessionManager.createOrRecoverSession(validSession.id);
          
          expect(recoveredValidSession.id).toBe(validSession.id);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('session properties should remain consistent', () => {
    fc.assert(
      fc.property(
        fc.record({
          queryCount: fc.integer({ min: 0, max: 100 }),
          contextData: fc.dictionary(fc.string(), fc.string())
        }),
        (updates) => {
          const session = sessionManager.createSession();
          const originalCreatedAt = session.createdAt;
          const originalId = session.id;
          
          // Small delay to ensure lastActivity > createdAt (synchronous approach)
          const startTime = Date.now();
          while (Date.now() - startTime < 1) {
            // Busy wait for 1ms to ensure time difference
          }
          
          const updated = sessionManager.updateSession(session.id, {
            queryCount: updates.queryCount,
            context: updates.contextData
          });
          
          expect(updated).not.toBeNull();
          expect(updated!.id).toBe(originalId); // ID should never change
          expect(updated!.createdAt).toEqual(originalCreatedAt); // Creation date should never change
          expect(updated!.queryCount).toBe(updates.queryCount);
          expect(updated!.context).toEqual(updates.contextData);
          expect(updated!.lastActivity.getTime()).toBeGreaterThanOrEqual(originalCreatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});