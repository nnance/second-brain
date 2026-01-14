# Background Process - Implementation Plan

## Overview

Implementation plan for transforming Second Brain into a production-ready macOS background service with file persistence, auto-updates, and self-healing capabilities.

## Development Workflow

```
Phase N
  ├── Ticket N.1 → build → test → verify → commit
  ├── Ticket N.2 → build → test → verify → commit
  └── Ticket N.M → build → test → verify → commit
  ⏸️ STOP — Manual review

Phase N+1 (after approval)
  └── ...
```

**Within each phase:** Claude Code works autonomously, completing each ticket fully (build passes, tests pass) before committing and moving to the next ticket.

**Between phases:** Development stops for manual review. Verify the checkpoint criteria, then kick off the next phase.

## Phase Summary

| Phase | Description | Checkpoint |
|-------|-------------|------------|
| 1 | Session Persistence | Sessions survive process restart |
| 2 | Graceful Lifecycle | Clean shutdown saves state, startup restores it |
| 3 | Service Logging | Logs written to file with rotation |
| 4 | launchd Service | Service installs and runs via launchd |
| 5 | Git Monitor & Auto-Update | Service detects and pulls new commits |
| 6 | Health Check & Integration | Status command works, end-to-end verified |

## Directory Structure

```
specs/planning/milestones/background-process/
├── DESIGN-SPEC.md
├── IMPLEMENTATION.md
├── phase-1/
│   ├── README.md
│   ├── ticket-1.1.md
│   ├── ticket-1.2.md
│   └── ticket-1.3.md
├── phase-2/
│   ├── README.md
│   ├── ticket-2.1.md
│   ├── ticket-2.2.md
│   └── ticket-2.3.md
├── phase-3/
│   ├── README.md
│   ├── ticket-3.1.md
│   └── ticket-3.2.md
├── phase-4/
│   ├── README.md
│   ├── ticket-4.1.md
│   ├── ticket-4.2.md
│   └── ticket-4.3.md
├── phase-5/
│   ├── README.md
│   ├── ticket-5.1.md
│   ├── ticket-5.2.md
│   └── ticket-5.3.md
└── phase-6/
    ├── README.md
    ├── ticket-6.1.md
    └── ticket-6.2.md
```

## Phase Details

### Phase 1: Session Persistence

**Goal:** Replace in-memory session Map with file-based storage

| Ticket | Description |
|--------|-------------|
| 1.1 | Create FileSessionStore class with JSON persistence |
| 1.2 | Add atomic write with temp file rename |
| 1.3 | Write unit tests for FileSessionStore |

**Checkpoint:** Sessions persist to `~/.second-brain/sessions.json` and survive `npm start` restart.

---

### Phase 2: Graceful Lifecycle

**Goal:** Implement clean shutdown and startup with state preservation

| Ticket | Description |
|--------|-------------|
| 2.1 | Add SIGTERM/SIGINT handlers with session save |
| 2.2 | Implement session restore on startup |
| 2.3 | Add lifecycle integration tests |

**Checkpoint:** Kill process with Ctrl+C, restart, verify sessions restored.

---

### Phase 3: Service Logging

**Goal:** Configure file-based logging with rotation

| Ticket | Description |
|--------|-------------|
| 3.1 | Add pino file transport configuration |
| 3.2 | Implement log rotation (7-day retention) |

**Checkpoint:** Logs appear in `~/Library/Logs/second-brain/`, old logs auto-deleted.

---

### Phase 4: launchd Service

**Goal:** Create launchd plist and install/uninstall scripts

| Ticket | Description |
|--------|-------------|
| 4.1 | Create launchd plist template |
| 4.2 | Write install/uninstall npm scripts |
| 4.3 | Document service management commands |

**Checkpoint:** `npm run service:install` installs service, starts on login, restarts on crash.

---

### Phase 5: Git Monitor & Auto-Update

**Goal:** Watch main branch and auto-update on new commits

| Ticket | Description |
|--------|-------------|
| 5.1 | Create git change detection module |
| 5.2 | Implement auto-pull and rebuild logic |
| 5.3 | Add self-restart trigger |

**Checkpoint:** Push to main, verify service pulls changes and restarts within poll interval.

---

### Phase 6: Health Check & Integration

**Goal:** Status command and end-to-end verification

| Ticket | Description |
|--------|-------------|
| 6.1 | Implement `npm run status` command |
| 6.2 | End-to-end integration test checklist |

**Checkpoint:** All features work together, manual verification complete.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECOND_BRAIN_DATA_DIR` | `~/.second-brain` | Data directory for sessions |
| `LOG_FILE_PATH` | `~/Library/Logs/second-brain` | Log output directory |
| `LOG_RETENTION_DAYS` | `7` | Number of days to keep log files |
| `GIT_POLL_INTERVAL_MS` | `300000` (5 min) | Git polling interval |

## Reference Documents

- [Design Document](./DESIGN-SPEC.md)
- [Project CLAUDE.md](/CLAUDE.md)
