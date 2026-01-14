# Phase 2: Reminder Data Model

## Checkpoint

After this phase, the agent can set reminders on notes and query pending reminders. Reminder metadata is stored in note frontmatter and persists correctly.

## Tickets

| Ticket | Description |
|--------|-------------|
| 2.1 | Create vault_set_reminder tool to add/update reminder frontmatter |
| 2.2 | Create vault_list_reminders tool to query pending reminders |
| 2.3 | Update system prompt with reminder capabilities |

## Environment Requirements

- Existing vault structure
- Existing tool infrastructure (MCP server)

## Done Criteria for Phase

1. `vault_set_reminder` tool exists and is registered
2. `vault_list_reminders` tool exists and is registered
3. Reminder metadata persists correctly in frontmatter
4. System prompt includes reminder instructions
5. Agent can set and query reminders
6. All tests pass, build succeeds, lint passes
