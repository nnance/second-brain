# Ticket 2.1: Create vault_set_reminder Tool

## Description

Create a new `vault_set_reminder` tool that allows the agent to add or update reminder metadata in a note's frontmatter. This enables scheduled reminders for any note in the vault.

## Acceptance Criteria

- [ ] New file `src/tools/vault-set-reminder.ts` created
- [ ] Tool accepts filepath and reminder due date (ISO 8601)
- [ ] Tool can optionally accept calendar_event and offset for event-linked reminders
- [ ] Tool validates the note exists
- [ ] Tool adds/updates `reminder` block in frontmatter
- [ ] Tool sets `sent: false` for new reminders
- [ ] Tool returns success with reminder details, or error message
- [ ] Tool is registered in MCP server
- [ ] Unit tests cover success and error cases

## Technical Notes

**Tool Schema:**
```typescript
interface VaultSetReminderParams {
  filepath: string;           // "Tasks/2026-01-10_follow-up.md"
  due?: string;               // ISO 8601: "2026-01-15T09:00:00Z"
  calendar_event?: string;    // Event title to link to
  offset?: number;            // Seconds before event (negative = before)
}

interface VaultSetReminderResult {
  success: boolean;
  reminder?: {
    due?: string;
    calendar_event?: string;
    offset?: number;
    sent: boolean;
  };
  error?: string;
}
```

**Frontmatter Format:**
```yaml
reminder:
  due: 2026-01-15T09:00:00Z
  sent: false
```

Or for calendar-linked:
```yaml
reminder:
  calendar_event: "Meeting with Sarah"
  offset: -3600
  sent: false
```

**Implementation Pattern:**
- Read existing note content
- Parse frontmatter using existing patterns from vault-list.ts
- Add/update `reminder` block
- Rewrite file with updated frontmatter
- Return reminder details

**Validation:**
- Either `due` or `calendar_event` must be provided
- If `calendar_event` provided, `offset` defaults to 0 (at event time)
- `due` must be valid ISO 8601 date

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests including new reminder tests
3. `npm run lint` shows no errors
4. Tool appears in MCP server tool list
5. Manual test: Set a reminder on a note, verify frontmatter is correct
