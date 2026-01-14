import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import logger from "../logger.js";

const execFileAsync = promisify(execFile);

export interface UpdateResult {
  success: boolean;
  pulled: boolean;
  installed: boolean;
  built: boolean;
  error?: Error;
}

export async function pullAndRebuild(): Promise<UpdateResult> {
  const result: UpdateResult = {
    success: false,
    pulled: false,
    installed: false,
    built: false,
  };

  try {
    // Get list of changed files before pull
    const { stdout: diffOutput } = await execFileAsync("git", [
      "diff",
      "--name-only",
      "HEAD",
      "origin/main",
    ]);
    const changedFiles = diffOutput.trim().split("\n").filter(Boolean);

    // Pull changes
    logger.info("Pulling changes from origin/main");
    await execFileAsync("git", ["pull", "origin", "main"]);
    result.pulled = true;

    // Check if package.json changed
    const packageChanged = changedFiles.some(
      (f) => f === "package.json" || f === "package-lock.json",
    );
    if (packageChanged) {
      logger.info("package.json changed, running npm install");
      await execFileAsync("npm", ["install"]);
      result.installed = true;
    }

    // Check if source files changed
    const sourceChanged = changedFiles.some(
      (f) => f.startsWith("src/") || f === "tsconfig.json",
    );
    if (sourceChanged || packageChanged) {
      logger.info("Source files changed, running build");
      await execFileAsync("npm", ["run", "build"]);
      result.built = true;
    }

    result.success = true;
    logger.info({ result }, "Update completed successfully");
  } catch (err) {
    result.error = err as Error;
    logger.error({ err }, "Update failed");
  }

  return result;
}

/**
 * Check if we're running as a launchd service
 */
export function isRunningAsService(): boolean {
  // Check if we're running under launchd
  return (
    process.env.XPC_SERVICE_NAME !== undefined ||
    process.env.__CFBundleIdentifier !== undefined
  );
}

/**
 * Trigger a service restart via launchctl or exit for manual restart
 */
export async function triggerRestart(): Promise<void> {
  logger.info("Triggering service restart");

  if (isRunningAsService()) {
    // Use launchctl to restart the service
    // kickstart -k kills and restarts the service
    const uid = process.getuid?.() ?? 501;
    exec(`launchctl kickstart -k gui/${uid}/com.second-brain.agent`, (err) => {
      if (err) {
        logger.error({ err }, "Failed to restart via launchctl");
        // Fallback: exit and let KeepAlive restart us
        process.exit(0);
      }
    });
  } else {
    // Not running as service, just exit
    // User will need to restart manually
    logger.info("Not running as service, exiting for manual restart");
    process.exit(0);
  }
}

/**
 * Handle an update by pulling, rebuilding, and restarting if needed
 */
export async function handleUpdate(): Promise<void> {
  const result = await pullAndRebuild();

  if (result.success && (result.built || result.installed)) {
    // Give logs time to flush
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await triggerRestart();
  } else if (!result.success) {
    logger.warn("Update failed, continuing with current version");
  } else {
    logger.info("No rebuild needed, continuing with current version");
  }
}
