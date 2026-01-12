import logger from "../logger.js";
import { MODEL, query } from "./client.js";
import { TOOL_NAMES, createVaultMcpServer } from "./mcp-server.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export interface AgentContext {
  recipient: string; // For send_message tool - the user's phone/iMessage ID
}

export interface AgentResult {
  success: boolean;
  error?: string;
}

export async function runAgent(
  userMessage: string,
  context: AgentContext,
): Promise<AgentResult> {
  try {
    // Create MCP server with recipient-specific send_message tool
    const mcpServer = createVaultMcpServer(context.recipient);

    logger.info({ recipient: context.recipient }, "Starting agent run");

    // Run the agent query
    for await (const message of query({
      prompt: userMessage,
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
          logger.info("Agent run completed successfully");
          return { success: true };
        }
        // Handle error subtypes
        if (message.subtype.startsWith("error_")) {
          const errorMsg = message.errors?.join("; ") || message.subtype;
          logger.error(
            { error: errorMsg, subtype: message.subtype },
            "Agent run failed",
          );
          return { success: false, error: errorMsg };
        }
      }

      // Log tool use for debugging (optional)
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "tool_use") {
            logger.debug({ tool: block.name }, "Tool called");
          }
        }
      }
    }

    // Should not reach here, but handle gracefully
    logger.warn("Query stream ended without result message");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error }, "Agent run threw exception");
    return { success: false, error: message };
  }
}
