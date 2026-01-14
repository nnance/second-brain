# Phase 3: Service Logging

## Checkpoint

Logs written to file with automatic rotation.

**Verification:**
1. Set `LOG_FILE_PATH=~/Library/Logs/second-brain`
2. Start the service
3. Verify log file created at specified path
4. Check log entries appear in file
5. Simulate date change (or wait) to verify rotation
6. Verify old logs (>7 days) would be cleaned up

## Tickets

| Ticket | Description |
|--------|-------------|
| 3.1 | Add pino file transport configuration |
| 3.2 | Implement log rotation (7-day retention) |

## Environment Requirements

- `LOG_FILE_PATH` - Optional, defaults to `~/Library/Logs/second-brain`

## Done Criteria for Phase

1. Logs write to file when `LOG_FILE_PATH` is set
2. Console logging still works (dual output)
3. Log files rotate daily
4. Logs older than 7 days are deleted
5. All tests pass
6. Build completes without errors
