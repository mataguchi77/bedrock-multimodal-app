"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const SessionManagerService_1 = require("../../src/services/SessionManagerService");
describe('Property 6: Session Lifecycle Management', () => {
    let sessionManager;
    beforeEach(() => {
        sessionManager = new SessionManagerService_1.SessionManagerService();
    });
    afterEach(() => {
        sessionManager.destroy();
    });
    test('should create unique session identifiers', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), (sessionCount) => {
            const sessionIds = new Set();
            for (let i = 0; i < sessionCount; i++) {
                const session = sessionManager.createSession();
                expect(sessionIds.has(session.id)).toBe(false);
                sessionIds.add(session.id);
            }
            expect(sessionIds.size).toBe(sessionCount);
        }), { numRuns: 50 });
    });
    test('should maintain session continuity across operations', () => {
        fc.assert(fc.property(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }), (queries) => {
            const session = sessionManager.createSession();
            const originalId = session.id;
            let currentSession = session;
            queries.forEach((query, index) => {
                const updated = sessionManager.updateSession(currentSession.id, {
                    context: { ...currentSession.context, [`query_${index}`]: query }
                });
                expect(updated).not.toBeNull();
                expect(updated.id).toBe(originalId);
                expect(updated.queryCount).toBe(index + 1);
                currentSession = updated;
            });
            const finalSession = sessionManager.getSession(originalId);
            expect(finalSession).not.toBeNull();
            expect(finalSession.id).toBe(originalId);
        }), { numRuns: 50 });
    });
    test('should handle session recovery automatically', () => {
        fc.assert(fc.property(fc.string({ minLength: 10, maxLength: 50 }), (invalidSessionId) => {
            const recoveredSession = sessionManager.createOrRecoverSession(invalidSessionId);
            expect(recoveredSession).toBeDefined();
            expect(recoveredSession.id).toBeDefined();
            expect(recoveredSession.createdAt).toBeInstanceOf(Date);
            expect(recoveredSession.queryCount).toBe(0);
            const validSession = sessionManager.createSession();
            const recoveredValidSession = sessionManager.createOrRecoverSession(validSession.id);
            expect(recoveredValidSession.id).toBe(validSession.id);
        }), { numRuns: 50 });
    });
    test('session properties should remain consistent', () => {
        fc.assert(fc.property(fc.record({
            queryCount: fc.integer({ min: 0, max: 100 }),
            contextData: fc.dictionary(fc.string(), fc.string())
        }), (updates) => {
            const session = sessionManager.createSession();
            const originalCreatedAt = session.createdAt;
            const originalId = session.id;
            const updated = sessionManager.updateSession(session.id, {
                queryCount: updates.queryCount,
                context: updates.contextData
            });
            expect(updated).not.toBeNull();
            expect(updated.id).toBe(originalId);
            expect(updated.createdAt).toEqual(originalCreatedAt);
            expect(updated.queryCount).toBe(updates.queryCount);
            expect(updated.context).toEqual(updates.contextData);
            expect(updated.lastActivity.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
        }), { numRuns: 100 });
    });
});
//# sourceMappingURL=session-management.properties.test.js.map