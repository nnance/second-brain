import { runAgent } from "./agent/runner.js";
import { config } from "./config.js";
import { setupShutdownHandlers } from "./lifecycle.js";
import logger from "./logger.js";
import { startListener, stopListener } from "./messages/listener.js";
import { FileSessionStore } from "./sessions/file-store.js";
import { startTimeoutChecker, stopTimeoutChecker } from "./sessions/timeout.js";

// Initialize session store (loads persisted sessions)
const sessionStore = new FileSessionStore();

logger.info(
  {
    vaultPath: config.vaultPath,
    model: config.claudeModel,
  },
  "second-brain starting...",
);

startListener({
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
    const session = sessionStore.getOrCreateSession(sender);

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
          sessionStore.updateSession(sender, {
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
          sessionStore.deleteSession(sender);

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
        sessionStore.deleteSession(sender);

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
      sessionStore.deleteSession(sender);

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
}).catch((error) => {
  logger.error({ error }, "Failed to start listener");
  process.exit(1);
});

// Start timeout checker for session expiration
startTimeoutChecker(sessionStore);

// Setup graceful shutdown handlers
setupShutdownHandlers({
  sessionStore,
  stopListener,
  stopTimeoutChecker,
});

logger.info("Listening for messages...");
