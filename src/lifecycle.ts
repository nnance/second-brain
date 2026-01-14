import logger from "./logger.js";
import type { FileSessionStore } from "./sessions/file-store.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

let isShuttingDown = false;

export interface ShutdownHandlerOptions {
  sessionStore: FileSessionStore;
  stopListener: () => Promise<void>;
  stopTimeoutChecker: () => void;
  stopGitMonitor?: () => void;
}

/**
 * Set up graceful shutdown handlers for SIGTERM and SIGINT signals
 */
export function setupShutdownHandlers(options: ShutdownHandlerOptions): void {
  const { sessionStore, stopListener, stopTimeoutChecker, stopGitMonitor } =
    options;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.debug({ signal }, "Shutdown already in progress, ignoring signal");
      return;
    }
    isShuttingDown = true;

    logger.info({ signal }, "Graceful shutdown initiated");

    // Set timeout for force exit
    const timeout = setTimeout(() => {
      logger.error("Shutdown timeout, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      // Stop accepting new messages
      logger.debug("Stopping iMessage listener...");
      await stopListener();

      // Stop the session timeout checker
      logger.debug("Stopping timeout checker...");
      stopTimeoutChecker();

      // Stop the git monitor if running
      if (stopGitMonitor) {
        logger.debug("Stopping git monitor...");
        stopGitMonitor();
      }

      // Ensure sessions are saved (they save on each change, but flush for safety)
      logger.debug("Flushing sessions...");
      sessionStore.flush();

      const sessionCount = sessionStore.getAllSessions().length;
      logger.info({ count: sessionCount }, "Sessions saved");

      logger.info("Graceful shutdown complete");
      clearTimeout(timeout);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      clearTimeout(timeout);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

/**
 * Check if the process is currently shutting down
 */
export function isProcessShuttingDown(): boolean {
  return isShuttingDown;
}

/**
 * Reset shutdown state (for testing purposes only)
 */
export function resetShutdownState(): void {
  isShuttingDown = false;
}
