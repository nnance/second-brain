import { IMessageSDK, type Message } from "@photon-ai/imessage-kit";
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

let sdk: IMessageSDK | null = null;

export async function startListener(handler: MessageHandler): Promise<void> {
  try {
    sdk = new IMessageSDK({
      debug: process.env.LOG_LEVEL === "debug",
    });

    await sdk.startWatching({
      onMessage: async (message: Message) => {
        if (message.isFromMe) {
          return;
        }

        const incomingMessage: IncomingMessage = {
          sender: message.sender,
          text: message.text || "",
          timestamp: message.date,
          chatGuid: message.chatId,
          messageGuid: message.guid,
        };

        try {
          await handler.onMessage(incomingMessage);
        } catch (err) {
          logger.error(
            { err, message: incomingMessage },
            "Error processing message",
          );
        }
      },
      onError: (err: Error) => {
        logger.error({ err }, "iMessage watcher error");
      },
    });

    logger.info("iMessage listener started");
  } catch (err) {
    logger.error({ err }, "Failed to start iMessage listener");
    throw err;
  }
}

export async function stopListener(): Promise<void> {
  if (sdk) {
    try {
      sdk.stopWatching();
      await sdk.close();
      sdk = null;
      logger.info("iMessage listener stopped");
    } catch (err) {
      logger.error({ err }, "Error stopping iMessage listener");
    }
  }
}

export function getSDK(): IMessageSDK | null {
  return sdk;
}
