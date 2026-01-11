import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

const FOLDERS = [
  "_system/logs",
  "Tasks",
  "Ideas",
  "Reference",
  "Projects",
  "Inbox",
  "Archive",
];

async function initVault(): Promise<void> {
  logger.info({ vaultPath: config.vaultPath }, "Initializing vault");

  for (const folder of FOLDERS) {
    const fullPath = join(config.vaultPath, folder);
    await mkdir(fullPath, { recursive: true });
    logger.info({ folder: fullPath }, "Folder ready");
  }

  logger.info("Vault initialization complete");
}

initVault().catch((error) => {
  logger.fatal({ error }, "Vault initialization failed");
  process.exit(1);
});
