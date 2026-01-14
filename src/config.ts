import { join } from "node:path";
import "dotenv/config";
import logger from "./logger.js";

interface Config {
  vaultPath: string;
  logLevel: string;
  anthropicApiKey: string;
  claudeModel: string;
  sessionTimeoutMs: number;
  reminderPollIntervalMs: number;
  // Calendar settings
  calendarProvider: "google" | "none";
  googleCalendarCredentialsPath: string;
  googleCalendarIds: string[];
}

function loadConfig(): Config {
  const vaultPath = process.env.VAULT_PATH;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!vaultPath) {
    logger.fatal("VAULT_PATH environment variable is required");
    process.exit(1);
  }

  if (!anthropicApiKey) {
    logger.fatal("ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
  }

  // Validate session timeout if provided
  let sessionTimeoutMs = 3600000; // 1 hour default
  if (process.env.SESSION_TIMEOUT_MS) {
    const rawTimeout = Number(process.env.SESSION_TIMEOUT_MS);
    if (Number.isNaN(rawTimeout) || rawTimeout <= 0) {
      logger.fatal(
        "SESSION_TIMEOUT_MS must be a positive number (milliseconds)",
      );
      process.exit(1);
    }
    sessionTimeoutMs = rawTimeout;
  }

  // Validate reminder poll interval if provided
  let reminderPollIntervalMs = 300000; // 5 minutes default
  if (process.env.REMINDER_POLL_INTERVAL_MS) {
    const rawInterval = Number(process.env.REMINDER_POLL_INTERVAL_MS);
    if (Number.isNaN(rawInterval) || rawInterval <= 0) {
      logger.fatal(
        "REMINDER_POLL_INTERVAL_MS must be a positive number (milliseconds)",
      );
      process.exit(1);
    }
    reminderPollIntervalMs = rawInterval;
  }

  // Calendar settings
  const calendarProvider =
    (process.env.CALENDAR_PROVIDER as "google" | "none") || "none";
  const googleCalendarCredentialsPath =
    process.env.GOOGLE_CALENDAR_CREDENTIALS ||
    join(process.env.HOME || "", ".second-brain", "google-calendar.json");
  const googleCalendarIds = process.env.GOOGLE_CALENDAR_IDS?.split(",").map(
    (s) => s.trim(),
  ) || ["primary"];

  return {
    vaultPath,
    logLevel: process.env.LOG_LEVEL || "info",
    anthropicApiKey,
    claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    sessionTimeoutMs,
    reminderPollIntervalMs,
    calendarProvider,
    googleCalendarCredentialsPath,
    googleCalendarIds,
  };
}

export const config = loadConfig();
