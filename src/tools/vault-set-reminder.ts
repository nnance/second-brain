import { readFile, writeFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

export interface VaultSetReminderParams {
  filepath: string; // "Tasks/2026-01-10_follow-up.md"
  due?: string; // ISO 8601: "2026-01-15T09:00:00Z"
  calendar_event?: string; // Event title to link to
  offset?: number; // Seconds before event (negative = before)
  mark_sent?: boolean; // Set sent=true and add sent_at
}

export interface ReminderData {
  due?: string;
  calendar_event?: string;
  offset?: number;
  sent: boolean;
  sent_at?: string;
}

export interface VaultSetReminderResult {
  success: boolean;
  reminder?: ReminderData;
  error?: string;
}

export async function vaultSetReminder(
  params: VaultSetReminderParams,
): Promise<VaultSetReminderResult> {
  try {
    const { filepath, due, calendar_event, offset, mark_sent } = params;

    // Validate path (prevent directory traversal)
    if (!isValidPath(filepath)) {
      return {
        success: false,
        error: "Invalid filepath: directory traversal not allowed",
      };
    }

    // Validate: either due or calendar_event must be provided (unless mark_sent)
    if (!mark_sent && !due && !calendar_event) {
      return {
        success: false,
        error: "Either 'due' or 'calendar_event' must be provided",
      };
    }

    // Validate due date format if provided
    if (due && !isValidIsoDate(due)) {
      return {
        success: false,
        error:
          "Invalid 'due' date format. Must be ISO 8601 (e.g., 2026-01-15T09:00:00Z)",
      };
    }

    const fullPath = join(config.vaultPath, filepath);

    // Read existing file content
    let content: string;
    try {
      content = await readFile(fullPath, "utf-8");
    } catch {
      return {
        success: false,
        error: `File not found: ${filepath}`,
      };
    }

    // Build the new reminder data
    const reminder: ReminderData = {
      sent: false,
    };

    if (mark_sent) {
      reminder.sent = true;
      reminder.sent_at = new Date().toISOString();
      // Preserve existing due/calendar_event when marking as sent
      const existing = parseExistingReminder(content);
      if (existing?.due) reminder.due = existing.due;
      if (existing?.calendar_event)
        reminder.calendar_event = existing.calendar_event;
      if (existing?.offset !== undefined) reminder.offset = existing.offset;
    } else {
      if (due) reminder.due = due;
      if (calendar_event) reminder.calendar_event = calendar_event;
      if (offset !== undefined) reminder.offset = offset;
    }

    // Update content with new reminder
    const updatedContent = updateReminderInContent(content, reminder);
    await writeFile(fullPath, updatedContent, "utf-8");

    logger.info({ filepath, reminder }, "vault_set_reminder: Reminder set");

    return {
      success: true,
      reminder,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "vault_set_reminder: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

function isValidPath(filepath: string): boolean {
  const normalized = normalize(filepath);

  if (normalized.startsWith("..") || normalized.includes("../")) {
    return false;
  }

  const vaultRoot = resolve(config.vaultPath);
  const resolvedPath = resolve(config.vaultPath, normalized);

  return resolvedPath.startsWith(`${vaultRoot}/`) || resolvedPath === vaultRoot;
}

function isValidIsoDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && dateString.includes("T");
}

function parseExistingReminder(content: string): ReminderData | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const yaml = frontmatterMatch[1];

  // Check if there's a reminder block
  const reminderMatch = yaml.match(/reminder:\s*\n((?:\s+\w+:.*\n?)+)/);
  if (!reminderMatch) return null;

  const reminderBlock = reminderMatch[1];
  const result: ReminderData = { sent: false };

  const dueMatch = reminderBlock.match(/due:\s*(.+)/);
  if (dueMatch) result.due = dueMatch[1].trim();

  const calendarMatch = reminderBlock.match(/calendar_event:\s*(.+)/);
  if (calendarMatch)
    result.calendar_event = calendarMatch[1].trim().replace(/^["']|["']$/g, "");

  const offsetMatch = reminderBlock.match(/offset:\s*(-?\d+)/);
  if (offsetMatch) result.offset = Number.parseInt(offsetMatch[1], 10);

  const sentMatch = reminderBlock.match(/sent:\s*(true|false)/);
  if (sentMatch) result.sent = sentMatch[1] === "true";

  const sentAtMatch = reminderBlock.match(/sent_at:\s*(.+)/);
  if (sentAtMatch) result.sent_at = sentAtMatch[1].trim();

  return result;
}

function updateReminderInContent(
  content: string,
  reminder: ReminderData,
): string {
  const reminderYaml = formatReminderYaml(reminder);

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    let frontmatter = frontmatterMatch[1];
    const restContent = content.slice(frontmatterMatch[0].length);

    // Remove existing reminder block (multi-line)
    frontmatter = frontmatter.replace(/reminder:\s*\n(?:\s+\w+:.*\n?)*/g, "");
    // Also remove single-line reminder if present
    frontmatter = frontmatter.replace(/reminder:\s*\{[^}]*\}\s*\n?/g, "");

    frontmatter = frontmatter.trim();
    frontmatter += `\n${reminderYaml}`;

    return `---\n${frontmatter}\n---${restContent}`;
  }

  // No frontmatter - create new one
  return `---\n${reminderYaml}\n---\n\n${content}`;
}

function formatReminderYaml(reminder: ReminderData): string {
  const lines = ["reminder:"];

  if (reminder.due) {
    lines.push(`  due: ${reminder.due}`);
  }
  if (reminder.calendar_event) {
    lines.push(`  calendar_event: "${reminder.calendar_event}"`);
  }
  if (reminder.offset !== undefined) {
    lines.push(`  offset: ${reminder.offset}`);
  }
  lines.push(`  sent: ${reminder.sent}`);
  if (reminder.sent_at) {
    lines.push(`  sent_at: ${reminder.sent_at}`);
  }

  return lines.join("\n");
}

export { parseExistingReminder, updateReminderInContent };
