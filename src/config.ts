import "dotenv/config";
import logger from "./logger.js";

interface Config {
  vaultPath: string;
  logLevel: string;
  anthropicApiKey: string;
  claudeModel: string;
}

function loadConfig(): Config {
  const vaultPath = process.env.VAULT_PATH;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!vaultPath) {
    logger.fatal("VAULT_PATH environment variable is required");
    process.exit(1);
  }

  if (!anthropicApiKey) {
    logger.fatal("ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  return {
    vaultPath,
    logLevel: process.env.LOG_LEVEL || "info",
    anthropicApiKey,
    claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
  };
}

export const config = loadConfig();
