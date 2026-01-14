# Phase 2: Graceful Lifecycle

## Checkpoint

Clean shutdown saves state, startup restores it.

**Verification:**
1. Start the service
2. Create a session by sending a message
3. Send SIGTERM (`kill <pid>`) or Ctrl+C
4. Check logs show "Graceful shutdown initiated" and "Sessions saved"
5. Restart the service
6. Check logs show "Sessions restored: N"
7. Verify session context is intact

## Tickets

| Ticket | Description |
|--------|-------------|
| 2.1 | Add SIGTERM/SIGINT handlers with session save |
| 2.2 | Implement session restore on startup |
| 2.3 | Add lifecycle integration tests |

## Environment Requirements

- Phase 1 must be complete (FileSessionStore available)

## Done Criteria for Phase

1. SIGTERM and SIGINT trigger graceful shutdown
2. Shutdown saves all sessions before exit
3. Startup automatically restores sessions from file
4. Shutdown timeout (10s) prevents hanging
5. All tests pass
6. Build completes without errors
