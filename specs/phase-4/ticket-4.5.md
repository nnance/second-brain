# Ticket 4.5: Implement Clarification Timeout

## Description
Implement a timeout mechanism for pending clarifications. If a clarification is not responded to within the configured time, store the item to `Inbox/` with a note that it was unresolved.

## Acceptance Criteria
- [ ] Timeout duration configurable via `CLARIFICATION_TIMEOUT_MS` env var
- [ ] Default timeout is 1 hour (3600000 ms)
- [ ] Timeout checker runs periodically
- [ ] Timed-out items are stored to `Inbox/` folder
- [ ] Timed-out items have metadata indicating unresolved clarification
- [ ] Interaction log notes the timeout
- [ ] Pending clarification is cleared after timeout

## Technical Notes

### Environment Variable
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLARIFICATION_TIMEOUT_MS` | No | `3600000` | Timeout in milliseconds (default 1 hour) |

### src/config.ts Update
```typescript
clarificationTimeoutMs: number;

// In loadConfig():
clarificationTimeoutMs: Number(process.env.CLARIFICATION_TIMEOUT_MS) || 3600000,
```

### src/state/timeout-checker.ts
```typescript
import { 
  getAllPendingClarifications, 
  clearPendingClarification,
  PendingClarification 
} from './pending-clarifications.js';
import { writeNote } from '../vault/writer.js';
import { writeInteractionLog } from '../vault/interaction-log.js';
import { config } from '../config.js';
import logger from '../logger.js';

let timeoutInterval: NodeJS.Timeout | null = null;

export function startTimeoutChecker(): void {
  if (timeoutInterval) {
    logger.warn('Timeout checker already running');
    return;
  }
  
  // Check every minute
  const CHECK_INTERVAL_MS = 60 * 1000;
  
  timeoutInterval = setInterval(() => {
    checkForTimeouts();
  }, CHECK_INTERVAL_MS);
  
  logger.info({ 
    checkIntervalMs: CHECK_INTERVAL_MS,
    timeoutMs: config.clarificationTimeoutMs 
  }, 'Timeout checker started');
}

export function stopTimeoutChecker(): void {
  if (timeoutInterval) {
    clearInterval(timeoutInterval);
    timeoutInterval = null;
    logger.info('Timeout checker stopped');
  }
}

async function checkForTimeouts(): Promise<void> {
  const now = Date.now();
  const pending = getAllPendingClarifications();
  
  for (const clarification of pending) {
    const age = now - clarification.createdAt.getTime();
    
    if (age >= config.clarificationTimeoutMs) {
      await handleTimeout(clarification);
    }
  }
}

async function handleTimeout(clarification: PendingClarification): Promise<void> {
  logger.info({ 
    senderId: clarification.senderId,
    originalInput: clarification.originalInput.slice(0, 50) 
  }, 'Clarification timed out');
  
  const timestamp = new Date();
  
  try {
    // Store to Inbox with timeout metadata
    const result = await writeNote({
      folder: 'Inbox',
      title: clarification.analysis.suggestedTitle || clarification.originalInput.slice(0, 50),
      body: formatTimedOutNoteBody(clarification),
      metadata: {
        created: clarification.createdAt,
        source: 'imessage',
        confidence: clarification.analysis.confidence,
        tags: [...clarification.analysis.tags, 'status/unresolved'],
      },
    });
    
    // Log the timeout
    await writeInteractionLog({
      timestamp,
      input: clarification.originalInput,
      storedPath: `Inbox/${result.fileName}`,
      category: 'Inbox',
      confidence: clarification.analysis.confidence,
      reasoning: `Clarification timed out. Original best guess: ${clarification.analysis.category}`,
      tags: [...clarification.analysis.tags, 'status/unresolved'],
    });
    
    // Clear the pending clarification
    clearPendingClarification(clarification.senderId);
    
  } catch (error) {
    logger.error({ 
      senderId: clarification.senderId, 
      error 
    }, 'Failed to handle clarification timeout');
  }
}

function formatTimedOutNoteBody(clarification: PendingClarification): string {
  return `${clarification.originalInput}

---

*Clarification timed out*

- Original category guess: ${clarification.analysis.category} (${clarification.analysis.confidence}%)
- Clarification asked: "${clarification.clarificationQuestion}"
- No response received within timeout period`;
}
```

### Integration with Main App (src/index.ts)
```typescript
import { startTimeoutChecker, stopTimeoutChecker } from './state/timeout-checker.js';

// At startup:
startTimeoutChecker();

// In shutdown handlers:
process.on('SIGINT', () => {
  stopTimeoutChecker();
  // ... other cleanup
});
```

### .env.example Update
```bash
# Optional: Clarification timeout in milliseconds (default: 3600000 = 1 hour)
CLARIFICATION_TIMEOUT_MS=3600000
```

### Unit Tests: src/state/timeout-checker.test.ts
Test cases:
- `checkForTimeouts` identifies expired clarifications
- `handleTimeout` stores to Inbox
- `handleTimeout` adds status/unresolved tag
- `handleTimeout` clears pending clarification

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, timeout checker tests pass
3. File `src/state/timeout-checker.ts` exists
4. `.env.example` includes `CLARIFICATION_TIMEOUT_MS`
5. With short timeout (e.g., 5000ms), pending clarification times out and file appears in `Inbox/`
