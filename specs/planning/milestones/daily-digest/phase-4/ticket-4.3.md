# Ticket 4.3: Create calendar_list Tool

## Description

Create the `calendar_list` tool that exposes calendar functionality to the agent. Also update the system prompt to explain calendar capabilities and update the scheduler to resolve calendar-linked reminders.

## Acceptance Criteria

- [ ] New file `src/tools/calendar-list.ts` created
- [ ] Tool queries calendar provider for events
- [ ] Tool accepts time range parameters
- [ ] Tool returns events in agent-friendly format
- [ ] Tool is registered in MCP server
- [ ] System prompt updated with calendar instructions
- [ ] Scheduler resolves calendar-linked reminder due times
- [ ] Unit tests cover tool functionality

## Technical Notes

**Tool Schema:**
```typescript
interface CalendarListParams {
  range?: 'today' | 'tomorrow' | 'this_week' | 'custom';
  from?: string;  // ISO 8601, required if range='custom'
  to?: string;    // ISO 8601, required if range='custom'
}

interface CalendarListResult {
  success: boolean;
  events?: {
    id: string;
    title: string;
    start: string;  // ISO 8601
    end: string;
    location?: string;
    attendees?: string[];
  }[];
  error?: string;
}
```

**Range Helpers:**
- `today`: midnight to midnight current day
- `tomorrow`: midnight to midnight next day
- `this_week`: now to end of week (Sunday)
- `custom`: use provided from/to

**System Prompt Addition:**
```markdown
## Calendar

You can query the user's calendar to provide context-aware assistance.

### Listing Events
Use `calendar_list` to see upcoming events:
- "What's on my calendar today?" → calendar_list with range="today"
- "Show my meetings this week" → calendar_list with range="this_week"

Present events clearly:
- "Today you have:
  - 10:00 AM: Team standup (30 min)
  - 2:00 PM: Meeting with Sarah (1 hour) at Conference Room B"

### Calendar-Linked Reminders
Users can set reminders relative to events:
- "remind me about security audit 1 hour before my meeting with Sarah"

Use `vault_set_reminder` with:
- calendar_event: "Meeting with Sarah" (or partial match)
- offset: -3600 (negative = before event)

The scheduler will resolve the actual time based on the calendar.
```

**Scheduler Enhancement:**

Update scheduler to resolve calendar-linked reminders:
```typescript
async function resolveReminderDueTime(reminder: ReminderInfo): Promise<Date | null> {
  if (reminder.reminder.due) {
    return new Date(reminder.reminder.due);
  }

  if (reminder.reminder.calendar_event) {
    const event = await calendarProvider.findEventByTitle(
      reminder.reminder.calendar_event
    );
    if (event) {
      const offsetMs = (reminder.reminder.offset || 0) * 1000;
      return new Date(event.start.getTime() + offsetMs);
    }
  }

  return null; // Cannot resolve
}
```

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests
3. `npm run lint` shows no errors
4. Tool appears in MCP server tool list
5. Manual test: Ask agent about today's calendar, verify response
6. Manual test: Set calendar-linked reminder, verify it fires correctly
