# Ticket 1.3: Update System Prompt with Archive Lifecycle

## Description

Extend the system prompt to instruct the agent about archive lifecycle management. The agent should understand when and how to use the `vault_move` tool to archive completed items.

## Acceptance Criteria

- [ ] System prompt includes section on Archive lifecycle
- [ ] Agent understands to move notes with `#status/done` to Archive
- [ ] Agent knows to confirm archival actions to user
- [ ] Agent can proactively offer to archive completed items
- [ ] Instructions are clear and concise

## Technical Notes

**Add to System Prompt (`src/agent/system-prompt.ts`):**

```markdown
## Archive Lifecycle

Notes marked with `#status/done` should be moved to the Archive folder to keep active folders clean.

### When to Archive
- User explicitly marks something as done: "done with the security audit task"
- User confirms a task is complete: "yes, I finished that"
- You see `#status/done` tag and the note is not yet in Archive

### How to Archive
1. Use `vault_move` to move the note from its current folder to Archive
2. The tool automatically adds `archived_at` and `original_folder` metadata
3. Confirm to the user: "Archived 'Note Title' from Tasks."

### Proactive Archival
When processing messages, you may notice notes with `#status/done` still in active folders.
You can offer: "I notice you have 3 completed tasks. Would you like me to archive them?"
```

**Placement:**
- Add after the "Vault Structure" section
- Before "Tag Taxonomy" section

## Done Conditions (for Claude Code to verify)

1. `npm run build` exits 0
2. `npm test` passes (no test changes needed, just prompt update)
3. `npm run lint` shows no errors
4. Review system prompt to confirm archive section is clear and complete
