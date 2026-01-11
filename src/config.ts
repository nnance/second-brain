import logger from "./logger.js";

interface Config {
  vaultPath: string;
  logLevel: string;
}

function loadConfig(): Config {
  const vaultPath = process.env.VAULT_PATH;

  if (!vaultPath) {
    logger.fatal("VAULT_PATH environment variable is required");
    process.exit(1);
  }

  return {
    vaultPath,
    logLevel: process.env.LOG_LEVEL || "info",
  };
}

export const config = loadConfig();
