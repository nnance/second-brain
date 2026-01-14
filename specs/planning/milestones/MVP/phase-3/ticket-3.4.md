# Ticket 3.4: Refactor Interaction Log to log_interaction Tool

## Description
Refactor the existing `src/vault/interaction-log.ts` from Phase 2 into an agent-callable tool at `src/tools/log-interaction.ts`. The tool accepts structured parameters with full categorization details and returns structured results.

## Acceptance Criteria
- [ ] Tool exists at `src/tools/log-interaction.ts`
- [ ] Accepts full interaction details: input, category, confidence, reasoning, tags, stored path, clarification info
- [ ] Writes to `_system/logs/YYYY-MM-DD.md` based on current date
- [ ] Creates file with header if it doesn't exist
- [ ] Appends log entries to existing file
- [ ] Returns structured result with success status and log path
- [ ] Never throws—returns error in result object
- [ ] Comprehensive unit tests

## Technical Notes

### Tool Interface
```typescript
// src/tools/log-interaction.ts

export interface LogInteractionParams {
  input: string;                // User's original message
  category?: string;            // Assigned category (Tasks, Ideas, etc.)
  confidence?: number;          // Confidence score (0-100)
  reasoning?: string;           // Why this categorization was chosen
  tags?: string[];              // Assigned tags
  stored_path?: string;         // Where the note was stored
  clarification?: string;       // Clarification question asked (if any)
  user_response?: string;       // User's response to clarification (if any)
}

export interface LogInteractionResult {
  success: boolean;
  log_path?: string;            // Path to log file
  error?: string;
}

export async function logInteraction(params: LogInteractionParams): Promise<LogInteractionResult> {
  // Implementation
}
```

### Key Differences from Phase 2
| Phase 2 | Phase 3 Tool |
|---------|--------------|
| Only input and storedPath | Full categorization metadata |
| Simple format | Rich format with reasoning |
| Throws on error | Returns error result |

### Log Entry Format (Enhanced)
```markdown
---

## 14:32:00

**Input:** "remind me to follow up with Sarah about the security audit"

**Categorization:**
- Category: Tasks
- Confidence: 92%
- Reasoning: Clear action verb, named person, specific topic

**Tags assigned:**
- person/sarah
- project/security-audit
- priority/high
- status/waiting

**Stored:** `Tasks/2026-01-10_follow-up-sarah-security-audit.md`

---
```

### Log Entry Format (with clarification)
```markdown
---

## 14:45:12

**Input:** "interesting article about zero-trust architecture"

**Clarification requested:** "Is this a link to save or a concept to research?"

**User response:** "link to save"

**Categorization:**
- Category: Reference
- Confidence: 95%
- Reasoning: User clarified this is a link to save

**Tags assigned:**
- topic/security
- topic/zero-trust

**Stored:** `Reference/2026-01-10_zero-trust-architecture-article.md`

---
```

### Reusing Phase 2 Logic
The existing `src/vault/interaction-log.ts` has:
- `formatLogFileName()` — Generate date-based filename
- `formatLogHeader()` — Create daily log header
- File existence checking and append logic

These can be adapted for the enhanced format.

### Implementation Skeleton
```typescript
import { appendFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import logger from '../logger.js';

export async function logInteraction(params: LogInteractionParams): Promise<LogInteractionResult> {
  try {
    const now = new Date();
    const logFileName = `${now.toISOString().split('T')[0]}.md`;
    const logFilePath = join(config.vaultPath, '_system', 'logs', logFileName);

    const entryContent = formatLogEntry(params, now);

    if (await fileExists(logFilePath)) {
      await appendFile(logFilePath, entryContent, 'utf-8');
    } else {
      const header = formatLogHeader(now);
      await writeFile(logFilePath, header + entryContent, 'utf-8');
    }

    const relativePath = `_system/logs/${logFileName}`;
    logger.debug({ logFilePath }, 'log_interaction: Entry written');

    return {
      success: true,
      log_path: relativePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, params }, 'log_interaction: Failed');
    return {
      success: false,
      error: message,
    };
  }
}
```

### Unit Tests: src/tools/log-interaction.test.ts
Test cases:
- Creates new log file with header
- Appends to existing log file
- Formats entry with all fields
- Formats entry with minimal fields (input only)
- Formats entry with clarification
- Generates correct filename from date
- Returns success with log path

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, log-interaction tests pass
3. File `src/tools/log-interaction.ts` exists
4. Tests exist in `src/tools/log-interaction.test.ts`
5. Manual test: call function, verify log file created with correct format
