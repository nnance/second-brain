import { config } from "./config.js";
import logger from "./logger.js";
import { startListener, stopListener } from "./messages/listener.js";
import { writeInteractionLog } from "./vault/interaction-log.js";
import { writeNote } from "./vault/writer.js";

logger.info({ vaultPath: config.vaultPath }, "second-brain starting...");

startListener({
  onMessage: async (message) => {
    const timestamp = new Date();

    try {
      // Write note to Inbox
      const result = await writeNote({
        folder: "Inbox",
        title: message.text.slice(0, 50), // Use first 50 chars as title
        body: message.text,
        metadata: {
          created: timestamp,
          source: "imessage",
          confidence: null,
          tags: [],
        },
      });

      // Write interaction log
      await writeInteractionLog({
        timestamp,
        input: message.text,
        storedPath: `Inbox/${result.fileName}`,
      });

      logger.info(
        {
          event: "message_captured",
          sender: message.sender,
          filePath: result.filePath,
        },
        "Message captured successfully",
      );
    } catch (error) {
      logger.error(
        {
          event: "capture_failed",
          sender: message.sender,
          error,
        },
        "Failed to capture message",
      );
    }
  },
}).catch((error) => {
  logger.error({ error }, "Failed to start listener");
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await stopListener();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await stopListener();
  process.exit(0);
});
