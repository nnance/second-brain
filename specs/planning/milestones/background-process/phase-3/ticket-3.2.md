# Ticket 3.2: Implement Log Rotation with Configurable Retention

## Description

Add log rotation to prevent logs from growing unbounded. Rotate daily and keep logs for a configurable number of days (default: 7).

## Acceptance Criteria

- [ ] Logs rotate daily (new file each day)
- [ ] Log files named with date: `second-brain-2026-01-14.log`
- [ ] Retention period configurable via `LOG_RETENTION_DAYS` env var
- [ ] Default retention: 7 days
- [ ] Logs older than retention period automatically deleted
- [ ] Rotation runs on startup and daily thereafter
- [ ] Current day's log always named `second-brain.log` (symlink optional)

## Technical Notes

Option 1: Use `pino-roll` package for automatic rotation:

```typescript
import { join } from 'path';

// In logger.ts
if (logFilePath) {
  targets.push({
    target: 'pino-roll',
    options: {
      file: join(logDir, 'second-brain'),
      frequency: 'daily',
      mkdir: true,
      extension: '.log',
    },
    level: process.env.LOG_LEVEL ?? 'info',
  });
}
```

Option 2: Manual rotation with date-based naming:

```typescript
import { readdirSync, unlinkSync, statSync } from 'fs';

const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS ?? '7');

function cleanOldLogs(logDir: string, maxAgeDays = LOG_RETENTION_DAYS): void {
  const files = readdirSync(logDir);
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

  for (const file of files) {
    if (!file.startsWith('second-brain-')) continue;

    const filePath = join(logDir, file);
    const stats = statSync(filePath);

    if (now - stats.mtimeMs > maxAge) {
      unlinkSync(filePath);
      logger.debug({ file }, 'Deleted old log file');
    }
  }
}

// Call on startup
cleanOldLogs(logDir);

// Schedule daily cleanup
setInterval(() => cleanOldLogs(logDir), 24 * 60 * 60 * 1000);
```

Recommendation: Use `pino-roll` for simplicity if adding a dependency is acceptable.

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manual test: Verify dated log files created
5. Manual test: Create old log file, verify it's deleted on startup
