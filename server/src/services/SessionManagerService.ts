// Feature: multimodal-content-viewer
// Session Management Service with automatic recovery and persistence

import { Session } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class SessionManagerService {
  private sessions: Map<string, Session> = new Map();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup routine for expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  createSession(): Session {
    const session: Session = {
      id: this.generateSessionId(),
      createdAt: new Date(),
      lastActivity: new Date(),
      queryCount: 0,
      context: {}
    };

    this.sessions.set(session.id, session);
    console.log(`Created new session: ${session.id}`);
    
    return session;
  }

  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (this.isSessionExpired(session)) {
      this.sessions.delete(sessionId);
      console.log(`Session ${sessionId} expired and removed`);
      return null;
    }

    return session;
  }

  updateSession(sessionId: string, updates: Partial<Session>): Session | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    // Ensure lastActivity is always updated to current time
    const now = new Date();
    
    const updatedSession: Session = {
      ...session,
      ...updates,
      id: session.id, // Prevent ID changes
      createdAt: session.createdAt, // Prevent creation date changes
      lastActivity: now // Always update last activity to current time
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`Session ${sessionId} deleted`);
    }
    return deleted;
  }

  // Create new session with automatic recovery
  createOrRecoverSession(sessionId?: string): Session {
    if (sessionId) {
      const existingSession = this.getSession(sessionId);
      if (existingSession) {
        // Update last activity and return existing session
        return this.updateSession(sessionId, {})!;
      }
    }

    // Create new session if recovery failed or no session ID provided
    return this.createSession();
  }

  // Get session statistics
  getSessionStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        session => !this.isSessionExpired(session)
      ).length
    };
  }

  private generateSessionId(): string {
    return `session_${uuidv4()}`;
  }

  private isSessionExpired(session: Session): boolean {
    const now = new Date().getTime();
    const lastActivity = session.lastActivity.getTime();
    return (now - lastActivity) > this.sessionTimeout;
  }

  private cleanupExpiredSessions(): void {
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  // Graceful shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }

  // Additional methods for property-based testing
  resetAndCreateNewSession(forceCleanup: boolean = false): Session {
    if (forceCleanup) {
      this.sessions.clear();
    }
    return this.createSession();
  }

  getActiveSessionCount(): number {
    return Array.from(this.sessions.values()).filter(
      session => !this.isSessionExpired(session)
    ).length;
  }

  getCurrentSession(): Session | null {
    // Return the most recently active session
    let mostRecent: Session | null = null;
    let latestActivity = 0;

    for (const session of this.sessions.values()) {
      if (!this.isSessionExpired(session)) {
        const activityTime = session.lastActivity.getTime();
        if (activityTime > latestActivity) {
          latestActivity = activityTime;
          mostRecent = session;
        }
      }
    }

    return mostRecent;
  }

  setSystemConfiguration(config: Record<string, string>): void {
    // Store system configuration (mock implementation)
    (this as any).systemConfig = config;
  }

  getSystemConfiguration(): Record<string, string> {
    return (this as any).systemConfig || {};
  }

  setUserPreferences(preferences: Record<string, any>): void {
    // Store user preferences (mock implementation)
    (this as any).userPreferences = preferences;
  }

  getUserPreferences(): Record<string, any> {
    return (this as any).userPreferences || {};
  }
}