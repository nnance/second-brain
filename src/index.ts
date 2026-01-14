import { runAgent } from "./agent/runner.js";
import { config } from "./config.js";
import logger from "./logger.js";
import { startListener, stopListener } from "./messages/listener.js";
import { waitForPendingSave } from "./sessions/file-store.js";
import {
  deleteSession,
  getOrCreateSession,
  initSessionStore,
  updateSession,
} from "./sessions/store.js";
import { startTimeoutChecker, stopTimeoutChecker } from "./sessions/timeout.js";

async function main() {
  logger.info(
    {
      vaultPath: config.vaultPath,
      model: config.claudeModel,
    },
    "second-brain starting...",
  );

  // Load persisted sessions from disk
  await initSessionStore();

  // Start message listener
  await startListener({
    onMessage: async (message) => {
      const { text, sender } = message;

      logger.info(
        {
          event: "message_received",
          sender,
          textLength: text.length,
        },
        "Processing incoming message",
      );

      // Get or create session for this sender
      const session = getOrCreateSession(sender);

      try {
        const result = await runAgent(text, {
          recipient: sender,
          resumeSessionId: session.sdkSessionId,
        });

        if (result.success) {
          // Check if agent asked for clarification (send_message but no vault_write)
          const askedClarification =
            result.toolsCalled.includes("send_message") &&
            !result.toolsCalled.includes("vault_write");

          if (askedClarification) {
            // Save session for follow-up message
            updateSession(sender, {
              sdkSessionId: result.sessionId,
              pendingInput: session.pendingInput ?? text,
            });

            logger.info(
              {
                event: "clarification_requested",
                sender,
                sessionId: result.sessionId,
              },
              "Agent requested clarification, session saved",
            );
          } else {
            // Completed - clear session
            deleteSession(sender);

            logger.info(
              {
                event: "agent_complete",
                sender,
              },
              "Agent completed successfully, session cleared",
            );
          }
        } else {
          // Error - clear session
          deleteSession(sender);

          logger.error(
            {
              event: "agent_failed",
              sender,
              error: result.error,
            },
            "Agent failed, session cleared",
          );
        }
      } catch (error) {
        // Clear session on unexpected error
        deleteSession(sender);

        logger.error(
          {
            event: "agent_error",
            sender,
            error,
          },
          "Unexpected error in agent, session cleared",
        );
      }
    },
  });

  // Start timeout checker for session expiration
  startTimeoutChecker();

  logger.info("Listening for messages...");
}

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down...");
  stopTimeoutChecker();
  await stopListener();

  // Wait for any pending session saves to complete
  logger.info("Waiting for pending saves...");
  await waitForPendingSave();

  logger.info("Shutdown complete");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  logger.error({ error }, "Failed to start");
  process.exit(1);
});
