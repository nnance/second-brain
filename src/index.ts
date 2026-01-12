import { runAgent } from "./agent/runner.js";
import { config } from "./config.js";
import logger from "./logger.js";
import { startListener, stopListener } from "./messages/listener.js";

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
      const result = await runAgent(text, { recipient: sender });

      if (result.success) {
        logger.info(
          {
            event: "agent_complete",
            sender,
          },
          "Agent completed successfully",
        );
      } else {
        logger.error(
          {
            event: "agent_failed",
            sender,
            error: result.error,
          },
          "Agent failed",
        );
      }
    } catch (error) {
      logger.error(
        {
          event: "agent_error",
          sender,
          error,
        },
        "Unexpected error in agent",
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
