import "dotenv/config";
import logger from "./logger.js";

interface Config {
  vaultPath: string;
  logLevel: string;
  anthropicApiKey: string;
  claudeModel: string;
  sessionTimeoutMs: number;
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

  // Validate session timeout if provided
  let sessionTimeoutMs = 3600000; // 1 hour default
  if (process.env.SESSION_TIMEOUT_MS) {
    const rawTimeout = Number(process.env.SESSION_TIMEOUT_MS);
    if (Number.isNaN(rawTimeout) || rawTimeout <= 0) {
      logger.fatal(
        "SESSION_TIMEOUT_MS must be a positive number (milliseconds)",
      );
      process.exit(1);
    }
    sessionTimeoutMs = rawTimeout;
  }

  return {
    vaultPath,
    logLevel: process.env.LOG_LEVEL || "info",
    anthropicApiKey,
    claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    sessionTimeoutMs,
  };
}

export const config = loadConfig();
