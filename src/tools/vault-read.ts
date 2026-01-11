import { readFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

export interface VaultReadParams {
  filepath: string; // Path relative to vault root, e.g., "Tasks/2026-01-10_follow-up.md"
}

export interface VaultReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export async function vaultRead(
  params: VaultReadParams,
): Promise<VaultReadResult> {
  try {
    const { filepath } = params;

    // Validate path (prevent directory traversal)
    if (!isValidVaultPath(filepath)) {
      return {
        success: false,
        error: "Invalid path: directory traversal not allowed",
      };
    }

    const fullPath = join(config.vaultPath, filepath);
    const content = await readFile(fullPath, "utf-8");

    logger.debug({ filepath }, "vault_read: Note read");

    return {
      success: true,
      content,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.debug({ filepath: params.filepath }, "vault_read: File not found");
      return {
        success: false,
        error: `File not found: ${params.filepath}`,
      };
    }

    logger.error({ error, params }, "vault_read: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

function isValidVaultPath(filepath: string): boolean {
  const normalized = normalize(filepath);

  // Basic checks for path traversal patterns
  if (normalized.startsWith("..") || normalized.includes("../")) {
    return false;
  }

  // Verify the resolved path stays within the vault directory
  const vaultRoot = resolve(config.vaultPath);
  const resolvedPath = resolve(config.vaultPath, normalized);

  return resolvedPath.startsWith(`${vaultRoot}/`) || resolvedPath === vaultRoot;
}
