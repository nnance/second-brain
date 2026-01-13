export interface Session {
  senderId: string;
  sdkSessionId?: string; // SDK session ID for resuming conversations
  lastActivity: Date;
  pendingInput?: string; // Original message if awaiting clarification
}

// In-memory store
const sessions = new Map<string, Session>();

export function getSession(senderId: string): Session | undefined {
  return sessions.get(senderId);
}

export function createSession(senderId: string): Session {
  const session: Session = {
    senderId,
    lastActivity: new Date(),
  };
  sessions.set(senderId, session);
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
  return updated;
}

export function deleteSession(senderId: string): boolean {
  return sessions.delete(senderId);
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
}
