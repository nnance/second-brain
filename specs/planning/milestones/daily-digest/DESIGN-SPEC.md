# Daily Digest

## Design Document v0.1

**Created:** 2026-01-14
**Status:** Draft

---

## Overview

Transform Second Brain from a capture-only system into an intelligent knowledge surfacing platform. This milestone delivers proactive reminder capabilities, automatic lifecycle management for completed items, and calendar-aware scheduling—making the vault an active participant in the user's workflow rather than a passive storage system.

### Design Principles

- **Proactive surfacing** — The system should remind users of relevant notes without being asked
- **Time-aware** — Reminders can be scheduled for specific dates/times via calendar integration
- **Clean lifecycle** — Completed items automatically move to Archive, keeping active folders tidy
- **Agent-driven** — The AI agent decides what to surface and when, not hardcoded rules
- **Non-intrusive** — Reminders are sent via iMessage, the existing communication channel

---

## Features

### 1. Archive Lifecycle

**Source:** Roadmap item

Automatically move notes to the Archive folder when they're marked with `#status/done`. This keeps the active folders (Tasks, Ideas, Projects) focused on in-progress items.

#### User Stories

- As a user, I want completed tasks to automatically move to Archive so my active folders stay clean
- As a user, I want to find archived items later if I need to reference them
- As a user, I want the agent to confirm when items are archived

#### Behavior

- When processing any message, the agent can check for notes marked `#status/done`
- Agent uses a new `vault_move` tool to relocate notes to Archive
- Original folder is preserved in frontmatter metadata (`original_folder: Tasks`)
- Archived notes retain all tags and content
- Agent confirms archival in response: "Archived 'Follow up with Sarah' to Archive."

#### Technical Considerations

- New tool: `vault_move` with source path and destination folder
- Add `archived_at` and `original_folder` to frontmatter on move
- Consider batch operations (move multiple done items at once)
- Agent decides when to run archival (on explicit request, or proactively during interactions)

---

### 2. Reminder/Surfacing Engine

**Source:** Roadmap item

Enable the agent to proactively surface notes at the right time. This includes scheduled reminders ("remind me tomorrow") and contextual surfacing (relevant notes based on current activity).

#### User Stories

- As a user, I want to say "remind me about this tomorrow at 9am" and receive an iMessage at that time
- As a user, I want to say "remind me about this next week" and have it surface automatically
- As a user, I want to see notes related to a person before a meeting with them

#### Behavior

**Scheduled Reminders:**
- User requests reminder with natural language time: "tomorrow", "next Monday", "in 2 hours"
- Agent parses intent and stores reminder metadata in note frontmatter
- Background scheduler checks for due reminders periodically
- When reminder is due, system triggers agent to send iMessage to user
- Agent crafts contextual reminder message based on note content

**Reminder Frontmatter:**
```yaml
reminder:
  due: 2026-01-15T09:00:00Z
  recurring: false  # or "daily", "weekly", etc.
  sent: false
```

**Contextual Surfacing (stretch goal):**
- Agent can proactively suggest relevant notes based on entities mentioned in conversation
- Example: User mentions "Sarah" → Agent offers to surface recent Sarah-related notes

#### Technical Considerations

- New module: `src/scheduler/` for background reminder checking
- Poll interval: Check for due reminders every minute
- Time zone handling: Use system timezone, store as ISO 8601 UTC
- Natural language parsing: Agent handles this (no date parsing library needed)
- New tool: `vault_set_reminder` to add/update reminder metadata
- New tool: `vault_list_reminders` to show pending reminders
- Background process integration: Scheduler runs within existing launchd service

---

### 3. Calendar Integration

**Source:** Suggested addition (user requested as generic)

Integrate with the user's calendar to enable deadline-aware reminders and time-based surfacing. **Decided: Google Calendar API** — chosen over Apple Calendar (AppleScript) because it handles multiple calendars natively and doesn't require calendar sharing with a separate Apple ID.

#### User Stories

- As a user, I want to say "remind me before my meeting with Sarah" and have the system find the meeting
- As a user, I want notes tagged with a deadline to surface before that calendar event
- As a user, I want to see today's calendar events and any associated notes

#### Behavior

**Calendar Reading:**
- Agent can query upcoming calendar events via new `calendar_list` tool
- Returns events with: title, start time, end time, attendees, location
- Supports time range queries: "today", "this week", "next 24 hours"

**Calendar-Linked Reminders:**
- Reminders can be tied to calendar events instead of absolute times
- Example: "remind me about security audit prep 1 hour before my meeting with Sarah"
- Reminder frontmatter supports event linking:
```yaml
reminder:
  calendar_event: "Meeting with Sarah"
  offset: -3600  # seconds before event (negative = before)
  sent: false
```

**Daily Digest (future enhancement):**
- Morning summary message with today's calendar and relevant notes
- Agent crafts personalized briefing based on events and tagged notes

#### Technical Considerations

**Provider Abstraction:**
```typescript
interface CalendarProvider {
  listEvents(from: Date, to: Date): Promise<CalendarEvent[]>;
  findEventByTitle(title: string, around?: Date): Promise<CalendarEvent | null>;
}
```

**Google Calendar Implementation:**
- Use `googleapis` npm package
- OAuth 2.0 for authentication with offline refresh token
- Support multiple calendar IDs via `GOOGLE_CALENDAR_IDS` env var
- Graceful degradation if calendar not configured (null provider)

**Configuration:**
- `CALENDAR_PROVIDER` env var: `google` or `none`
- `GOOGLE_CALENDAR_CREDENTIALS`: Path to OAuth credentials JSON
- `GOOGLE_CALENDAR_IDS`: Comma-separated calendar IDs (default: `primary`)

**Setup Requirements:**
1. Create Google Cloud project and enable Calendar API
2. Create OAuth 2.0 credentials (Desktop app)
3. Run one-time authorization to get refresh token
4. Store credentials in `~/.second-brain/google-calendar.json`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Second Brain Process                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Claude Agent                       │    │
│  │                                                      │    │
│  │  Existing Tools:           New Tools:                │    │
│  │  • vault_write            • vault_move              │    │
│  │  • vault_read             • vault_set_reminder      │    │
│  │  • vault_list             • vault_list_reminders    │    │
│  │  • log_interaction        • calendar_list           │    │
│  │  • send_message                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Reminder Scheduler                     │    │
│  │                                                      │    │
│  │  • Polls for due reminders every 60 seconds         │    │
│  │  • Triggers agent with reminder context             │    │
│  │  • Marks reminders as sent                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             Calendar Provider                        │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │ Google Calendar (googleapis)                 │   │    │
│  │  │ • Multiple calendars via GOOGLE_CALENDAR_IDS │   │    │
│  │  │ • OAuth 2.0 with refresh token               │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Obsidian Vault                            │
│                                                              │
│  Tasks/           Archive/                                   │
│  ├─ note.md       ├─ 2026-01-10_task.md (archived_at: ...)  │
│  │  reminder:     │                                          │
│  │    due: ...    │                                          │
│  │    sent: false │                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

- **Existing iMessage listener** — Reminder notifications sent via existing `send_message` tool
- **Existing session store** — Reminder scheduler runs alongside message processing
- **Existing launchd service** — Scheduler integrated into background process
- **System prompt** — Extended to explain reminder and archive capabilities to agent

---

## Out of Scope

- **Creating calendar events** — Read-only calendar access for v1
- **Recurring reminders** — Single-fire reminders only for v1
- **Email notifications** — iMessage only for v1
- **Multiple calendar accounts** — Single calendar source for v1
- **Smart surfacing based on location** — No location awareness for v1
- **Daily digest generation** — Future enhancement after core features work

---

## Open Questions

- [x] Which calendar provider to implement first? **Decided: Google Calendar**
- [x] Should reminders be stored in note frontmatter or separate index file? **Decided: Frontmatter** — keeps data with the note, easier to debug
- [x] How should timezone be handled if user travels? **Decided: System timezone at fire time** — use Mac Mini's timezone when reminder fires
- [x] Should archived notes be searchable via vault_list by default? **Decided: Exclude Archive** — keeps results focused on active items
- [x] What's the minimum reminder resolution? **Decided: 5 minutes** — lightweight polling, acceptable latency for reminders

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-01-14 | Initial draft with 3 features |
