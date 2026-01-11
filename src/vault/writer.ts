import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

export interface NoteMetadata {
  created: Date;
  source: string;
  confidence: number | null;
  tags: string[];
}

export interface WriteNoteOptions {
  folder: string; // e.g., 'Inbox', 'Tasks'
  title: string;
  body: string;
  metadata: NoteMetadata;
}

export interface WriteNoteResult {
  filePath: string;
  fileName: string;
}

export async function writeNote(
  options: WriteNoteOptions,
): Promise<WriteNoteResult> {
  const { folder, title, body, metadata } = options;

  const slug = generateSlug(title);
  const datePrefix = formatDatePrefix(metadata.created);
  const baseFileName = `${datePrefix}_${slug}.md`;

  const folderPath = join(config.vaultPath, folder);
  const { fileName, filePath } = await resolveUniqueFileName(
    folderPath,
    baseFileName,
  );

  const content = formatNoteContent(title, body, metadata);
  await writeFile(filePath, content, "utf-8");

  logger.info({ filePath, folder }, "Note written");

  return { filePath, fileName };
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

export function formatDatePrefix(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatNoteContent(
  title: string,
  body: string,
  metadata: NoteMetadata,
): string {
  const frontmatter = [
    "---",
    `created: ${metadata.created.toISOString()}`,
    `source: ${metadata.source}`,
    `confidence: ${metadata.confidence}`,
    `tags: [${metadata.tags.join(", ")}]`,
    "---",
    "",
    `# ${title}`,
    "",
    body,
  ].join("\n");

  return frontmatter;
}

async function resolveUniqueFileName(
  folderPath: string,
  baseFileName: string,
): Promise<{ fileName: string; filePath: string }> {
  let fileName = baseFileName;
  let filePath = join(folderPath, fileName);
  let suffix = 0;

  while (await fileExists(filePath)) {
    suffix++;
    const nameParts = baseFileName.replace(".md", "");
    fileName = `${nameParts}-${suffix}.md`;
    filePath = join(folderPath, fileName);
  }

  return { fileName, filePath };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
