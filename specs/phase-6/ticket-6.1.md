# Ticket 6.1: Error Handling + Retries

## Description
Implement robust error handling throughout the system, including retries for transient failures (API errors, network issues) and graceful degradation when errors occur. The system should never crash due to individual message failures.

## Acceptance Criteria
- [ ] API calls retry on transient failures (rate limits, network errors)
- [ ] Configurable retry count and backoff
- [ ] Tool failures don't crash the agent loop
- [ ] Failed messages are logged with full context
- [ ] User receives error notification if processing fails completely
- [ ] Errors don't affect other sessions
- [ ] Health check endpoint or logging for monitoring
- [ ] Unit tests verify retry logic

## Technical Notes

### Retry Configuration
```typescript
// src/config.ts additions
maxRetries: number;      // Default 3
retryDelayMs: number;    // Default 1000 (exponential backoff)

// In loadConfig():
maxRetries: Number(process.env.MAX_RETRIES) || 3,
retryDelayMs: Number(process.env.RETRY_DELAY_MS) || 1000,
```

### Retry Utility
```typescript
// src/utils/retry.ts
import logger from '../logger.js';
import { config } from '../config.js';

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = config.maxRetries,
    delayMs = config.retryDelayMs,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn({ attempt, maxRetries, delay, error }, 'Operation failed, retrying...');

      await sleep(delay);
    }
  }

  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  // Retry on network errors and rate limits
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('connection')
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Updated Agent Runner
```typescript
// In src/agent/runner.ts
import { withRetry } from '../utils/retry.js';

// Wrap API call with retry
const response = await withRetry(
  () => anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  }),
  { shouldRetry: isApiRetryable }
);

function isApiRetryable(error: unknown): boolean {
  // Check for Anthropic-specific retryable errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status === 429 || status >= 500;
  }
  return false;
}
```

### Error Notification to User
When processing completely fails, notify the user:
```typescript
// In message handler
try {
  const result = await runAgent(text, context, history);
  // ... handle result
} catch (error) {
  logger.error({ error, sender, text }, 'Failed to process message');

  // Try to notify user (don't retry this to avoid loops)
  try {
    await sendMessage({
      message: "Sorry, I couldn't process your message. Please try again later.",
      recipient: sender,
    });
  } catch {
    // Log but don't fail further
    logger.error('Failed to send error notification');
  }

  // Clean up session
  deleteSession(sender);
}
```

### Error Categories
```typescript
// src/errors/types.ts
export class RetryableError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class PermanentError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'PermanentError';
  }
}

export class ToolError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ToolError';
  }
}
```

### Health Logging
Periodic health log for monitoring:
```typescript
// src/health.ts
import { getAllSessions } from './sessions/store.js';
import logger from './logger.js';

let healthInterval: NodeJS.Timeout | null = null;

export function startHealthLogger(): void {
  healthInterval = setInterval(() => {
    const sessions = getAllSessions();
    logger.info({
      event: 'health_check',
      activeSessions: sessions.length,
      timestamp: new Date().toISOString(),
    }, 'Health check');
  }, 300000); // Every 5 minutes
}

export function stopHealthLogger(): void {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
}
```

### Unit Tests: src/utils/retry.test.ts
Test cases:
- Succeeds on first attempt
- Retries on retryable error
- Fails immediately on non-retryable error
- Respects max retry limit
- Applies exponential backoff
- Custom shouldRetry function works

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, retry tests pass
3. File `src/utils/retry.ts` exists
4. Tests exist in `src/utils/retry.test.ts`
5. Agent runner uses retry wrapper
6. Failed messages notify user and clean up session
