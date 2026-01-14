import { runAgent } from "../agent/runner.js";
import { config } from "../config.js";
import logger from "../logger.js";
import type { FileSessionStore } from "./file-store.js";
import type { Session } from "./store.js";

const TIMEOUT_CHECK_INTERVAL_MS = 60000; // Check every minute

let timeoutInterval: NodeJS.Timeout | null = null;
let sessionStore: FileSessionStore | null = null;

/**
 * Initialize and start the session timeout checker
 */
export function startTimeoutChecker(store: FileSessionStore): void {
  if (timeoutInterval) return;

  sessionStore = store;

  logger.info(
    { timeoutMs: config.sessionTimeoutMs },
    "Starting session timeout checker",
  );

  timeoutInterval = setInterval(() => {
    checkTimeouts().catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error({ error: errorMessage }, "Error in timeout checker");
    });
  }, TIMEOUT_CHECK_INTERVAL_MS);
}

export function stopTimeoutChecker(): void {
  if (timeoutInterval) {
    clearInterval(timeoutInterval);
    timeoutInterval = null;
    sessionStore = null;
    logger.info("Stopped session timeout checker");
  }
}

export async function checkTimeouts(): Promise<void> {
  if (!sessionStore) {
    logger.warn("Timeout checker called but no session store configured");
    return;
  }

  const now = Date.now();
  const sessions = sessionStore.getAllSessions();

  for (const session of sessions) {
    const age = now - session.lastActivity.getTime();

    if (age >= config.sessionTimeoutMs) {
      // Only process sessions that have pending clarification input
      if (session.pendingInput) {
        logger.info(
          {
            senderId: session.senderId,
            ageMs: age,
            pendingInput: session.pendingInput,
          },
          "Session timed out",
        );

        await handleTimeout(session);
      } else {
        // Clean up stale sessions without pending work
        logger.debug(
          { senderId: session.senderId, ageMs: age },
          "Cleaning up stale session without pending input",
        );
        sessionStore.deleteSession(session.senderId);
      }
    }
  }
}

async function handleTimeout(session: Session): Promise<void> {
  if (!sessionStore) return;

  // Capture the lastActivity time at start of processing
  const processingStartTime = session.lastActivity.getTime();

  try {
    // Run agent with timeout context
    const timeoutMinutes = Math.round(config.sessionTimeoutMs / 60000);
    const timeoutMessage = `[SYSTEM: The user has not responded to your clarification question within ${timeoutMinutes} minutes. Please store the original message "${session.pendingInput || "unknown"}" to the Inbox folder and send a brief notification to the user that you've saved it for later review.]`;

    await runAgent(timeoutMessage, {
      recipient: session.senderId,
      resumeSessionId: session.sdkSessionId,
    });

    logger.info({ senderId: session.senderId }, "Timeout handled successfully");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { error: errorMessage, senderId: session.senderId },
      "Failed to handle timeout",
    );
  } finally {
    // Only delete if session wasn't updated during processing
    const currentSession = sessionStore.getSession(session.senderId);
    if (
      currentSession &&
      currentSession.lastActivity.getTime() === processingStartTime
    ) {
      sessionStore.deleteSession(session.senderId);
    } else {
      logger.info(
        { senderId: session.senderId },
        "Session was updated during timeout processing, not deleting",
      );
    }
  }
}

// For testing - check if checker is running
export function isTimeoutCheckerRunning(): boolean {
  return timeoutInterval !== null;
}
