import { loadSessions, saveSessions } from "./file-store.js";
import logger from "../logger.js";

export interface Session {
  senderId: string;
  sdkSessionId?: string; // SDK session ID for resuming conversations
  lastActivity: Date;
  pendingInput?: string; // Original message if awaiting clarification
}

// In-memory store (authoritative at runtime)
const sessions = new Map<string, Session>();

/**
 * Initialize session store by loading from disk
 * Call this on application startup
 */
export async function initSessionStore(): Promise<void> {
  const loaded = await loadSessions();
  for (const [senderId, session] of loaded.entries()) {
    sessions.set(senderId, session);
  }
  logger.info({ count: sessions.size }, "Session store initialized");
}

export function getSession(senderId: string): Session | undefined {
  return sessions.get(senderId);
}

export function createSession(senderId: string): Session {
  const session: Session = {
    senderId,
    lastActivity: new Date(),
  };
  sessions.set(senderId, session);
  // Fire and forget - don't await
  saveSessions(sessions).catch((err) =>
    logger.error({ err }, "Failed to persist session"),
  );
  return session;
}

export function updateSession(
  senderId: string,
  updates: Partial<Omit<Session, "senderId">>,
): Session | undefined {
  const session = sessions.get(senderId);
  if (!session) return undefined;

  const updated: Session = {
    ...session,
    ...updates,
    lastActivity: new Date(),
  };
  sessions.set(senderId, updated);
  // Fire and forget - don't await
  saveSessions(sessions).catch((err) =>
    logger.error({ err }, "Failed to persist session"),
  );
  return updated;
}

export function deleteSession(senderId: string): boolean {
  const deleted = sessions.delete(senderId);
  if (deleted) {
    // Fire and forget - don't await
    saveSessions(sessions).catch((err) =>
      logger.error({ err }, "Failed to persist session deletion"),
    );
  }
  return deleted;
}

export function getOrCreateSession(senderId: string): Session {
  return getSession(senderId) ?? createSession(senderId);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

// For testing purposes - clear all sessions
export function clearAllSessions(): void {
  sessions.clear();
  // Fire and forget - don't await
  saveSessions(sessions).catch((err) =>
    logger.error({ err }, "Failed to persist session clear"),
  );
}
