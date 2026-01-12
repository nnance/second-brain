import { readFile, readdir } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

const CONTENT_FOLDERS = [
  "Tasks",
  "Ideas",
  "Reference",
  "Projects",
  "Inbox",
  "Archive",
];

export interface VaultListParams {
  folder?: string; // Folder to list (all content folders if omitted)
  tags?: string[]; // Filter by tags (AND logic - must have all)
  limit?: number; // Max results (default 20)
}

export interface VaultFileInfo {
  filepath: string;
  title: string;
  tags: string[];
  created: string; // ISO date string
}

export interface VaultListResult {
  success: boolean;
  files?: VaultFileInfo[];
  error?: string;
}

export async function vaultList(
  params: VaultListParams,
): Promise<VaultListResult> {
  try {
    const { folder, tags, limit = 20 } = params;

    // Validate folder path if provided
    if (folder && !isValidFolderPath(folder)) {
      return {
        success: false,
        error: "Invalid folder path: directory traversal not allowed",
      };
    }

    const foldersToScan = folder ? [folder] : CONTENT_FOLDERS;
    const allFiles: VaultFileInfo[] = [];

    for (const folderName of foldersToScan) {
      const folderPath = join(config.vaultPath, folderName);
      try {
        const files = await scanFolder(folderPath, folderName);
        allFiles.push(...files);
      } catch {
        // Folder doesn't exist, skip
      }
    }

    // Filter by tags if specified
    let filtered = allFiles;
    if (tags && tags.length > 0) {
      filtered = allFiles.filter((file) =>
        tags.every((tag) => file.tags.includes(tag)),
      );
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => b.created.localeCompare(a.created));

    // Apply limit
    const result = filtered.slice(0, limit);

    logger.debug(
      { folder, tags, resultCount: result.length },
      "vault_list: Listed files",
    );

    return {
      success: true,
      files: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "vault_list: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

async function scanFolder(
  folderPath: string,
  folderName: string,
): Promise<VaultFileInfo[]> {
  const entries = await readdir(folderPath);
  const files: VaultFileInfo[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;

    const filepath = join(folderPath, entry);
    const content = await readFile(filepath, "utf-8");
    const metadata = parseFrontmatter(content);
    const title = extractTitle(content) || entry.replace(".md", "");

    files.push({
      filepath: `${folderName}/${entry}`,
      title,
      tags: metadata.tags || [],
      created: metadata.created || "",
    });
  }

  return files;
}

interface FrontmatterData {
  created?: string;
  tags?: string[];
}

function parseFrontmatter(content: string): FrontmatterData {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: FrontmatterData = {};

  // Parse created
  const createdMatch = yaml.match(/created:\s*(.+)/);
  if (createdMatch) {
    result.created = createdMatch[1].trim();
  }

  // Parse tags (handle both array and inline formats)
  const tags: string[] = [];

  // Check for multi-line tag format:
  // tags:
  //   - tag1
  //   - tag2
  const multilineMatch = yaml.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
  if (multilineMatch) {
    const tagLines = multilineMatch[1].split("\n");
    for (const line of tagLines) {
      const tagMatch = line.match(/^\s+-\s+(.+)/);
      if (tagMatch) {
        tags.push(tagMatch[1].trim());
      }
    }
  } else {
    // Check for inline format: tags: [tag1, tag2]
    const inlineMatch = yaml.match(/tags:\s*\[([^\]]*)\]/);
    if (inlineMatch) {
      const tagStr = inlineMatch[1];
      if (tagStr.trim()) {
        tags.push(
          ...tagStr
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        );
      }
    }
  }

  if (tags.length > 0) {
    result.tags = tags;
  }

  return result;
}

function extractTitle(content: string): string | null {
  // Look for first H1 heading after frontmatter
  const match = content.match(/^---\n[\s\S]*?\n---\n+# (.+)/m);
  if (match) {
    return match[1].trim();
  }

  // Or just any H1 heading
  const h1Match = content.match(/^# (.+)/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  return null;
}

function isValidFolderPath(folder: string): boolean {
  const normalized = normalize(folder);

  // Basic checks for path traversal patterns
  if (normalized.startsWith("..") || normalized.includes("../")) {
    return false;
  }

  // Verify the resolved path stays within the vault directory
  const vaultRoot = resolve(config.vaultPath);
  const resolvedPath = resolve(config.vaultPath, normalized);

  return resolvedPath.startsWith(`${vaultRoot}/`) || resolvedPath === vaultRoot;
}
