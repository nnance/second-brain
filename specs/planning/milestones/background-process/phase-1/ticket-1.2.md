# Ticket 1.2: Add Atomic Write with Temp File Rename

## Description

Enhance the `FileSessionStore` to use atomic writes, preventing file corruption if the process crashes during a write operation.

## Acceptance Criteria

- [ ] Writes go to a temp file first (`sessions.json.tmp`)
- [ ] Temp file renamed to target file after successful write
- [ ] Rename is atomic on POSIX systems
- [ ] Old temp files cleaned up on startup
- [ ] Corrupted files handled gracefully (log warning, start fresh)

## Technical Notes

```typescript
import { writeFileSync, renameSync, unlinkSync, existsSync } from 'fs';

private save(): void {
  const tempPath = `${this.filePath}.tmp`;
  const data = JSON.stringify(
    Object.fromEntries(this.sessions),
    null,
    2
  );

  // Write to temp file
  writeFileSync(tempPath, data, 'utf-8');

  // Atomic rename
  renameSync(tempPath, this.filePath);
}

private load(): Map<string, Session> {
  // Clean up any leftover temp file
  const tempPath = `${this.filePath}.tmp`;
  if (existsSync(tempPath)) {
    unlinkSync(tempPath);
  }

  if (!existsSync(this.filePath)) {
    return new Map();
  }

  try {
    const data = readFileSync(this.filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return new Map(Object.entries(parsed));
  } catch (err) {
    // Log warning, return empty map
    logger.warn({ err }, 'Failed to load sessions, starting fresh');
    return new Map();
  }
}
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manually verify: kill process during write, restart, no corruption
