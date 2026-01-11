import {
  type AdvancedIMessageKit,
  type MessageResponse,
  SDK,
} from "@photon-ai/advanced-imessage-kit";
import logger from "../logger.js";

export interface IncomingMessage {
  sender: string;
  text: string;
  timestamp: Date;
  chatGuid: string;
  messageGuid: string;
}

export interface MessageHandler {
  onMessage: (message: IncomingMessage) => void | Promise<void>;
}

let sdk: AdvancedIMessageKit | null = null;

export async function startListener(handler: MessageHandler): Promise<void> {
  const serverUrl = process.env.IMESSAGE_SERVER_URL || "http://localhost:1234";

  try {
    sdk = SDK({
      serverUrl,
      logLevel: "error",
    });

    await sdk.connect();

    sdk.on("new-message", async (message: MessageResponse) => {
      if (message.isFromMe) {
        return;
      }

      const incomingMessage: IncomingMessage = {
        sender: message.handle?.address || "unknown",
        text: message.text || "",
        timestamp: new Date(message.dateCreated ?? Date.now()),
        chatGuid: message.chats?.[0]?.guid || "",
        messageGuid: message.guid || "",
      };

      try {
        await handler.onMessage(incomingMessage);
      } catch (err) {
        logger.error(
          { err, message: incomingMessage },
          "Error processing message",
        );
      }
    });

    sdk.on("error", (err: Error) => {
      logger.error({ err }, "iMessage SDK error");
    });

    logger.info({ serverUrl }, "iMessage listener started");
  } catch (err) {
    logger.error({ err }, "Failed to start iMessage listener");
    throw err;
  }
}

export async function stopListener(): Promise<void> {
  if (sdk) {
    try {
      await sdk.close();
      sdk = null;
      logger.info("iMessage listener stopped");
    } catch (err) {
      logger.error({ err }, "Error stopping iMessage listener");
    }
  }
}

export function getSDK(): AdvancedIMessageKit | null {
  return sdk;
}
