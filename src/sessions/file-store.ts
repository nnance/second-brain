import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import logger from "../logger.js";
import type { Session } from "./store.js";

/**
 * Interface for serialized session data (dates as ISO strings)
 */
interface SerializedSession {
  senderId: string;
  sdkSessionId?: string;
  lastActivity: string;
  pendingInput?: string;
}

/**
 * File-based session store that persists sessions to disk
 */
export class FileSessionStore {
  private sessions: Map<string, Session>;
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir =
      dataDir ??
      process.env.SECOND_BRAIN_DATA_DIR ??
      join(homedir(), ".second-brain");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.filePath = join(dir, "sessions.json");
    this.sessions = new Map();
    this.load();
  }

  /**
   * Load sessions from the JSON file
   */
  private load(): void {
    try {
      if (!existsSync(this.filePath)) {
        logger.debug(
          { filePath: this.filePath },
          "Sessions file does not exist, starting with empty store",
        );
        return;
      }

      const data = readFileSync(this.filePath, "utf-8");
      const serialized: SerializedSession[] = JSON.parse(data);

      for (const item of serialized) {
        const session: Session = {
          senderId: item.senderId,
          sdkSessionId: item.sdkSessionId,
          lastActivity: new Date(item.lastActivity),
          pendingInput: item.pendingInput,
        };
        this.sessions.set(session.senderId, session);
      }

      logger.debug(
        { count: this.sessions.size, filePath: this.filePath },
        "Loaded sessions from file",
      );
    } catch (error) {
      logger.error(
        { error, filePath: this.filePath },
        "Failed to load sessions from file, starting with empty store",
      );
      this.sessions = new Map();
    }
  }

  /**
   * Save sessions to the JSON file
   */
  private save(): void {
    try {
      const serialized: SerializedSession[] = Array.from(
        this.sessions.values(),
      ).map((session) => ({
        senderId: session.senderId,
        sdkSessionId: session.sdkSessionId,
        lastActivity: session.lastActivity.toISOString(),
        pendingInput: session.pendingInput,
      }));

      writeFileSync(
        this.filePath,
        JSON.stringify(serialized, null, 2),
        "utf-8",
      );
      logger.debug(
        { count: this.sessions.size, filePath: this.filePath },
        "Saved sessions to file",
      );
    } catch (error) {
      logger.error(
        { error, filePath: this.filePath },
        "Failed to save sessions to file",
      );
    }
  }

  /**
   * Get a session by sender ID
   */
  getSession(senderId: string): Session | undefined {
    return this.sessions.get(senderId);
  }

  /**
   * Create a new session for a sender
   */
  createSession(senderId: string): Session {
    const session: Session = {
      senderId,
      lastActivity: new Date(),
    };
    this.sessions.set(senderId, session);
    this.save();
    return session;
  }

  /**
   * Update an existing session
   */
  updateSession(
    senderId: string,
    updates: Partial<Omit<Session, "senderId">>,
  ): Session | undefined {
    const session = this.sessions.get(senderId);
    if (!session) return undefined;

    const updated: Session = {
      ...session,
      ...updates,
      lastActivity: new Date(),
    };
    this.sessions.set(senderId, updated);
    this.save();
    return updated;
  }

  /**
   * Delete a session
   */
  deleteSession(senderId: string): boolean {
    const result = this.sessions.delete(senderId);
    if (result) {
      this.save();
    }
    return result;
  }

  /**
   * Get an existing session or create a new one
   */
  getOrCreateSession(senderId: string): Session {
    return this.getSession(senderId) ?? this.createSession(senderId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.save();
  }
}

// Default instance for module-level functions
let defaultStore: FileSessionStore | null = null;

function getDefaultStore(): FileSessionStore {
  if (!defaultStore) {
    defaultStore = new FileSessionStore();
  }
  return defaultStore;
}

// Module-level functions for backward compatibility
export function getSession(senderId: string): Session | undefined {
  return getDefaultStore().getSession(senderId);
}

export function createSession(senderId: string): Session {
  return getDefaultStore().createSession(senderId);
}

export function updateSession(
  senderId: string,
  updates: Partial<Omit<Session, "senderId">>,
): Session | undefined {
  return getDefaultStore().updateSession(senderId, updates);
}

export function deleteSession(senderId: string): boolean {
  return getDefaultStore().deleteSession(senderId);
}

export function getOrCreateSession(senderId: string): Session {
  return getDefaultStore().getOrCreateSession(senderId);
}

export function getAllSessions(): Session[] {
  return getDefaultStore().getAllSessions();
}

export function clearAllSessions(): void {
  getDefaultStore().clearAllSessions();
}

// For testing - reset the default store
export function resetDefaultStore(): void {
  defaultStore = null;
}
