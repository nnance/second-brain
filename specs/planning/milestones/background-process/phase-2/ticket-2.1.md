# Ticket 2.1: Add SIGTERM/SIGINT Handlers with Session Save

## Description

Implement graceful shutdown handling that saves all session state when the process receives a termination signal.

## Acceptance Criteria

- [ ] SIGTERM handler registered in `src/index.ts`
- [ ] SIGINT handler registered (Ctrl+C)
- [ ] Handler saves all sessions before exit
- [ ] Handler stops iMessage listener
- [ ] 10-second timeout forces exit if save hangs
- [ ] Shutdown logged clearly

## Technical Notes

```typescript
// src/index.ts or src/lifecycle.ts
import { logger } from './logger';

let isShuttingDown = false;

export function setupShutdownHandlers(
  sessionStore: FileSessionStore,
  stopListener: () => Promise<void>
): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Graceful shutdown initiated');

    // Set timeout for force exit
    const timeout = setTimeout(() => {
      logger.error('Shutdown timeout, forcing exit');
      process.exit(1);
    }, 10_000);

    try {
      // Stop accepting new messages
      await stopListener();

      // Save sessions (already happens on each change, but ensure final state)
      sessionStore.flush();

      logger.info('Graceful shutdown complete');
      clearTimeout(timeout);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      clearTimeout(timeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manual test: `kill <pid>` shows graceful shutdown in logs
5. Manual test: Ctrl+C shows graceful shutdown in logs
