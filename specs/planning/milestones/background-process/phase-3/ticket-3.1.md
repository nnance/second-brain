# Ticket 3.1: Add Pino File Transport Configuration

## Description

Configure Pino logger to write logs to a file in addition to console output when `LOG_FILE_PATH` is set.

## Acceptance Criteria

- [ ] When `LOG_FILE_PATH` is set, logs write to file
- [ ] Console logging continues to work (dual output)
- [ ] Log file path configurable via environment variable
- [ ] Default path: `~/Library/Logs/second-brain/second-brain.log`
- [ ] Log directory created automatically if missing

## Technical Notes

Update `src/logger.ts` to support file transport:

```typescript
import pino from 'pino';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const logFilePath = process.env.LOG_FILE_PATH
  ? join(process.env.LOG_FILE_PATH, 'second-brain.log')
  : null;

// Ensure log directory exists
if (logFilePath) {
  const dir = dirname(logFilePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Create transports
const targets: pino.TransportTargetOptions[] = [
  {
    target: 'pino-pretty',
    options: { colorize: true },
    level: process.env.LOG_LEVEL ?? 'info',
  },
];

if (logFilePath) {
  targets.push({
    target: 'pino/file',
    options: { destination: logFilePath },
    level: process.env.LOG_LEVEL ?? 'info',
  });
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: { targets },
});
```

Alternative: Use `pino.multistream()` for synchronous file writing.

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manual test: Set `LOG_FILE_PATH`, verify logs appear in file
5. Manual test: Verify console output still works
