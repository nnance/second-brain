import { access, appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

export interface LogInteractionParams {
  input: string; // User's original message
  category?: string; // Assigned category (Tasks, Ideas, etc.)
  confidence?: number; // Confidence score (0-100)
  reasoning?: string; // Why this categorization was chosen
  tags?: string[]; // Assigned tags
  stored_path?: string; // Where the note was stored
  clarification?: string; // Clarification question asked (if any)
  user_response?: string; // User's response to clarification (if any)
}

export interface LogInteractionResult {
  success: boolean;
  log_path?: string; // Path to log file
  error?: string;
}

export async function logInteraction(
  params: LogInteractionParams,
): Promise<LogInteractionResult> {
  try {
    const now = new Date();
    const logFileName = `${now.toISOString().split("T")[0]}.md`;
    const logFilePath = join(config.vaultPath, "_system", "logs", logFileName);

    const entryContent = formatLogEntry(params, now);

    if (await fileExists(logFilePath)) {
      await appendFile(logFilePath, entryContent, "utf-8");
    } else {
      const header = formatLogHeader(now);
      await writeFile(logFilePath, header + entryContent, "utf-8");
    }

    const relativePath = `_system/logs/${logFileName}`;
    logger.debug({ logFilePath }, "log_interaction: Entry written");

    return {
      success: true,
      log_path: relativePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "log_interaction: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

function formatLogHeader(date: Date): string {
  const dateStr = date.toISOString().split("T")[0];
  return `# Interaction Log: ${dateStr}\n`;
}

function formatLogEntry(params: LogInteractionParams, timestamp: Date): string {
  const timeStr = timestamp.toISOString().split("T")[1].split(".")[0];

  const lines: string[] = ["", "---", "", `## ${timeStr}`, ""];

  // Input
  lines.push(`**Input:** "${params.input}"`);
  lines.push("");

  // Clarification (if any)
  if (params.clarification) {
    lines.push(`**Clarification requested:** "${params.clarification}"`);
    lines.push("");
    if (params.user_response) {
      lines.push(`**User response:** "${params.user_response}"`);
      lines.push("");
    }
  }

  // Categorization (if available)
  if (params.category || params.confidence !== undefined || params.reasoning) {
    lines.push("**Categorization:**");
    if (params.category) {
      lines.push(`- Category: ${params.category}`);
    }
    if (params.confidence !== undefined) {
      lines.push(`- Confidence: ${params.confidence}%`);
    }
    if (params.reasoning) {
      lines.push(`- Reasoning: ${params.reasoning}`);
    }
    lines.push("");
  }

  // Tags (if any)
  if (params.tags && params.tags.length > 0) {
    lines.push("**Tags assigned:**");
    for (const tag of params.tags) {
      lines.push(`- ${tag}`);
    }
    lines.push("");
  }

  // Stored path (if available)
  if (params.stored_path) {
    lines.push(`**Stored:** \`${params.stored_path}\``);
    lines.push("");
  }

  return lines.join("\n");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
