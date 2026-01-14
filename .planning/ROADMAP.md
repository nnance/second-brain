# Roadmap: Second Brain Background Service

## Overview

Transform Second Brain from a manually-started terminal process to a production-ready macOS background service. The journey: first make sessions survive restarts (persistence), then make the service manage its own lifecycle (launchd), then make it stay current with code changes (git auto-update), and finally verify the complete system works end-to-end.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Session Persistence** — File-based session storage replacing in-memory Map
- [x] **Phase 2: Graceful Lifecycle** — Shutdown/startup with state preservation and restoration
- [ ] **Phase 3: launchd Service** — macOS service configuration with KeepAlive
- [ ] **Phase 4: Git Monitor** — Watch main branch for changes
- [ ] **Phase 5: Auto-Update** — Pull changes and restart service automatically
- [ ] **Phase 6: Integration** — End-to-end system verification

## Phase Details

### Phase 1: Session Persistence
**Goal**: Replace in-memory session Map with file-based storage that survives process restarts
**Depends on**: Nothing (first phase)
**Research**: Unlikely (Node.js fs/JSON, established patterns)
**Plans**: 2 plans

Plans:
- [x] 01-01: Session file store implementation and store migration
- [x] 01-02: Session persistence tests

### Phase 2: Graceful Lifecycle
**Goal**: Implement clean shutdown that saves state and startup that restores it
**Depends on**: Phase 1
**Research**: Unlikely (Node.js signal handling, existing shutdown code)
**Plans**: 3 plans

Plans:
- [x] 02-01: Session restore on startup
- [x] 02-02: Graceful shutdown with pending save wait
- [x] 02-03: Lifecycle integration tests

### Phase 3: launchd Service
**Goal**: Configure launchd plist for auto-start on login with KeepAlive crash recovery
**Depends on**: Phase 2
**Research**: Likely (launchd plist configuration)
**Research topics**: launchd plist structure, KeepAlive options, environment variables, StandardOutPath/StandardErrorPath logging
**Plans**: 3 plans

Plans:
- [ ] 03-01: launchd plist template creation
- [ ] 03-02: Install/uninstall scripts
- [ ] 03-03: Service management documentation

### Phase 4: Git Monitor
**Goal**: Watch main branch for new commits using local git commands
**Depends on**: Phase 3
**Research**: Unlikely (child_process git commands, polling pattern)
**Plans**: 2 plans

Plans:
- [ ] 04-01: Git change detection module
- [ ] 04-02: Polling integration with main process

### Phase 5: Auto-Update
**Goal**: Pull changes and trigger service restart when new commits detected
**Depends on**: Phase 4
**Research**: Unlikely (git pull + launchctl restart, builds on earlier phases)
**Plans**: 2 plans

Plans:
- [ ] 05-01: Git pull and restart logic
- [ ] 05-02: Update flow integration

### Phase 6: Integration
**Goal**: End-to-end verification of complete background service system
**Depends on**: Phase 5
**Research**: Unlikely (testing existing system behavior)
**Plans**: 2 plans

Plans:
- [ ] 06-01: Integration test suite
- [ ] 06-02: Manual verification checklist

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Session Persistence | 2/2 | Complete | 2026-01-13 |
| 2. Graceful Lifecycle | 3/3 | Complete | 2026-01-14 |
| 3. launchd Service | 0/3 | Not started | - |
| 4. Git Monitor | 0/2 | Not started | - |
| 5. Auto-Update | 0/2 | Not started | - |
| 6. Integration | 0/2 | Not started | - |
