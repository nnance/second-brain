import { runAgent } from "./agent/runner.js";
import { config } from "./config.js";
import logger from "./logger.js";
import { startListener, stopListener } from "./messages/listener.js";
import {
  deleteSession,
  getOrCreateSession,
  updateSession,
} from "./sessions/store.js";

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

    try {
      // Get or create session for this sender
      const session = getOrCreateSession(sender);

      // Run agent with conversation history
      const result = await runAgent(
        text,
        { recipient: sender },
        session.history,
      );

      if (result.success) {
        // Check if agent asked for clarification (send_message but no vault_write)
        const askedClarification =
          result.toolsCalled.includes("send_message") &&
          !result.toolsCalled.includes("vault_write");

        if (askedClarification) {
          // Save conversation history for next message
          updateSession(sender, {
            history: result.history,
            pendingInput: session.pendingInput ?? text,
          });
          logger.info(
            {
              event: "clarification_requested",
              sender,
              pendingInput: session.pendingInput ?? text,
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
      // Error - clear session
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
}).catch((error) => {
  logger.error({ error }, "Failed to start listener");
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down...");
  await stopListener();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info("Listening for messages...");
