import { runAgent } from "../agent/runner.js";
import { config } from "../config.js";
import logger from "../logger.js";
import type { ReminderInfo } from "../tools/vault-list-reminders.js";
import { vaultSetReminder } from "../tools/vault-set-reminder.js";
import {
  type ReminderScheduler,
  createReminderScheduler,
} from "./reminder-scheduler.js";

let scheduler: ReminderScheduler | null = null;

/**
 * Handle a due reminder by invoking the agent to send a message
 */
async function handleDueReminder(
  reminder: ReminderInfo,
  recipient: string,
): Promise<void> {
  logger.info(
    { filepath: reminder.filepath, title: reminder.title },
    "Processing due reminder",
  );

  // Create context message for the agent
  const reminderContext = `[SYSTEM: Reminder due]
The following reminder is now due. Read the note and send a friendly reminder to the user.

Note: ${reminder.filepath}
Title: ${reminder.title}
Original due time: ${reminder.reminder.due || "(calendar-linked)"}`;

  try {
    const result = await runAgent(reminderContext, {
      recipient,
    });

    if (result.success) {
      // Mark reminder as sent
      await vaultSetReminder({
        filepath: reminder.filepath,
        mark_sent: true,
      });
      logger.info(
        { filepath: reminder.filepath },
        "Reminder sent and marked as complete",
      );
    } else {
      logger.error(
        { filepath: reminder.filepath, error: result.error },
        "Failed to send reminder",
      );
      // Don't mark as sent - will retry on next poll
    }
  } catch (error) {
    logger.error(
      { filepath: reminder.filepath, error },
      "Error processing reminder",
    );
    // Don't mark as sent - will retry on next poll
  }
}

/**
 * Start the reminder scheduler
 * @param recipient - The iMessage recipient to send reminders to
 */
export function startReminderScheduler(recipient: string): void {
  if (scheduler) {
    logger.debug("Reminder scheduler already running");
    return;
  }

  scheduler = createReminderScheduler({
    pollIntervalMs: config.reminderPollIntervalMs,
    onReminderDue: (reminder) => handleDueReminder(reminder, recipient),
  });

  scheduler.start();
}

/**
 * Stop the reminder scheduler
 */
export function stopReminderScheduler(): void {
  if (scheduler) {
    scheduler.stop();
    scheduler = null;
  }
}

/**
 * Check if the scheduler is currently running
 */
export function isSchedulerRunning(): boolean {
  return scheduler?.isRunning() ?? false;
}
