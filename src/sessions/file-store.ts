import { promises as fs } from "node:fs";
import { type Session } from "./store.js";
import logger from "../logger.js";
import { config } from "../config.js";

interface SerializedSession {
  senderId: string;
  sdkSessionId?: string;
  lastActivity: string; // ISO 8601 string
  pendingInput?: string;
}

/**
 * Track pending save operations for graceful shutdown
 */
let pendingSave: Promise<void> | null = null;

/**
 * Load sessions from disk
 * Returns empty Map if file doesn't exist or is invalid
 */
export async function loadSessions(): Promise<Map<string, Session>> {
  const filePath = config.sessionStorePath;

  try {
    const data = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data) as SerializedSession[];

    const sessions = new Map<string, Session>();
    for (const serialized of parsed) {
      const session: Session = {
        senderId: serialized.senderId,
        sdkSessionId: serialized.sdkSessionId,
        lastActivity: new Date(serialized.lastActivity),
        pendingInput: serialized.pendingInput,
      };
      sessions.set(session.senderId, session);
    }

    logger.info({ count: sessions.size, filePath }, "Loaded sessions from disk");
    return sessions;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      logger.info({ filePath }, "Session file not found, starting with empty store");
      return new Map();
    }

    logger.error({ err, filePath }, "Failed to load sessions, starting with empty store");
    return new Map();
  }
}

/**
 * Save sessions to disk atomically
 * Uses write-to-temp-then-rename to prevent corruption
 */
export async function saveSessions(
  sessions: Map<string, Session>,
): Promise<void> {
  const saveOp = async () => {
    const filePath = config.sessionStorePath;
    const tempPath = `${filePath}.tmp`;

    try {
      // Serialize sessions
      const serialized: SerializedSession[] = Array.from(sessions.values()).map(
        (session) => ({
          senderId: session.senderId,
          sdkSessionId: session.sdkSessionId,
          lastActivity: session.lastActivity.toISOString(),
          pendingInput: session.pendingInput,
        }),
      );

      const json = JSON.stringify(serialized, null, 2);

      // Write to temp file
      await fs.writeFile(tempPath, json, "utf-8");

      // Atomic rename
      await fs.rename(tempPath, filePath);

      logger.debug({ count: sessions.size, filePath }, "Saved sessions to disk");
    } catch (err) {
      logger.error({ err, filePath }, "Failed to save sessions to disk");
      throw err;
    }
  };

  pendingSave = saveOp();
  await pendingSave;
  pendingSave = null;
}

/**
 * Wait for any pending save operation to complete
 * Used during graceful shutdown to prevent data loss
 */
export async function waitForPendingSave(): Promise<void> {
  if (pendingSave) {
    await pendingSave;
  }
}
