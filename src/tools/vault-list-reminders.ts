import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import logger from "../logger.js";

// Folders to scan for reminders (excludes Archive by default)
const ACTIVE_FOLDERS = ["Tasks", "Ideas", "Reference", "Projects", "Inbox"];

export interface VaultListRemindersParams {
  due_before?: string; // ISO 8601: only reminders due before this time
  limit?: number; // Max results (default 50)
}

export interface ReminderData {
  due?: string;
  calendar_event?: string;
  offset?: number;
  sent: boolean;
  sent_at?: string;
}

export interface ReminderInfo {
  filepath: string;
  title: string;
  reminder: ReminderData;
}

export interface VaultListRemindersResult {
  success: boolean;
  reminders?: ReminderInfo[];
  error?: string;
}

export async function vaultListReminders(
  params: VaultListRemindersParams = {},
): Promise<VaultListRemindersResult> {
  try {
    const { due_before, limit = 50 } = params;

    const dueBefore = due_before ? new Date(due_before) : null;

    // Validate due_before if provided
    if (due_before && dueBefore && Number.isNaN(dueBefore.getTime())) {
      return {
        success: false,
        error: "Invalid 'due_before' date format. Must be ISO 8601.",
      };
    }

    const allReminders: ReminderInfo[] = [];

    // Scan all active folders
    for (const folder of ACTIVE_FOLDERS) {
      const folderPath = join(config.vaultPath, folder);
      try {
        const reminders = await scanFolderForReminders(folderPath, folder);
        allReminders.push(...reminders);
      } catch {
        // Folder doesn't exist, skip
      }
    }

    // Filter by unsent only
    let filtered = allReminders.filter((r) => !r.reminder.sent);

    // Filter by due_before if specified
    if (dueBefore) {
      filtered = filtered.filter((r) => {
        if (!r.reminder.due) {
          // Calendar-linked reminders without resolved due time - include them
          // The scheduler will resolve the actual time
          return r.reminder.calendar_event !== undefined;
        }
        const reminderDue = new Date(r.reminder.due);
        return reminderDue <= dueBefore;
      });
    }

    // Sort by due date (soonest first)
    // Calendar-linked reminders without due date go last
    filtered.sort((a, b) => {
      if (!a.reminder.due && !b.reminder.due) return 0;
      if (!a.reminder.due) return 1;
      if (!b.reminder.due) return -1;
      return (
        new Date(a.reminder.due).getTime() - new Date(b.reminder.due).getTime()
      );
    });

    // Apply limit
    const result = filtered.slice(0, limit);

    logger.debug(
      {
        totalFound: allReminders.length,
        unsent: filtered.length,
        returned: result.length,
      },
      "vault_list_reminders: Listed reminders",
    );

    return {
      success: true,
      reminders: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error, params }, "vault_list_reminders: Failed");
    return {
      success: false,
      error: message,
    };
  }
}

async function scanFolderForReminders(
  folderPath: string,
  folderName: string,
): Promise<ReminderInfo[]> {
  const entries = await readdir(folderPath);
  const reminders: ReminderInfo[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;

    const filepath = join(folderPath, entry);
    const content = await readFile(filepath, "utf-8");

    const reminder = parseReminderFromContent(content);
    if (reminder) {
      const title = extractTitle(content) || entry.replace(".md", "");
      reminders.push({
        filepath: `${folderName}/${entry}`,
        title,
        reminder,
      });
    }
  }

  return reminders;
}

function parseReminderFromContent(content: string): ReminderData | null {
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
  if (calendarMatch) {
    result.calendar_event = calendarMatch[1].trim().replace(/^["']|["']$/g, "");
  }

  const offsetMatch = reminderBlock.match(/offset:\s*(-?\d+)/);
  if (offsetMatch) result.offset = Number.parseInt(offsetMatch[1], 10);

  const sentMatch = reminderBlock.match(/sent:\s*(true|false)/);
  if (sentMatch) result.sent = sentMatch[1] === "true";

  const sentAtMatch = reminderBlock.match(/sent_at:\s*(.+)/);
  if (sentAtMatch) result.sent_at = sentAtMatch[1].trim();

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

export { parseReminderFromContent };
