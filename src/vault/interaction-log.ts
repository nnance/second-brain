import { access, appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

export interface LogEntry {
  timestamp: Date;
  input: string;
  storedPath: string;
}

export async function writeInteractionLog(entry: LogEntry): Promise<void> {
  const logFileName = formatLogFileName(entry.timestamp);
  const logFilePath = join(config.vaultPath, "_system", "logs", logFileName);

  const entryContent = formatLogEntry(entry);

  if (await fileExists(logFilePath)) {
    await appendFile(logFilePath, entryContent, "utf-8");
  } else {
    const header = formatLogHeader(entry.timestamp);
    await writeFile(logFilePath, header + entryContent, "utf-8");
  }

  logger.debug({ logFilePath }, "Interaction logged");
}

export function formatLogFileName(date: Date): string {
  return `${date.toISOString().split("T")[0]}.md`;
}

export function formatLogHeader(date: Date): string {
  const dateStr = date.toISOString().split("T")[0];
  return `# Interaction Log: ${dateStr}\n`;
}

export function formatLogEntry(entry: LogEntry): string {
  const timeStr = entry.timestamp.toISOString().split("T")[1].split(".")[0];

  return `
---

## ${timeStr}

**Input:** "${entry.input}"

**Stored:** \`${entry.storedPath}\`
`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
