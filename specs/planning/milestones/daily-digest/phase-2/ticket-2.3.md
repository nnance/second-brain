# Ticket 2.3: Update System Prompt with Reminder Capabilities

## Description

Extend the system prompt to instruct the agent about reminder functionality. The agent should understand how to set reminders based on natural language time expressions and how to list pending reminders.

## Acceptance Criteria

- [ ] System prompt includes section on Reminders
- [ ] Agent understands natural language time expressions
- [ ] Agent knows how to use vault_set_reminder tool
- [ ] Agent knows how to use vault_list_reminders tool
- [ ] Agent can confirm reminder creation to user
- [ ] Instructions are clear and concise

## Technical Notes

**Add to System Prompt (`src/agent/system-prompt.ts`):**

```markdown
## Reminders

You can set reminders on notes so users receive iMessage notifications at specific times.

### Setting Reminders

When a user says things like:
- "remind me about this tomorrow" → Set reminder for tomorrow 9am
- "remind me in 2 hours" → Set reminder for 2 hours from now
- "remind me next Monday at 3pm" → Set reminder for that specific time
- "remind me before my meeting with Sarah" → Set calendar-linked reminder

Use `vault_set_reminder` to add reminder metadata to the note:
- For absolute times: provide the `due` parameter as ISO 8601
- For calendar-linked: provide `calendar_event` and optional `offset` (seconds)

Default times when not specified:
- "tomorrow" → 9:00 AM
- "next week" → Monday 9:00 AM
- "in X hours/days" → calculated from current time

### Listing Reminders

When users ask about upcoming reminders:
- "what reminders do I have?" → Use vault_list_reminders
- "show my pending reminders" → Use vault_list_reminders

Present reminders in a friendly format:
- "You have 3 upcoming reminders:
  1. Follow up with Sarah - tomorrow at 9am
  2. Security audit prep - Friday at 2pm
  3. Review proposal - 1 hour before Meeting with Client"

### Confirmation

After setting a reminder, confirm:
- "I'll remind you about 'Follow up with Sarah' tomorrow at 9am."
- "Set a reminder for 1 hour before your meeting with Sarah."
```

**Placement:**
- Add after "Archive Lifecycle" section
- Before "Workflow" section

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes (no test changes needed, just prompt update)
3. `npm run lint` shows no errors
4. Review system prompt to confirm reminder section is clear and complete
