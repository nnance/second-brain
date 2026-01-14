import { readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, normalize, resolve } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

export type VaultFolder =
  | "Tasks"
  | "Ideas"
  | "Reference"
  | "Projects"
  | "Inbox"
  | "Archive";

const VALID_FOLDERS: VaultFolder[] = [
  "Tasks",
  "Ideas",
  "Reference",
  "Projects",
  "Inbox",
  "Archive",
];

export interface VaultMoveParams {
  source: string; // Relative path like "Tasks/2026-01-10_follow-up.md"
  destination: string; // Folder name like "Archive"
}

export interface VaultMoveResult {
  success: boolean;
  newFilepath?: string; // "Archive/2026-01-10_follow-up.md"
  error?: string;
}

export async function vaultMove(
  params: VaultMoveParams,
): Promise<VaultMoveResult> {
  try {
    const { source, destination } = params;

    // Validate destination is a valid folder
    if (!VALID_FOLDERS.includes(destination as VaultFolder)) {
      return {
        success: false,
        error: `Invalid destination folder: ${destination}. Must be one of: ${VALID_FOLDERS.join(", ")}`,
      };
    }

    // Validate source path (prevent directory traversal)
    if (!isValidPath(source)) {
      return {
        success: false,
        error: "Invalid source path: directory traversal not allowed",
      };
    }

    const sourcePath = join(config.vaultPath, source);
    const filename = basename(source);
    const destPath = join(config.vaultPath, destination, filename);

    // Check source file exists
    let content: string;
    try {
      content = await readFile(sourcePath, "utf-8");
    } catch {
      return {
        success: false,
        error: `Source file not found: ${source}`,
      };
    }

    // If moving to Archive, add archival metadata
    if (destination === "Archive") {
      const sourceFolder = dirname(source).split("/")[0]; // Get first folder component
      content = addArchivalMetadata(content, sourceFolder);
      await writeFile(sourcePath, content, "utf-8");
    }

    // Perform the move (atomic rename)
    await rename(sourcePath, destPath);

    const newFilepath = `${destination}/${filename}`;
    logger.info({ source, destination: newFilepath }, "vault_move: Note moved");

    return {
      success: true,
      newFilepath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "vault_move: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

function isValidPath(filepath: string): boolean {
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

/**
 * Add archived_at and original_folder metadata to frontmatter
 */
function addArchivalMetadata(content: string, originalFolder: string): string {
  const archivedAt = new Date().toISOString();

  // Check if file has frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    // Has frontmatter - update it
    let frontmatter = frontmatterMatch[1];
    const restContent = content.slice(frontmatterMatch[0].length);

    // Remove existing archived_at and original_folder if present
    frontmatter = frontmatter
      .replace(/^archived_at:.*\n?/gm, "")
      .replace(/^original_folder:.*\n?/gm, "");

    // Add new archival metadata
    frontmatter = frontmatter.trim();
    frontmatter += `\narchived_at: ${archivedAt}`;
    frontmatter += `\noriginal_folder: ${originalFolder}`;

    return `---\n${frontmatter}\n---${restContent}`;
  }

  // No frontmatter - create new one
  return `---
archived_at: ${archivedAt}
original_folder: ${originalFolder}
---

${content}`;
}

export { addArchivalMetadata };
