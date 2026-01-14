# Ticket 2.2: Create vault_list_reminders Tool

## Description

Create a new `vault_list_reminders` tool that queries all notes with pending (unsent) reminders. This allows the agent to show upcoming reminders and enables the scheduler to find due reminders.

## Acceptance Criteria

- [ ] New file `src/tools/vault-list-reminders.ts` created
- [ ] Tool scans active vault folders for notes with reminders (excludes Archive by default)
- [ ] Tool returns only unsent reminders (`sent: false`)
- [ ] Tool can optionally filter by time range (due before X)
- [ ] Tool returns reminder details with note info
- [ ] Tool is registered in MCP server
- [ ] Unit tests cover various scenarios

## Technical Notes

**Tool Schema:**
```typescript
interface VaultListRemindersParams {
  due_before?: string;  // ISO 8601: only reminders due before this time
  limit?: number;       // Max results (default 50)
}

interface ReminderInfo {
  filepath: string;
  title: string;
  reminder: {
    due?: string;
    calendar_event?: string;
    offset?: number;
    sent: boolean;
  };
}

interface VaultListRemindersResult {
  success: boolean;
  reminders?: ReminderInfo[];
  error?: string;
}
```

**Implementation Approach:**
1. Scan active content folders, excluding Archive by default (Tasks, Ideas, Reference, Projects, Inbox)
2. Parse frontmatter for each note
3. Check for `reminder` block with `sent: false`
4. If `due_before` specified, filter by due date
5. Sort by due date (soonest first)
6. Return matching reminders

**Note:** Archive is excluded because reminders on archived (completed) items are typically no longer relevant.

**Calendar-Linked Reminders:**
- For reminders with `calendar_event` instead of `due`, include them in results
- The scheduler (Phase 3) will resolve actual due time from calendar
- For now, just return them with null/missing due date

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes all tests including reminder listing tests
3. `npm run lint` shows no errors
4. Tool appears in MCP server tool list
5. Manual test: Create notes with reminders, verify list returns correct items
