import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

export type VaultFolder =
  | "Tasks"
  | "Ideas"
  | "Reference"
  | "Projects"
  | "Inbox"
  | "Archive";

export interface VaultWriteParams {
  folder: VaultFolder;
  title: string;
  content: string;
  tags: string[];
  confidence: number;
}

export interface VaultWriteResult {
  success: boolean;
  filepath?: string;
  filename?: string;
  error?: string;
}

export async function vaultWrite(
  params: VaultWriteParams,
): Promise<VaultWriteResult> {
  try {
    const { folder, title, content, tags, confidence } = params;

    const slug = generateSlug(title);
    const datePrefix = new Date().toISOString().split("T")[0];
    const baseFilename = `${datePrefix}_${slug}.md`;

    const folderPath = join(config.vaultPath, folder);
    const { filename, filepath } = await resolveUniqueFilename(
      folderPath,
      baseFilename,
    );

    const fileContent = formatNoteContent(title, content, tags, confidence);
    await writeFile(filepath, fileContent, "utf-8");

    logger.info({ filepath, folder }, "vault_write: Note created");

    return {
      success: true,
      filepath: `${folder}/${filename}`,
      filename,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "vault_write: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

function formatNoteContent(
  title: string,
  content: string,
  tags: string[],
  confidence: number,
): string {
  const created = new Date().toISOString();
  const tagsYaml =
    tags.length > 0
      ? `tags:\n${tags.map((t) => `  - ${t}`).join("\n")}`
      : "tags: []";

  return `---
created: ${created}
${tagsYaml}
confidence: ${confidence}
---

# ${title}

${content}
`;
}

async function resolveUniqueFilename(
  folderPath: string,
  baseFilename: string,
): Promise<{ filename: string; filepath: string }> {
  let filename = baseFilename;
  let filepath = join(folderPath, filename);
  let suffix = 0;

  while (await fileExists(filepath)) {
    suffix++;
    const nameParts = baseFilename.replace(".md", "");
    filename = `${nameParts}-${suffix}.md`;
    filepath = join(folderPath, filename);
  }

  return { filename, filepath };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
