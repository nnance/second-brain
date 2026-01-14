# Phase 3: Reminder Scheduler

## Checkpoint

After this phase, a background scheduler checks for due reminders and sends iMessage notifications to the user. Reminders are marked as sent after delivery.

## Tickets

| Ticket | Description |
|--------|-------------|
| 3.1 | Create scheduler module with configurable poll interval |
| 3.2 | Integrate scheduler with agent to send reminder messages |
| 3.3 | Mark reminders as sent and add integration tests |

## Environment Requirements

- Existing launchd background service
- Existing iMessage send capability
- `vault_list_reminders` tool from Phase 2

## Done Criteria for Phase

1. Scheduler module runs in background process
2. Due reminders trigger agent to send iMessage
3. Reminders marked as `sent: true` after delivery
4. Poll interval is configurable via env var
5. All tests pass, build succeeds, lint passes
