# Ticket 3.2: Integrate Scheduler with Agent

## Description

Connect the scheduler to the agent so that when a reminder is due, the agent sends an appropriate iMessage to the user. The agent crafts a contextual reminder message based on the note content.

## Acceptance Criteria

- [ ] Scheduler callback invokes agent with reminder context
- [ ] Agent reads the note content for context
- [ ] Agent crafts a friendly reminder message
- [ ] Agent sends reminder via existing `send_message` tool
- [ ] Reminder delivery is logged
- [ ] Integration works end-to-end

## Technical Notes

**Agent Invocation Pattern:**

When a reminder is due, the scheduler should invoke the agent with a synthetic "system" message that provides context:

```typescript
// Pseudo-code for reminder trigger
const reminderContext = `
[SYSTEM: Reminder due]
The following reminder is now due. Read the note and send a friendly reminder to the user.

Note: ${reminder.filepath}
Title: ${reminder.title}
Original due time: ${reminder.reminder.due}
`;

await agentRunner.processMessage({
  sender: "system",
  content: reminderContext,
});
```

**Agent Behavior for Reminders:**

The agent should:
1. Read the note using `vault_read` to get full content
2. Craft a contextual reminder message
3. Send via `send_message`

Example reminder messages:
- "Hey! Just a reminder about 'Follow up with Sarah about the security audit'. You set this for today."
- "Reminder: 'Review proposal for client meeting' - this was scheduled for now."

**System Prompt Addition:**

Add handling for `[SYSTEM: Reminder due]` messages to the system prompt:

```markdown
## System Messages

When you receive a message starting with `[SYSTEM: Reminder due]`, it means a scheduled reminder has triggered:
1. Read the referenced note using vault_read
2. Craft a brief, friendly reminder message based on the note content
3. Send it to the user via send_message
4. Do not ask for confirmation, just send the reminder
```

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests
3. `npm run lint` shows no errors
4. Manual test: Set reminder for 2 minutes, verify iMessage arrives
