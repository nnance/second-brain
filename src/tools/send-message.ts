import logger from "../logger.js";
import { getSDK } from "../messages/listener.js";

export interface SendMessageParams {
  chat_guid: string; // Chat GUID to send to (from incoming message)
  text: string; // Message text to send
}

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

export async function sendMessage(
  params: SendMessageParams,
): Promise<SendMessageResult> {
  try {
    const { chat_guid, text } = params;

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: "Message text cannot be empty",
      };
    }

    const sdk = getSDK();
    if (!sdk) {
      logger.warn("send_message: SDK not available (listener not started)");
      return {
        success: false,
        error: "iMessage SDK not available",
      };
    }

    await sdk.send(chat_guid, text);

    logger.info(
      { chatGuid: chat_guid, textLength: text.length },
      "send_message: Message sent",
    );

    return {
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "send_message: Failed");
    return {
      success: false,
      error: message,
    };
  }
}
