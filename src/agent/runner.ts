import logger from "../logger.js";
import { MODEL, query } from "./client.js";
import { TOOL_NAMES, createVaultMcpServer } from "./mcp-server.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export interface AgentContext {
  recipient: string; // For send_message tool - the user's phone/iMessage ID
  resumeSessionId?: string; // SDK session ID to resume a conversation
}

export interface AgentResult {
  success: boolean;
  sessionId?: string; // SDK session ID for continuing the conversation
  toolsCalled: string[]; // List of tools that were called
  error?: string;
}

export async function runAgent(
  userMessage: string,
  context: AgentContext,
): Promise<AgentResult> {
  const toolsCalled: string[] = [];
  let sessionId: string | undefined;

  try {
    // Create MCP server with recipient-specific send_message tool
    const mcpServer = createVaultMcpServer(context.recipient);

    logger.info(
      {
        recipient: context.recipient,
        resumeSessionId: context.resumeSessionId,
      },
      "Starting agent run",
    );

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
        resume: context.resumeSessionId,
      },
    })) {
      // Log message types for debugging
      logger.debug({ type: message.type }, "Query message received");

      // Capture session ID from any message
      if ("session_id" in message && message.session_id) {
        sessionId = message.session_id;
      }

      // Handle result messages
      if (message.type === "result") {
        if (message.subtype === "success") {
          logger.info(
            { sessionId, toolsCalled },
            "Agent run completed successfully",
          );
          return { success: true, sessionId, toolsCalled };
        }
        // Handle error subtypes
        if (message.subtype.startsWith("error_")) {
          const errorMsg = message.errors?.join("; ") || message.subtype;
          logger.error(
            { error: errorMsg, subtype: message.subtype },
            "Agent run failed",
          );
          return { success: false, sessionId, toolsCalled, error: errorMsg };
        }
      }

      // Track tool use
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "tool_use") {
            logger.debug({ tool: block.name }, "Tool called");
            if (!toolsCalled.includes(block.name)) {
              toolsCalled.push(block.name);
            }
          }
        }
      }
    }

    // Should not reach here - return error if query ends without result
    logger.error("Query stream ended without result message");
    return {
      success: false,
      sessionId,
      toolsCalled,
      error: "Query ended unexpectedly",
    };
  } catch (error) {
    // Sanitize error - only log message, not full object which may contain user data
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "Agent run threw exception");
    return { success: false, sessionId, toolsCalled, error: errorMessage };
  }
}
