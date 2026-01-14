# Ticket 5.1: Create Git Change Detection Module

## Description

Create a module that detects when new commits are available on the remote main branch by comparing local and remote HEAD.

## Acceptance Criteria

- [ ] Module created: `src/git/monitor.ts`
- [ ] `checkForUpdates()` function returns true if new commits available
- [ ] Uses local git commands only (no GitHub API)
- [ ] Handles network errors gracefully
- [ ] Configurable poll interval via `GIT_POLL_INTERVAL_MS`
- [ ] Logs check results

## Technical Notes

```typescript
// src/git/monitor.ts
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger';

const execFileAsync = promisify(execFile);

export interface GitMonitorConfig {
  pollIntervalMs: number;
  branch: string;
  remote: string;
}

const defaultConfig: GitMonitorConfig = {
  pollIntervalMs: parseInt(process.env.GIT_POLL_INTERVAL_MS ?? '300000'),
  branch: 'main',
  remote: 'origin',
};

export async function checkForUpdates(
  config: GitMonitorConfig = defaultConfig
): Promise<boolean> {
  const { branch, remote } = config;

  try {
    // Fetch latest from remote
    await execFileAsync('git', ['fetch', remote, branch]);

    // Get local HEAD
    const { stdout: localHead } = await execFileAsync('git', [
      'rev-parse',
      'HEAD',
    ]);

    // Get remote HEAD
    const { stdout: remoteHead } = await execFileAsync('git', [
      'rev-parse',
      `${remote}/${branch}`,
    ]);

    const hasUpdates = localHead.trim() !== remoteHead.trim();

    logger.debug({
      localHead: localHead.trim().slice(0, 8),
      remoteHead: remoteHead.trim().slice(0, 8),
      hasUpdates,
    }, 'Git update check');

    return hasUpdates;
  } catch (err) {
    logger.error({ err }, 'Git update check failed');
    return false;
  }
}

export function startGitMonitor(
  onUpdate: () => Promise<void>,
  config: GitMonitorConfig = defaultConfig
): NodeJS.Timeout {
  logger.info(
    { pollIntervalMs: config.pollIntervalMs },
    'Git monitor started'
  );

  const check = async () => {
    const hasUpdates = await checkForUpdates(config);
    if (hasUpdates) {
      logger.info('New commits detected on main');
      await onUpdate();
    }
  };

  // Initial check after short delay
  setTimeout(check, 10_000);

  // Regular polling
  return setInterval(check, config.pollIntervalMs);
}
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manual test: Push commit to remote, verify detection
