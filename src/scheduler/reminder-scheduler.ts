import logger from "../logger.js";
import {
  type ReminderInfo,
  vaultListReminders,
} from "../tools/vault-list-reminders.js";

export interface ReminderScheduler {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export interface ReminderSchedulerOptions {
  pollIntervalMs: number;
  onReminderDue: (reminder: ReminderInfo) => Promise<void>;
}

export function createReminderScheduler(
  options: ReminderSchedulerOptions,
): ReminderScheduler {
  const { pollIntervalMs, onReminderDue } = options;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isChecking = false;

  async function checkDueReminders(): Promise<void> {
    // Prevent overlapping checks
    if (isChecking) {
      logger.debug("Reminder check already in progress, skipping");
      return;
    }

    isChecking = true;
    try {
      const now = new Date().toISOString();
      logger.debug({ now }, "Checking for due reminders");

      const result = await vaultListReminders({
        due_before: now,
      });

      if (!result.success || !result.reminders) {
        logger.warn({ error: result.error }, "Failed to list reminders");
        return;
      }

      logger.debug(
        { count: result.reminders.length },
        "Found due reminders to process",
      );

      for (const reminder of result.reminders) {
        try {
          await onReminderDue(reminder);
        } catch (error) {
          logger.error(
            { error, filepath: reminder.filepath },
            "Error processing reminder",
          );
        }
      }
    } catch (error) {
      logger.error({ error }, "Error in reminder check cycle");
    } finally {
      isChecking = false;
    }
  }

  return {
    start(): void {
      if (intervalId) {
        logger.debug("Scheduler already running");
        return;
      }

      logger.info({ pollIntervalMs }, "Starting reminder scheduler");
      intervalId = setInterval(checkDueReminders, pollIntervalMs);

      // Run an initial check immediately
      checkDueReminders();
    },

    stop(): void {
      if (!intervalId) {
        logger.debug("Scheduler not running");
        return;
      }

      logger.info("Stopping reminder scheduler");
      clearInterval(intervalId);
      intervalId = null;
    },

    isRunning(): boolean {
      return intervalId !== null;
    },
  };
}
