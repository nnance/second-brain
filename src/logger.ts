import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import pino from "pino";

// Get log configuration from environment
const logLevel = process.env.LOG_LEVEL ?? "info";
const logRetentionDays = Number.parseInt(
  process.env.LOG_RETENTION_DAYS ?? "7",
  10,
);

// Log directory - only set if LOG_FILE_PATH environment variable is provided
// File logging is opt-in; console logging is always enabled
const logDir = process.env.LOG_FILE_PATH ?? null;

/**
 * Clean up old log files beyond retention period
 */
function cleanOldLogs(dir: string, maxAgeDays: number): void {
  if (!existsSync(dir)) return;

  try {
    const files = readdirSync(dir);
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      // Only process our log files
      if (!file.startsWith("second-brain.") || !file.endsWith(".log")) continue;

      const filePath = join(dir, file);
      try {
        const stats = statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          unlinkSync(filePath);
        }
      } catch {
        // Ignore errors for individual files
      }
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Create the logger with appropriate transports
 */
function createLogger(): pino.Logger {
  // If LOG_FILE_PATH is set, use multi-transport with file logging
  if (logDir) {
    // Ensure log directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    // Clean up old logs on startup
    cleanOldLogs(logDir, logRetentionDays);

    // Schedule daily cleanup
    setInterval(
      () => cleanOldLogs(logDir, logRetentionDays),
      24 * 60 * 60 * 1000,
    );

    // Use pino transport with multiple targets
    return pino({
      level: logLevel,
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: {
        targets: [
          // Console output (pretty in dev, JSON in prod)
          {
            target: "pino-pretty",
            options: { colorize: true },
            level: logLevel,
          },
          // File output with rotation
          {
            target: "pino-roll",
            options: {
              file: join(logDir, "second-brain"),
              frequency: "daily",
              mkdir: true,
              extension: ".log",
            },
            level: logLevel,
          },
        ],
      },
    });
  }

  // Default: console-only logging
  return pino({
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

const logger = createLogger();

export default logger;

// Export for testing
export { cleanOldLogs, logDir, logRetentionDays };
