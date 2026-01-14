# Background Process

## Design Document v1.0

**Created:** 2026-01-14
**Status:** Draft

---

## Overview

Transform Second Brain from a manually-started terminal process into a production-ready macOS background service. This milestone delivers reliable always-on knowledge capture that never loses a conversation, never requires manual restarts, and stays current with the latest code automatically.

### Design Principles

- **Invisible operation** - No menu bar UI, no notifications, just always there
- **Self-healing** - Automatic restart on crash via launchd KeepAlive
- **State preservation** - Sessions survive restarts through file persistence
- **Auto-updating** - Service stays current by watching git main branch
- **Native tooling** - launchd only, no third-party process managers

---

## Features

### 1. File Persistence for Session Store

**Source:** Roadmap item

Replace the in-memory session Map with file-based storage that survives process restarts. Sessions are small JSON objects representing ongoing conversations with users.

#### User Stories

- As the system, I want sessions to persist across restarts so that users don't lose conversation context
- As a developer, I want session data stored in a human-readable format for debugging

#### Behavior

- Sessions stored as JSON file(s) in a configurable data directory
- Atomic writes to prevent corruption on crash
- Lazy loading on first access after startup
- Automatic cleanup of expired sessions on load

#### Technical Considerations

- Use `SECOND_BRAIN_DATA_DIR` env var or default to `~/.second-brain/`
- Single `sessions.json` file (sessions are small, < 100 typically)
- Write temp file then rename for atomicity
- Existing `SessionStore` interface preserved for compatibility

---

### 2. Graceful Shutdown Handling

**Source:** Suggested addition (essential for persistence)

Implement clean shutdown that saves all session state before the process exits. This is required for file persistence to be useful.

#### User Stories

- As the system, I want to save state on shutdown so that restarts don't lose data
- As a developer, I want clear shutdown logs to diagnose issues

#### Behavior

- Listen for SIGTERM and SIGINT signals
- On signal: stop accepting new messages, save all sessions, exit cleanly
- Timeout after 10 seconds if save hangs (force exit)
- Log shutdown initiation and completion

#### Technical Considerations

- Node.js `process.on('SIGTERM', ...)` and `process.on('SIGINT', ...)`
- Coordinate with iMessage listener shutdown
- Ensure session file is flushed before exit

---

### 3. macOS Background Service (launchd)

**Source:** Roadmap item

Configure launchd plist for auto-start on login with KeepAlive crash recovery. The service runs invisibly in the background.

#### User Stories

- As a user, I want Second Brain to start automatically when I log in
- As a user, I want the service to restart automatically if it crashes

#### Behavior

- LaunchAgent plist installed to `~/Library/LaunchAgents/`
- Service starts on user login (RunAtLoad)
- Service restarts on crash (KeepAlive)
- Logs written to `~/Library/Logs/second-brain/`
- Environment variables loaded from plist

#### Technical Considerations

- Plist template: `com.second-brain.agent.plist`
- Install script: copy plist, `launchctl load`
- Uninstall script: `launchctl unload`, remove plist
- Required env vars: `VAULT_PATH`, `ANTHROPIC_API_KEY`

---

### 4. GitHub Main Branch Monitor

**Source:** Roadmap item

Watch the main branch for new commits using local git commands. Polling-based approach avoids network exposure from webhooks.

#### User Stories

- As a developer, I want the service to detect when new code is pushed to main
- As a user, I want updates to happen automatically without manual intervention

#### Behavior

- Poll `git fetch origin main` at configurable interval (default: 5 minutes)
- Compare local HEAD with origin/main
- Trigger update flow when new commits detected
- Log check results (no change / new commits found)

#### Technical Considerations

- Use `child_process.execFile` for git commands
- Run in project directory (where .git exists)
- Handle git errors gracefully (network issues, etc.)
- `GIT_POLL_INTERVAL_MS` env var for configuration

---

### 5. Auto-Update (Pull and Restart)

**Source:** Roadmap item (combined with monitor)

When new commits are detected on main, pull changes and restart the service automatically.

#### User Stories

- As a user, I want code updates to deploy automatically
- As a developer, I want the update process logged for debugging

#### Behavior

- On new commits detected: `git pull origin main`
- Run `npm install` if package.json changed
- Run `npm run build` to compile TypeScript
- Trigger service restart via launchctl
- Log each step of the update process

#### Technical Considerations

- Self-restart: process exits with special code, launchd restarts it
- Alternative: `launchctl kickstart` from within process
- Build failures should not leave service in broken state
- Consider rollback strategy (out of scope for v1)

---

### 6. Health Check / Status Command

**Source:** Suggested addition

A CLI command to check if the service is running and healthy. Essential for debugging headless background services.

#### User Stories

- As a developer, I want to quickly check if the service is running
- As a developer, I want to see basic health metrics

#### Behavior

- `npm run status` command
- Shows: running/stopped, PID, uptime, last message processed
- Exit code 0 if healthy, 1 if not running or unhealthy
- Machine-readable JSON output option (`--json`)

#### Technical Considerations

- Check launchd status via `launchctl list | grep second-brain`
- Read PID file from data directory
- Health endpoint optional (adds complexity)
- Keep simple for v1: just running/not running

---

### 7. Service Logging to File

**Source:** Suggested addition

Since the service runs headless, logs need to go somewhere reviewable. Basic log rotation keeps disk usage bounded.

#### User Stories

- As a developer, I want to review logs when debugging issues
- As a user, I don't want logs to fill up my disk

#### Behavior

- Logs written to `~/Library/Logs/second-brain/`
- Daily log rotation (second-brain.log, second-brain.1.log, etc.)
- Configurable retention period (default: 7 days), auto-delete older
- launchd StandardOutPath/StandardErrorPath for stdout/stderr

#### Technical Considerations

- Pino already supports file transports
- Configure via `LOG_FILE_PATH` env var
- Configure retention via `LOG_RETENTION_DAYS` env var (default: 7)
- Rotation via pino-roll or simple date-based naming
- launchd handles stdout/stderr separately from app logs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        launchd                               │
│            (com.second-brain.agent.plist)                    │
│                                                              │
│   • RunAtLoad: true                                          │
│   • KeepAlive: true                                          │
│   • StandardOutPath: ~/Library/Logs/second-brain/stdout.log  │
│   • StandardErrorPath: ~/Library/Logs/second-brain/stderr.log│
└─────────────────────────┬───────────────────────────────────┘
                          │ manages
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Second Brain Process                       │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  iMessage   │  │   Session   │  │    Git Monitor      │  │
│  │  Listener   │  │   Store     │  │    (polling)        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         │         ┌──────▼──────┐       ┌─────▼─────┐       │
│         │         │   File      │       │  Auto     │       │
│         │         │  Persistence│       │  Update   │       │
│         │         └──────┬──────┘       └─────┬─────┘       │
│         │                │                     │             │
│         │                ▼                     ▼             │
│         │         ~/.second-brain/      git pull &&         │
│         │         sessions.json         npm build &&        │
│         │                               restart             │
│  ┌──────▼──────────────────────────────────────────────┐    │
│  │              Graceful Shutdown Handler               │    │
│  │         (SIGTERM/SIGINT → save → exit)              │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ~/Library/Logs/                           │
│                    second-brain/                             │
│                                                              │
│   stdout.log, stderr.log, second-brain.log                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

- **Existing session store** (`src/sessions/store.ts`) - Replace in-memory Map with file backend
- **Existing entry point** (`src/index.ts`) - Add shutdown handlers and git monitor startup
- **Existing logger** (`src/logger.ts`) - Configure file output alongside console

---

## Out of Scope

- Menu bar UI or status icon - invisible operation preferred
- Notification on update/restart - silent operation
- Multiple environments or machines - single machine only
- Third-party process managers (pm2, systemd) - native launchd only
- GitHub API integration - local git pull only
- Rollback on failed update - manual intervention for v1
- Remote health monitoring - local status command only

---

## Open Questions

- [x] File format for sessions: JSON (simple, debuggable)
- [x] Log rotation strategy: Date-based with 7-day retention
- [x] Self-restart mechanism: Exit with code, let launchd restart
- [ ] Should status command read from a pidfile or query launchd directly?
- [ ] Should git monitor run in main process or separate worker?

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-14 | Initial draft with 7 features |
