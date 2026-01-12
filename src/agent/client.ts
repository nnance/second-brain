import {
  createSdkMcpServer,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { config } from "../config.js";
import logger from "../logger.js";

// Re-export SDK functions for use in other modules
export { query, tool, createSdkMcpServer };

// Export model configuration
export const MODEL = config.claudeModel;

// Validate API key is present (SDK reads from ANTHROPIC_API_KEY automatically)
if (!config.anthropicApiKey) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

logger.info({ model: MODEL }, "Claude Agent SDK initialized");
