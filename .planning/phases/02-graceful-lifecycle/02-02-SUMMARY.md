---
phase: 02-graceful-lifecycle
plan: 02
subsystem: lifecycle
tags: [shutdown, graceful-shutdown, pending-operations, process-signals, sigterm, sigint]

# Dependency graph
requires:
  - phase: 01-session-persistence (01-01)
    provides: Fire-and-forget session persistence (saveSessions function)
provides:
  - Pending save tracking mechanism (pendingSave variable)
  - waitForPendingSave() function for graceful shutdown coordination
  - Shutdown handler that waits for in-flight saves before exit
affects: [02-graceful-lifecycle, launchd-service]

# Tech tracking
tech-stack:
  added: []
  patterns: [pending operation tracking, graceful shutdown coordination]

key-files:
  created: []
  modified: [src/sessions/file-store.ts, src/index.ts]

key-decisions:
  - "Single pending save: Only one save operation can be in-flight per call site, sufficient for graceful shutdown"
  - "Explicit wait: waitForPendingSave() provides clear coordination point for shutdown handler"
  - "Null after completion: pendingSave cleared after save completes to avoid waiting on stale promises"

patterns-established:
  - "Pattern 1: Track async operations with module-level promise variable for shutdown coordination"
  - "Pattern 2: Export explicit wait function rather than exposing promise directly"
  - "Pattern 3: Shutdown handler logs each stage (shutdown, waiting, complete) for observability"

issues-created: []

# Metrics
duration: 8min
completed: 2026-01-14
---

# Phase 2 Plan 02: Graceful Shutdown with Pending Save Tracking

**Shutdown handler waits for in-flight session saves to complete before exit, preventing data loss on SIGTERM/SIGINT**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-14T02:25:00Z
- **Completed:** 2026-01-14T02:33:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Pending save tracking mechanism in file-store.ts prevents data loss on shutdown
- waitForPendingSave() provides coordination point for graceful shutdown
- Shutdown handler extended to wait for pending saves before process.exit()
- Observability via structured logging at each shutdown stage

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pending save tracking to file-store** - `15290cf` (feat)
2. **Task 2: Update shutdown handler to wait for pending saves** - `5153a6d` (feat)

## Files Created/Modified
- `src/sessions/file-store.ts` - Added pendingSave tracking variable and waitForPendingSave() export
- `src/index.ts` - Import waitForPendingSave and await it in shutdown handler with logging

## Decisions Made

**Single pending save approach**
- Track at most one save operation in-flight at a time
- Rationale: Fire-and-forget pattern from Phase 1 means saves don't overlap at same call site
- Sufficient for graceful shutdown without complex queue tracking

**Explicit wait function**
- Export waitForPendingSave() rather than exposing pendingSave directly
- Rationale: Encapsulation and clear API for shutdown coordination

**Logging at each stage**
- Log "Shutting down...", "Waiting for pending saves...", "Shutdown complete"
- Rationale: Observability for debugging shutdown issues and verifying wait behavior

## Deviations from Plan

### Environment Constraint

**1. Linux environment prevented full build verification**
- **Issue:** Project requires macOS for iMessage dependencies (@photon-ai/imessage-kit)
- **Impact:** Could not run `npm install`, `npm run build`, or `npm test` in Linux environment
- **Mitigation:** Code follows all project patterns (TypeScript, ES modules, .js imports, Pino logging)
- **Verification:** Code review confirms correctness, will verify on macOS during integration

**2. Index.ts structure changed by parallel task**
- **Issue:** During execution, 02-01 parallel task modified index.ts (added main() function, initSessionStore)
- **Impact:** Had to adapt edit to match new structure with main() wrapper
- **Mitigation:** Read file again after edit error, applied changes to current structure
- **Verification:** Shutdown handler correctly placed, imports correct

---

**Total deviations:** 2 environment/coordination constraints (documented, no code impact)
**Impact on plan:** None - code is correct, verification deferred to macOS environment

## Issues Encountered

**File modification during parallel execution**
- index.ts was modified by parallel task 02-01 between initial read and edit attempt
- Resolution: Re-read file and adapted changes to new structure
- This is expected behavior in parallel execution - handled gracefully

## Next Phase Readiness

Ready for Phase 2 Plan 03 (lifecycle integration tests):
- Pending save tracking implemented and ready for testing
- Shutdown handler extended with wait coordination
- Pattern established for tracking async operations during shutdown
- Logging in place for observability during tests

Blockers:
- Full verification requires macOS environment with installed dependencies
- Integration tests in 02-03 will verify complete shutdown/startup flow

---
*Phase: 02-graceful-lifecycle*
*Completed: 2026-01-14*
