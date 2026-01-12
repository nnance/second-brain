import { runAgent } from "./agent/runner.js";
import { config } from "./config.js";
import logger from "./logger.js";
import { startListener, stopListener } from "./messages/listener.js";
import {
  deleteSession,
  getOrCreateSession,
  updateSession,
} from "./sessions/store.js";
import { startTimeoutChecker, stopTimeoutChecker } from "./sessions/timeout.js";
import { sendMessage } from "./tools/send-message.js";
import { isRetryableError, withRetry } from "./utils/retry.js";

logger.info(
  {
    vaultPath: config.vaultPath,
    model: config.claudeModel,
  },
  "second-brain starting...",
);

/**
 * Send error notification to user.
 * Does not retry to avoid loops.
 */
async function notifyError(chatGuid: string): Promise<void> {
  try {
    await sendMessage({
      chat_guid: chatGuid,
      text: "Sorry, I couldn't process your message. Please try again later.",
    });
  } catch {
    // Log but don't fail further
    logger.error("Failed to send error notification to user");
  }
}

startListener({
  onMessage: async (message) => {
    const { text, sender, chatGuid } = message;

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

      // Run agent with conversation history, with retry for transient errors
      const result = await withRetry(
        () => runAgent(text, { recipient: chatGuid }, session.history),
        { shouldRetry: isRetryableError },
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
        // Agent returned error - notify user and clear session
        deleteSession(sender);
        await notifyError(chatGuid);
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
      // Unrecoverable error - notify user and clear session
      deleteSession(sender);
      await notifyError(chatGuid);
      logger.error(
        {
          event: "agent_error",
          sender,
          error: error instanceof Error ? error.message : String(error),
        },
        "Unexpected error in agent, session cleared",
      );
    }
  },
}).catch((error) => {
  logger.error({ error }, "Failed to start listener");
  process.exit(1);
});

// Start the timeout checker
startTimeoutChecker();

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down...");
  stopTimeoutChecker();
  await stopListener();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info("Listening for messages...");
