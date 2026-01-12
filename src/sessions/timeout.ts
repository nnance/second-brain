import type { AgentResult } from "../agent/runner.js";
import { runAgent as defaultRunAgent } from "../agent/runner.js";
import { config } from "../config.js";
import logger from "../logger.js";
import type { ConversationMessage } from "./store.js";
import { type Session, deleteSession, getAllSessions } from "./store.js";

let timeoutInterval: NodeJS.Timeout | null = null;

// Allow injecting a mock runAgent for testing
type RunAgentFn = (
  message: string,
  context: { recipient: string },
  history: ConversationMessage[],
) => Promise<AgentResult>;

let runAgentFn: RunAgentFn = defaultRunAgent;

/**
 * Set the runAgent function (for testing).
 */
export function setRunAgentFn(fn: RunAgentFn): void {
  runAgentFn = fn;
}

/**
 * Reset the runAgent function to the default.
 */
export function resetRunAgentFn(): void {
  runAgentFn = defaultRunAgent;
}

/**
 * Start the session timeout checker.
 * Runs periodically to check for expired sessions.
 */
export function startTimeoutChecker(): void {
  if (timeoutInterval) return;

  logger.info(
    { timeoutMs: config.sessionTimeoutMs },
    "Starting session timeout checker",
  );

  // Check every 60 seconds
  timeoutInterval = setInterval(() => {
    checkTimeouts().catch((error) => {
      logger.error({ error }, "Error checking timeouts");
    });
  }, 60000);
}

/**
 * Stop the session timeout checker.
 */
export function stopTimeoutChecker(): void {
  if (timeoutInterval) {
    clearInterval(timeoutInterval);
    timeoutInterval = null;
    logger.info("Stopped session timeout checker");
  }
}

/**
 * Check all sessions for timeouts and handle expired ones.
 * Exported for testing.
 */
export async function checkTimeouts(): Promise<void> {
  const now = Date.now();
  const sessions = getAllSessions();

  for (const session of sessions) {
    const age = now - session.lastActivity.getTime();

    if (age >= config.sessionTimeoutMs) {
      logger.info(
        {
          senderId: session.senderId,
          ageMs: age,
          pendingInput: session.pendingInput,
        },
        "Session timed out",
      );

      await handleTimeout(session);
    }
  }
}

/**
 * Handle a timed out session by storing to Inbox and notifying user.
 */
async function handleTimeout(session: Session): Promise<void> {
  try {
    // Build timeout message for agent
    const timeoutMinutes = Math.round(config.sessionTimeoutMs / 60000);
    const timeoutMessage = `[SYSTEM: The user has not responded to your clarification question within ${timeoutMinutes} minutes. Please store the original message "${session.pendingInput}" to the Inbox folder with a note that clarification was requested but not received, and send a brief notification to the user that you've saved it for later review.]`;

    await runAgentFn(
      timeoutMessage,
      { recipient: session.chatGuid },
      session.history,
    );

    logger.info({ senderId: session.senderId }, "Timeout handled successfully");
  } catch (error) {
    logger.error(
      { error, senderId: session.senderId },
      "Failed to handle timeout",
    );
  } finally {
    // Always clean up session
    deleteSession(session.senderId);
  }
}

/**
 * Check if the timeout checker is running.
 * Exported for testing.
 */
export function isTimeoutCheckerRunning(): boolean {
  return timeoutInterval !== null;
}
