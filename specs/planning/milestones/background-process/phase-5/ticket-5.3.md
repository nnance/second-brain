# Ticket 5.3: Add Self-Restart Trigger

## Description

After a successful update, trigger the service to restart so the new code takes effect.

## Acceptance Criteria

- [ ] `triggerRestart()` function in `src/git/updater.ts`
- [ ] Uses launchctl to restart when running as service
- [ ] Falls back to process.exit() when running manually
- [ ] Logs restart initiation
- [ ] Only triggers after successful build

## Technical Notes

```typescript
// src/git/updater.ts (add to existing file)
import { exec } from 'child_process';

export function isRunningAsService(): boolean {
  // Check if we're running under launchd
  // PPID of 1 indicates launchd parent, but more reliable:
  return process.env.XPC_SERVICE_NAME !== undefined ||
         process.env.__CFBundleIdentifier !== undefined;
}

export async function triggerRestart(): Promise<void> {
  logger.info('Triggering service restart');

  if (isRunningAsService()) {
    // Use launchctl to restart the service
    // kickstart -k kills and restarts the service
    const uid = process.getuid?.() ?? 501;
    exec(`launchctl kickstart -k gui/${uid}/com.second-brain.agent`, (err) => {
      if (err) {
        logger.error({ err }, 'Failed to restart via launchctl');
        // Fallback: exit and let KeepAlive restart us
        process.exit(0);
      }
    });
  } else {
    // Not running as service, just exit
    // User will need to restart manually
    logger.info('Not running as service, exiting for manual restart');
    process.exit(0);
  }
}

// Integration with monitor
export async function handleUpdate(): Promise<void> {
  const result = await pullAndRebuild();

  if (result.success && (result.built || result.installed)) {
    // Give logs time to flush
    await new Promise(resolve => setTimeout(resolve, 1000));
    await triggerRestart();
  } else if (!result.success) {
    logger.warn('Update failed, continuing with current version');
  } else {
    logger.info('No rebuild needed, continuing with current version');
  }
}
```

Update `src/index.ts` to start the git monitor:

```typescript
import { startGitMonitor } from './git/monitor';
import { handleUpdate } from './git/updater';

// In main initialization
const gitMonitorInterval = startGitMonitor(handleUpdate);

// In shutdown handler
clearInterval(gitMonitorInterval);
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manual test (as service): Push change, verify auto-restart
5. Manual test (terminal): Push change, verify exit message
