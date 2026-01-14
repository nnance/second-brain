# Ticket 2.2: Implement Session Restore on Startup

## Description

Enhance startup to restore sessions from the persisted file, logging how many sessions were restored.

## Acceptance Criteria

- [ ] Sessions automatically loaded by `FileSessionStore` constructor (already done in 1.1)
- [ ] Startup logs number of restored sessions
- [ ] Expired sessions cleaned up on load
- [ ] Session timeouts recalculated from restored `lastActivity`

## Technical Notes

The `FileSessionStore` already loads sessions in its constructor (ticket 1.1). This ticket adds:

1. Logging the restore count
2. Cleaning up expired sessions
3. Ensuring timeout logic works with restored sessions

```typescript
// In FileSessionStore.load() or constructor
private load(): Map<string, Session> {
  // ... existing load logic ...

  const sessions = new Map(Object.entries(parsed));

  // Clean up expired sessions
  const now = Date.now();
  const timeout = parseInt(process.env.SESSION_TIMEOUT_MS ?? '3600000');
  let expiredCount = 0;

  for (const [id, session] of sessions) {
    if (now - session.lastActivity > timeout) {
      sessions.delete(id);
      expiredCount++;
    }
  }

  logger.info({
    restored: sessions.size,
    expired: expiredCount
  }, 'Sessions restored from file');

  return sessions;
}
```

In `src/index.ts`, ensure the store is initialized before starting the listener.

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes
3. `npm run lint` passes
4. Manual test: Create session, restart, verify "Sessions restored: 1" in logs
5. Manual test: Verify expired sessions are not restored
