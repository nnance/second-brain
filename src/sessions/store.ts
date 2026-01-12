/**
 * Simplified message type for conversation history.
 * Compatible with Anthropic's MessageParam type.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Session {
  senderId: string;
  chatGuid: string; // iMessage chat thread ID for sending messages
  history: ConversationMessage[];
  lastActivity: Date;
  pendingInput?: string; // Original message if awaiting clarification
}

// In-memory store
const sessions = new Map<string, Session>();

export function getSession(senderId: string): Session | undefined {
  return sessions.get(senderId);
}

export function createSession(senderId: string, chatGuid: string): Session {
  const session: Session = {
    senderId,
    chatGuid,
    history: [],
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
    senderId, // Ensure senderId is never overwritten
    lastActivity: new Date(),
  };
  sessions.set(senderId, updated);
  return updated;
}

export function deleteSession(senderId: string): boolean {
  return sessions.delete(senderId);
}

export function getOrCreateSession(
  senderId: string,
  chatGuid: string,
): Session {
  const existing = getSession(senderId);
  if (existing) {
    // Update chatGuid in case it changed
    existing.chatGuid = chatGuid;
    return existing;
  }
  return createSession(senderId, chatGuid);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

// Clear all sessions (useful for testing)
export function clearAllSessions(): void {
  sessions.clear();
}
