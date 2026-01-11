# Ticket 4.2: Session Timeout Handling

## Description
Implement a timeout mechanism for sessions with pending clarifications. When a user doesn't respond to a clarification question within the timeout period, the system should automatically store the original message to Inbox and notify the user.

## Acceptance Criteria
- [ ] Timeout configurable via `SESSION_TIMEOUT_MS` environment variable
- [ ] Default timeout is 3600000ms (1 hour)
- [ ] Timeout checker runs periodically (every 60 seconds)
- [ ] Expired sessions trigger agent run with timeout context
- [ ] Agent stores to Inbox when timed out
- [ ] User receives timeout notification
- [ ] Expired session is cleaned up
- [ ] Logging captures timeout events
- [ ] Unit tests verify timeout logic

## Technical Notes

### Environment Variable
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_TIMEOUT_MS` | No | `3600000` | Session timeout in milliseconds (1 hour) |

### src/config.ts Update
```typescript
sessionTimeoutMs: number;

// In loadConfig():
sessionTimeoutMs: Number(process.env.SESSION_TIMEOUT_MS) || 3600000,
```

### Timeout Checker Module
```typescript
// src/sessions/timeout.ts
import { getAllSessions, deleteSession, getSession } from './store.js';
import { runAgent } from '../agent/runner.js';
import { config } from '../config.js';
import logger from '../logger.js';

let timeoutInterval: NodeJS.Timeout | null = null;

export function startTimeoutChecker(): void {
  if (timeoutInterval) return;

  logger.info({ timeoutMs: config.sessionTimeoutMs }, 'Starting session timeout checker');

  timeoutInterval = setInterval(checkTimeouts, 60000); // Check every minute
}

export function stopTimeoutChecker(): void {
  if (timeoutInterval) {
    clearInterval(timeoutInterval);
    timeoutInterval = null;
    logger.info('Stopped session timeout checker');
  }
}

async function checkTimeouts(): Promise<void> {
  const now = Date.now();
  const sessions = getAllSessions();

  for (const session of sessions) {
    const age = now - session.lastActivity.getTime();

    if (age >= config.sessionTimeoutMs) {
      logger.info({
        senderId: session.senderId,
        ageMs: age,
        pendingInput: session.pendingInput,
      }, 'Session timed out');

      await handleTimeout(session);
    }
  }
}

async function handleTimeout(session: Session): Promise<void> {
  try {
    // Run agent with timeout context
    const timeoutMessage = `[SYSTEM: The user has not responded to your clarification question within ${config.sessionTimeoutMs / 60000} minutes. Please store the original message "${session.pendingInput}" to the Inbox folder and send a brief notification to the user that you've saved it for later review.]`;

    await runAgent(
      timeoutMessage,
      { recipient: session.senderId },
      session.history
    );

    logger.info({ senderId: session.senderId }, 'Timeout handled successfully');
  } catch (error) {
    logger.error({ error, senderId: session.senderId }, 'Failed to handle timeout');
  } finally {
    deleteSession(session.senderId);
  }
}

export { checkTimeouts }; // Export for testing
```

### System Prompt Update
Add to the system prompt instructions for handling timeout messages:

```
## Timeout Handling
If you receive a [SYSTEM: ...timeout...] message, it means the user didn't respond to your clarification question. In this case:
1. Store the original message to Inbox with a note that clarification was requested but not received
2. Send a brief message to the user: "I've saved your earlier message to Inbox for later review since I didn't hear back."
3. Log the interaction with the timeout context
```

### Integration with Main App
```typescript
// In src/index.ts
import { startTimeoutChecker, stopTimeoutChecker } from './sessions/timeout.js';

// After starting listener
startTimeoutChecker();

// In shutdown
const shutdown = () => {
  logger.info('Shutting down...');
  stopTimeoutChecker();
  stopListener();
  process.exit(0);
};
```

### Unit Tests: src/sessions/timeout.test.ts
Test cases:
- Identifies expired sessions correctly
- Ignores sessions within timeout window
- handleTimeout calls runAgent with correct context
- handleTimeout deletes session after handling
- startTimeoutChecker/stopTimeoutChecker work correctly

### .env.example Update
```bash
# Optional: Session timeout in milliseconds (default: 3600000 = 1 hour)
SESSION_TIMEOUT_MS=3600000
```

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, timeout tests pass
3. File `src/sessions/timeout.ts` exists
4. Tests exist in `src/sessions/timeout.test.ts`
5. Config includes `sessionTimeoutMs`
6. `.env.example` includes `SESSION_TIMEOUT_MS`
7. Timeout checker starts with app and stops on shutdown
