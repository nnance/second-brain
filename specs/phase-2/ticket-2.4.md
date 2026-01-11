# Ticket 2.4: Implement Interaction Log Writer

## Description
Create a module that writes interaction logs to the daily log file. Each capture event is appended to `_system/logs/YYYY-MM-DD.md`. Creates the file if it doesn't exist.

## Acceptance Criteria
- [ ] Log writer module exists at `src/vault/interaction-log.ts`
- [ ] Writes to `_system/logs/YYYY-MM-DD.md` based on current date
- [ ] Creates file with header if it doesn't exist
- [ ] Appends log entries to existing file
- [ ] Log entries include: timestamp, input text, stored file path
- [ ] Unit tests verify log formatting

## Technical Notes

### Log File Location
`${VAULT_PATH}/_system/logs/YYYY-MM-DD.md`

Example: `_system/logs/2026-01-10.md`

### Log File Format
```markdown
# Interaction Log: 2026-01-10

---

## 14:32:00

**Input:** "remind me to follow up with Sarah about the security audit"

**Stored:** `Inbox/2026-01-10_remind-me-to-follow-up-with-sarah-about-the-security-audit.md`

---

## 14:45:12

**Input:** "interesting article about zero-trust architecture"

**Stored:** `Inbox/2026-01-10_interesting-article-about-zero-trust-architecture.md`

---
```

### src/vault/interaction-log.ts
```typescript
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

export interface LogEntry {
  timestamp: Date;
  input: string;
  storedPath: string;
}

export async function writeInteractionLog(entry: LogEntry): Promise<void> {
  const logFileName = formatLogFileName(entry.timestamp);
  const logFilePath = join(config.vaultPath, '_system', 'logs', logFileName);

  const entryContent = formatLogEntry(entry);

  if (await fileExists(logFilePath)) {
    await appendFile(logFilePath, entryContent, 'utf-8');
  } else {
    const header = formatLogHeader(entry.timestamp);
    await writeFile(logFilePath, header + entryContent, 'utf-8');
  }

  logger.debug({ logFilePath }, 'Interaction logged');
}

function formatLogFileName(date: Date): string {
  return `${date.toISOString().split('T')[0]}.md`;
}

function formatLogHeader(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `# Interaction Log: ${dateStr}\n`;
}

function formatLogEntry(entry: LogEntry): string {
  const timeStr = entry.timestamp.toISOString().split('T')[1].split('.')[0];

  return `
---

## ${timeStr}

**Input:** "${entry.input}"

**Stored:** \`${entry.storedPath}\`
`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await import('node:fs/promises').then(fs => fs.access(path));
    return true;
  } catch {
    return false;
  }
}
```

### Phase 3 Extension Note
In Phase 3, this will be refactored into agent tools with extended fields for:
- Category
- Confidence score
- Reasoning
- Tags assigned

For now, keep the interface simple but extensible.

### Unit Tests: src/vault/interaction-log.test.ts
Test cases:
- `formatLogFileName` produces correct date format
- `formatLogEntry` produces valid markdown
- `formatLogHeader` produces correct header

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, interaction log tests pass
3. File `src/vault/interaction-log.ts` exists
4. Tests exist in `src/vault/interaction-log.test.ts`
