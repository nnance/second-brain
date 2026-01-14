# Ticket 3.3: Mark Reminders as Sent

## Description

After a reminder is successfully sent, update the note's frontmatter to mark `sent: true`. This prevents the reminder from firing again on subsequent scheduler ticks.

## Acceptance Criteria

- [ ] New tool or function to mark reminder as sent
- [ ] Frontmatter updated with `sent: true` after successful send
- [ ] Failed sends do NOT mark as sent (will retry next tick)
- [ ] Add `sent_at` timestamp to frontmatter
- [ ] Integration tests verify end-to-end flow
- [ ] Scheduler skips already-sent reminders

## Technical Notes

**Updated Frontmatter After Send:**
```yaml
reminder:
  due: 2026-01-15T09:00:00Z
  sent: true
  sent_at: 2026-01-15T09:00:32Z
```

**Implementation Options:**

1. **Extend vault_set_reminder tool** - Add parameter to mark as sent
2. **New internal function** - Not exposed as agent tool, just internal use

Recommended: Option 1 (extend existing tool) for consistency.

**Updated vault_set_reminder:**
```typescript
interface VaultSetReminderParams {
  filepath: string;
  due?: string;
  calendar_event?: string;
  offset?: number;
  mark_sent?: boolean;  // NEW: Set sent=true and add sent_at
}
```

**Scheduler Flow:**
```typescript
async function onReminderDue(reminder: ReminderInfo) {
  try {
    // 1. Trigger agent to send reminder
    await agentRunner.processReminderMessage(reminder);

    // 2. Mark as sent (only on success)
    await vaultSetReminder({
      filepath: reminder.filepath,
      mark_sent: true,
    });

    logger.info({ filepath: reminder.filepath }, "Reminder sent and marked");
  } catch (error) {
    logger.error({ error, filepath: reminder.filepath }, "Reminder failed, will retry");
    // Don't mark as sent - will retry next tick
  }
}
```

**Integration Test Checklist:**
1. Create note with reminder due in 1 minute
2. Wait for scheduler to fire
3. Verify iMessage was sent
4. Verify frontmatter has `sent: true` and `sent_at`
5. Verify scheduler doesn't fire again for same reminder

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests including integration tests
3. `npm run lint` shows no errors
4. Manual test: Full end-to-end reminder flow works
5. Manual test: Reminder doesn't fire twice
