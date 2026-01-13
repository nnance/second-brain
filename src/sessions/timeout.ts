import { runAgent } from "../agent/runner.js";
import { config } from "../config.js";
import logger from "../logger.js";
import { type Session, deleteSession, getAllSessions } from "./store.js";

let timeoutInterval: NodeJS.Timeout | null = null;

export function startTimeoutChecker(): void {
  if (timeoutInterval) return;

  logger.info(
    { timeoutMs: config.sessionTimeoutMs },
    "Starting session timeout checker",
  );

  // Check every minute
  timeoutInterval = setInterval(() => {
    checkTimeouts().catch((error) => {
      logger.error({ error }, "Error in timeout checker");
    });
  }, 60000);
}

export function stopTimeoutChecker(): void {
  if (timeoutInterval) {
    clearInterval(timeoutInterval);
    timeoutInterval = null;
    logger.info("Stopped session timeout checker");
  }
}

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

async function handleTimeout(session: Session): Promise<void> {
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
    logger.error(
      { error, senderId: session.senderId },
      "Failed to handle timeout",
    );
  } finally {
    deleteSession(session.senderId);
  }
}

// For testing - check if checker is running
export function isTimeoutCheckerRunning(): boolean {
  return timeoutInterval !== null;
}
