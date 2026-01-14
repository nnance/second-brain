# Phase 1: Session Persistence

## Checkpoint

Sessions persist to `~/.second-brain/sessions.json` and survive process restart.

**Verification:**
1. Start the service with `npm start`
2. Send a message to create a session
3. Stop the service (Ctrl+C)
4. Verify `~/.second-brain/sessions.json` exists with session data
5. Restart the service
6. Verify session is still accessible

## Tickets

| Ticket | Description |
|--------|-------------|
| 1.1 | Create FileSessionStore class with JSON persistence |
| 1.2 | Add atomic write with temp file rename |
| 1.3 | Write unit tests for FileSessionStore |

## Environment Requirements

- `SECOND_BRAIN_DATA_DIR` - Optional, defaults to `~/.second-brain`

## Done Criteria for Phase

1. `FileSessionStore` class implements existing `SessionStore` interface
2. Sessions written to JSON file on every change
3. Sessions loaded from file on startup
4. Atomic writes prevent corruption
5. All tests pass
6. Build completes without errors
