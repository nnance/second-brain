import { config } from "./config.js";
import logger from "./logger.js";
import { startListener, stopListener } from "./messages/listener.js";

logger.info({ vaultPath: config.vaultPath }, "second-brain starting...");

startListener({
  onMessage: (message) => {
    logger.info(
      {
        event: "message_received",
        sender: message.sender,
        body: message.text,
        timestamp: message.timestamp,
      },
      "Received iMessage",
    );
  },
}).catch((error) => {
  logger.error({ error }, "Failed to start listener");
  process.exit(1);
});

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
