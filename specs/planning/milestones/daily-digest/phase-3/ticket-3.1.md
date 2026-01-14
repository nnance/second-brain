# Ticket 3.1: Create Scheduler Module

## Description

Create a new scheduler module that periodically checks for due reminders. This runs as part of the background service and uses the existing `vault_list_reminders` functionality.

## Acceptance Criteria

- [ ] New directory `src/scheduler/` created
- [ ] New file `src/scheduler/reminder-scheduler.ts` created
- [ ] Scheduler checks for due reminders at configurable interval
- [ ] Uses `REMINDER_POLL_INTERVAL_MS` env var (default 300000 = 5 minutes)
- [ ] Scheduler can be started and stopped cleanly
- [ ] Scheduler logs check activity
- [ ] Unit tests cover scheduler lifecycle

## Technical Notes

**Module Structure:**
```typescript
// src/scheduler/reminder-scheduler.ts

interface ReminderScheduler {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export function createReminderScheduler(
  onReminderDue: (reminder: ReminderInfo) => Promise<void>
): ReminderScheduler;
```

**Implementation Approach:**
1. Use `setInterval` for polling (simple, reliable)
2. On each tick:
   - Call vault_list_reminders with `due_before: now`
   - For each due reminder, call the `onReminderDue` callback
3. Handle errors gracefully (log and continue)
4. Support clean shutdown (clearInterval)

**Configuration:**
```typescript
// src/config.ts
reminderPollIntervalMs: number; // from REMINDER_POLL_INTERVAL_MS, default 300000
```

**Graceful Shutdown Integration:**
- Scheduler should stop on SIGTERM/SIGINT
- Integrate with existing shutdown handlers from background-process milestone

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests including scheduler tests
3. `npm run lint` shows no errors
4. Scheduler starts and stops cleanly
5. Logs show check activity
