# Ticket 2.6: Implement log_interaction Tool

## Description
Create the `log_interaction` tool that the AI agent uses to record every interaction in the daily log. This provides an audit trail of all captures, categorizations, and clarifications. The agent calls this tool to log its actions.

## Acceptance Criteria
- [ ] Tool exists at `src/tools/log-interaction.ts`
- [ ] Writes to `_system/logs/YYYY-MM-DD.md` based on current date
- [ ] Creates file with header if it doesn't exist
- [ ] Appends log entries to existing file
- [ ] Accepts full interaction details: input, category, confidence, reasoning, tags, stored path, clarification info
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

### Log File Location
`${VAULT_PATH}/_system/logs/YYYY-MM-DD.md`

### Log Entry Format
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

**Clarification requested:** "Is this a link you want me to save, a concept to research later, or a thought you want to capture?"

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

### Implementation Skeleton
```typescript
import { appendFile, readFile, writeFile, access } from 'node:fs/promises';
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

function formatLogHeader(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `# Interaction Log: ${dateStr}\n`;
}

function formatLogEntry(params: LogInteractionParams, timestamp: Date): string {
  const timeStr = timestamp.toISOString().split('T')[1].split('.')[0];
  const lines: string[] = [
    '',
    '---',
    '',
    `## ${timeStr}`,
    '',
    `**Input:** "${params.input}"`,
    '',
  ];

  // Add clarification section if present
  if (params.clarification) {
    lines.push(`**Clarification requested:** "${params.clarification}"`);
    lines.push('');
    if (params.user_response) {
      lines.push(`**User response:** "${params.user_response}"`);
      lines.push('');
    }
  }

  // Add categorization if present
  if (params.category || params.confidence !== undefined || params.reasoning) {
    lines.push('**Categorization:**');
    if (params.category) lines.push(`- Category: ${params.category}`);
    if (params.confidence !== undefined) lines.push(`- Confidence: ${params.confidence}%`);
    if (params.reasoning) lines.push(`- Reasoning: ${params.reasoning}`);
    lines.push('');
  }

  // Add tags if present
  if (params.tags && params.tags.length > 0) {
    lines.push('**Tags assigned:**');
    for (const tag of params.tags) {
      lines.push(`- ${tag}`);
    }
    lines.push('');
  }

  // Add stored path if present
  if (params.stored_path) {
    lines.push(`**Stored:** \`${params.stored_path}\``);
    lines.push('');
  }

  return lines.join('\n');
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
