# Phase 4: Google Calendar Integration

## Checkpoint

After this phase, the agent can query calendar events from multiple Google Calendars and users can set reminders relative to calendar events.

## Tickets

| Ticket | Description |
|--------|-------------|
| 4.1 | Create CalendarProvider interface and configuration |
| 4.2 | Implement Google Calendar provider with multi-calendar support |
| 4.3 | Create calendar_list tool and update system prompt |

## Environment Requirements

- Google Cloud project with Calendar API enabled
- OAuth 2.0 credentials configured
- `CALENDAR_PROVIDER=google` env var set
- `GOOGLE_CALENDAR_CREDENTIALS` pointing to credentials JSON
- `GOOGLE_CALENDAR_IDS` with comma-separated calendar IDs (optional, defaults to `primary`)

## Done Criteria for Phase

1. CalendarProvider interface defined with null provider fallback
2. Google Calendar provider implemented with multi-calendar support
3. `calendar_list` tool works and is registered
4. Agent can query calendar events from multiple calendars
5. Calendar-linked reminders resolve correctly
6. All tests pass, build succeeds, lint passes
7. Setup documentation in `docs/google-calendar-setup.md`
