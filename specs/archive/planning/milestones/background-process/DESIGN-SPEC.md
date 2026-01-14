# Second Brain Background Service

## What This Is

A production-ready background service infrastructure for Second Brain that runs continuously on macOS, self-heals on crash, auto-updates from git, and preserves conversation state across restarts. Invisible, silent operation — just always there.

## Core Value

Reliable always-on knowledge capture that never loses a conversation, never requires manual restarts, and stays current with the latest code automatically.

## Requirements

### Validated

- ✓ iMessage listener captures incoming messages — existing
- ✓ Claude agent processes and categorizes knowledge — existing
- ✓ 5 MCP tools (vault_write, vault_read, vault_list, log_interaction, send_message) — existing
- ✓ Session management with timeout handling — existing
- ✓ Obsidian vault storage with YAML frontmatter — existing

### Active

- [ ] launchd plist for macOS service management
- [ ] Auto-start on login with KeepAlive for crash recovery
- [ ] Git branch monitor watching main for changes
- [ ] Auto-pull and service restart on new commits
- [ ] File-based session persistence surviving restarts
- [ ] Session restore on service startup
- [ ] Graceful shutdown preserving session state

### Out of Scope

- Menu bar UI or status icon — invisible operation preferred
- Notification on update/restart — silent operation
- Multiple environments or machines — single machine only
- Third-party process managers (pm2, systemd) — native launchd only
- GitHub API integration — local git pull only

## Context

Second Brain is a working knowledge capture system using iMessage as input and Obsidian as storage. The core capture loop is complete (Phases 1-5 shipped). Current gap: runs manually via `npm start`, requires terminal, dies on logout, loses sessions on restart.

Existing codebase:
- `src/index.ts` — main entry, starts listener and timeout checker
- `src/sessions/store.ts` — in-memory Map-based session storage
- `src/sessions/timeout.ts` — session timeout handling
- Node.js 20+, TypeScript, ES modules

## Constraints

- **Process management**: launchd only — no pm2, Docker, or third-party managers
- **Dependencies**: Minimize new dependencies — use Node.js stdlib where possible
- **Git integration**: Local git operations only — no GitHub API calls
- **Platform**: macOS only (iMessage dependency)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| launchd over pm2 | Native macOS, no dependencies, system integration | — Pending |
| File persistence over SQLite | Simpler, no new dependencies, sessions are small | — Pending |
| Git polling over webhooks | Local-only, no network exposure, simpler | — Pending |

---
*Last updated: 2026-01-13 after initialization*
