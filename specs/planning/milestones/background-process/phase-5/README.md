# Phase 5: Git Monitor & Auto-Update

## Checkpoint

Service detects and pulls new commits from main branch.

**Verification:**
1. Start the service with git monitor enabled
2. Check logs show "Git monitor started, polling every 5m"
3. Make a commit to main branch (from another machine or GitHub)
4. Wait for poll interval (or trigger manually)
5. Check logs show "New commits detected on main"
6. Verify `git pull` executed
7. Verify `npm run build` executed (if needed)
8. Verify service restarted with new code

## Tickets

| Ticket | Description |
|--------|-------------|
| 5.1 | Create git change detection module |
| 5.2 | Implement auto-pull and rebuild logic |
| 5.3 | Add self-restart trigger |

## Environment Requirements

- `GIT_POLL_INTERVAL_MS` - Optional, defaults to 300000 (5 minutes)
- Git repository with remote `origin` configured
- Service running via launchd (for restart capability)

## Done Criteria for Phase

1. Git monitor polls at configured interval
2. Detects new commits on origin/main
3. Pulls changes automatically
4. Rebuilds if package.json or src/ changed
5. Triggers service restart after successful update
6. Handles git/build errors gracefully (logs error, continues running)
7. All tests pass
8. Build completes without errors
