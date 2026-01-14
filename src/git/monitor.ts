import { execFile } from "node:child_process";
import { promisify } from "node:util";
import logger from "../logger.js";

const execFileAsync = promisify(execFile);

export interface GitMonitorConfig {
  pollIntervalMs: number;
  branch: string;
  remote: string;
}

const defaultConfig: GitMonitorConfig = {
  pollIntervalMs: Number.parseInt(process.env.GIT_POLL_INTERVAL_MS ?? "300000"),
  branch: "main",
  remote: "origin",
};

export async function checkForUpdates(
  config: GitMonitorConfig = defaultConfig,
): Promise<boolean> {
  const { branch, remote } = config;

  try {
    // Fetch latest from remote
    await execFileAsync("git", ["fetch", remote, branch]);

    // Get local HEAD
    const { stdout: localHead } = await execFileAsync("git", [
      "rev-parse",
      "HEAD",
    ]);

    // Get remote HEAD
    const { stdout: remoteHead } = await execFileAsync("git", [
      "rev-parse",
      `${remote}/${branch}`,
    ]);

    const hasUpdates = localHead.trim() !== remoteHead.trim();

    logger.debug(
      {
        localHead: localHead.trim().slice(0, 8),
        remoteHead: remoteHead.trim().slice(0, 8),
        hasUpdates,
      },
      "Git update check",
    );

    return hasUpdates;
  } catch (err) {
    logger.error({ err }, "Git update check failed");
    return false;
  }
}

let gitMonitorInterval: NodeJS.Timeout | null = null;

export function startGitMonitor(
  onUpdate: () => Promise<void>,
  config: GitMonitorConfig = defaultConfig,
): NodeJS.Timeout {
  logger.info(
    { pollIntervalMs: config.pollIntervalMs },
    `Git monitor started, polling every ${Math.round(config.pollIntervalMs / 60000)}m`,
  );

  const check = async () => {
    const hasUpdates = await checkForUpdates(config);
    if (hasUpdates) {
      logger.info("New commits detected on main");
      await onUpdate();
    }
  };

  // Initial check after short delay
  setTimeout(check, 10_000);

  // Regular polling
  gitMonitorInterval = setInterval(check, config.pollIntervalMs);
  return gitMonitorInterval;
}

export function stopGitMonitor(): void {
  if (gitMonitorInterval) {
    clearInterval(gitMonitorInterval);
    gitMonitorInterval = null;
    logger.debug("Git monitor stopped");
  }
}
