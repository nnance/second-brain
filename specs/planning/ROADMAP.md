# Second Brain - Feature Queue

## Overview

This document tracks planned features for the Second Brain system. Features move through the following workflow stages:

```
Backlog → Designing → In Progress → Review → Completed
```

## Workflow

| Stage           | Description                                          |
| --------------- | ---------------------------------------------------- |
| **Backlog**     | Features identified but not yet prioritized for work |
| **Designing**   | Feature is being designed/specified with tickets     |
| **In Progress** | Active development underway                          |
| **Review**      | Implementation complete, awaiting manual review      |
| **Completed**   | Feature shipped and verified                         |

---

## Backlog

- [ ] Archive lifecycle (move items when marked #status/done)
- [ ] Inbox triage tooling
- [ ] Tag evolution/suggestions
- [ ] Slack adapter
- [ ] Apple Calendar integration
- [ ] Apple Contacts integration
- [ ] Reminder/surfacing engine

---

## Designing

_No features currently being designed._

---

## In Progress

_No features currently in progress._

---

## Review

_No features currently in review._

---

## Completed

### Milestone: [background-process](./milestones/background-process/)

- [x] macOS background service (launchd script for running as a service)
- [x] GitHub main branch monitor (watch for changes to main, auto-pull and restart service)
- [x] File persistence for session store to support graceful restarts

---

## Feature Template

When adding a new feature to the backlog, use this format:

```markdown
- [ ] Feature name (brief description)
```

When a feature moves to **Designing**, create a detailed spec in `specs/features/` with:

- Problem statement
- Proposed solution
- Acceptance criteria
- Implementation tickets
