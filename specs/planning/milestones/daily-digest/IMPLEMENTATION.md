# Daily Digest - Implementation Plan

## Overview

Implementation plan for proactive knowledge surfacing: archive lifecycle management, scheduled reminders, and calendar integration.

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
| 1 | Archive Lifecycle | Notes with #status/done can be moved to Archive via vault_move tool |
| 2 | Reminder Data Model | Notes can store reminder metadata in frontmatter |
| 3 | Reminder Scheduler | Background scheduler fires due reminders and sends iMessage |
| 4 | Calendar Provider | Calendar events can be queried via calendar_list tool |

## Directory Structure

```
specs/planning/milestones/daily-digest/
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
│   ├── ticket-3.2.md
│   └── ticket-3.3.md
└── phase-4/
    ├── README.md
    ├── ticket-4.1.md
    ├── ticket-4.2.md
    └── ticket-4.3.md
```

## Phase Details

### Phase 1: Archive Lifecycle

**Goal:** Enable the agent to move completed notes to Archive folder

| Ticket | Description |
|--------|-------------|
| 1.1 | Create vault_move tool to relocate notes between folders |
| 1.2 | Add archived metadata (archived_at, original_folder) on move |
| 1.3 | Update system prompt with archive lifecycle instructions |

**Checkpoint:** Agent can move a note to Archive, original folder is preserved in metadata, agent confirms the action.

---

### Phase 2: Reminder Data Model

**Goal:** Enable storing and querying reminder metadata in notes

| Ticket | Description |
|--------|-------------|
| 2.1 | Create vault_set_reminder tool to add/update reminder frontmatter |
| 2.2 | Create vault_list_reminders tool to query pending reminders |
| 2.3 | Update system prompt with reminder capabilities |

**Checkpoint:** Agent can set a reminder on a note, list pending reminders, and the metadata persists correctly in frontmatter.

---

### Phase 3: Reminder Scheduler

**Goal:** Background process that fires due reminders via iMessage

| Ticket | Description |
|--------|-------------|
| 3.1 | Create scheduler module with configurable poll interval |
| 3.2 | Integrate scheduler with agent to send reminder messages |
| 3.3 | Mark reminders as sent and add integration tests |

**Checkpoint:** Set a reminder for 2 minutes from now, verify iMessage arrives, reminder marked as sent in frontmatter.

---

### Phase 4: Google Calendar Integration

**Goal:** Read calendar events from Google Calendar and enable calendar-linked reminders

| Ticket | Description |
|--------|-------------|
| 4.1 | Create CalendarProvider interface and configuration |
| 4.2 | Implement Google Calendar provider with multi-calendar support |
| 4.3 | Create calendar_list tool and update system prompt |

**Checkpoint:** Agent can list today's calendar events from multiple Google Calendars, user can request reminder relative to a calendar event.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REMINDER_POLL_INTERVAL_MS` | `300000` (5 min) | How often to check for due reminders |
| `CALENDAR_PROVIDER` | `none` | Calendar provider: `google` or `none` |
| `GOOGLE_CALENDAR_CREDENTIALS` | `~/.second-brain/google-calendar.json` | Path to Google OAuth credentials JSON |
| `GOOGLE_CALENDAR_IDS` | `primary` | Comma-separated Google Calendar IDs to query |

## Reference Documents

- [Design Document](./DESIGN-SPEC.md)
- [Project CLAUDE.md](/CLAUDE.md)
