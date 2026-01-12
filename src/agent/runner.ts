import logger from "../logger.js";
import type { ConversationMessage } from "../sessions/store.js";
import { MODEL, query } from "./client.js";
import { TOOL_NAMES, createVaultMcpServer } from "./mcp-server.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export interface AgentContext {
  recipient: string; // For send_message tool - the user's phone/iMessage ID
}

export interface AgentResult {
  success: boolean;
  toolsCalled: string[];
  history: ConversationMessage[];
  error?: string;
}

/**
 * Build a prompt that includes conversation history for multi-turn conversations.
 * The history is formatted as context that the agent can use to understand the ongoing conversation.
 */
function buildPromptWithHistory(
  userMessage: string,
  history: ConversationMessage[],
): string {
  if (history.length === 0) {
    return userMessage;
  }

  // Format history as conversation context
  const historyText = history
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");

  return `[Previous conversation context]\n${historyText}\n\n[Current message]\nUser: ${userMessage}`;
}

export async function runAgent(
  userMessage: string,
  context: AgentContext,
  conversationHistory: ConversationMessage[] = [],
): Promise<AgentResult> {
  const toolsCalled: string[] = [];
  const newHistory: ConversationMessage[] = [...conversationHistory];
  let assistantResponse = "";

  try {
    // Create MCP server with recipient-specific send_message tool
    const mcpServer = createVaultMcpServer(context.recipient);

    logger.info(
      {
        recipient: context.recipient,
        historyLength: conversationHistory.length,
      },
      "Starting agent run",
    );

    // Build prompt with history context
    const prompt = buildPromptWithHistory(userMessage, conversationHistory);

    // Add user message to history
    newHistory.push({ role: "user", content: userMessage });

    // Run the agent query
    for await (const message of query({
      prompt,
      options: {
        model: MODEL,
        systemPrompt: SYSTEM_PROMPT,
        mcpServers: {
          "vault-tools": mcpServer,
        },
        allowedTools: [...TOOL_NAMES],
        maxTurns: 10,
      },
    })) {
      // Log message types for debugging
      logger.debug({ type: message.type }, "Query message received");

      // Handle result messages
      if (message.type === "result") {
        if (message.subtype === "success") {
          logger.info({ toolsCalled }, "Agent run completed successfully");
          // Add assistant response to history
          if (assistantResponse) {
            newHistory.push({ role: "assistant", content: assistantResponse });
          }
          return { success: true, toolsCalled, history: newHistory };
        }
        // Handle error subtypes
        if (message.subtype.startsWith("error_")) {
          const errorMsg = message.errors?.join("; ") || message.subtype;
          logger.error(
            { error: errorMsg, subtype: message.subtype },
            "Agent run failed",
          );
          return {
            success: false,
            toolsCalled,
            history: newHistory,
            error: errorMsg,
          };
        }
      }

      // Track tool use and assistant messages
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "tool_use") {
            toolsCalled.push(block.name);
            logger.debug({ tool: block.name }, "Tool called");
          }
          if (block.type === "text") {
            // Append text blocks to preserve multi-part responses
            assistantResponse = assistantResponse
              ? `${assistantResponse}\n\n${block.text}`
              : block.text;
          }
        }
      }
    }

    // Should not reach here - return error if query ends without result
    logger.error("Query stream ended without result message");
    return {
      success: false,
      toolsCalled,
      history: newHistory,
      error: "Query ended unexpectedly",
    };
  } catch (error) {
    // Sanitize error - only log message, not full object which may contain user data
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "Agent run threw exception");
    return {
      success: false,
      toolsCalled,
      history: newHistory,
      error: errorMessage,
    };
  }
}
