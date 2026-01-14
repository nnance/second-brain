# Phase 4: launchd Service

## Checkpoint

Service installs and runs via launchd.

**Verification:**
1. Run `npm run service:install`
2. Verify plist copied to `~/Library/LaunchAgents/`
3. Verify service is loaded (`launchctl list | grep second-brain`)
4. Log out and log back in
5. Verify service started automatically
6. Kill the process (`kill <pid>`)
7. Verify launchd restarts it (KeepAlive)
8. Run `npm run service:uninstall`
9. Verify service stopped and plist removed

## Tickets

| Ticket | Description |
|--------|-------------|
| 4.1 | Create launchd plist template |
| 4.2 | Write install/uninstall npm scripts |
| 4.3 | Document service management commands |

## Environment Requirements

- macOS (launchd is macOS-only)
- `VAULT_PATH` and `ANTHROPIC_API_KEY` must be configured in plist

## Done Criteria for Phase

1. Plist template created with correct structure
2. `npm run service:install` copies plist and loads service
3. `npm run service:uninstall` unloads service and removes plist
4. Service starts on login (RunAtLoad)
5. Service restarts on crash (KeepAlive)
6. Documentation explains all service commands
7. Build completes without errors
