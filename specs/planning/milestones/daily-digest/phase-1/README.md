# Phase 1: Archive Lifecycle

## Checkpoint

After this phase, the agent can move notes marked with `#status/done` to the Archive folder. The original folder is preserved in metadata, and the agent confirms the archival action to the user.

## Tickets

| Ticket | Description |
|--------|-------------|
| 1.1 | Create vault_move tool to relocate notes between folders |
| 1.2 | Add archived metadata (archived_at, original_folder) on move |
| 1.3 | Update system prompt with archive lifecycle instructions |

## Environment Requirements

- Existing vault structure with Archive folder
- Existing tool infrastructure (MCP server)

## Done Criteria for Phase

1. `vault_move` tool exists and is registered with MCP server
2. Moving a note to Archive adds `archived_at` and `original_folder` to frontmatter
3. System prompt includes instructions for archive lifecycle
4. Agent can successfully move a note and confirm to user
5. All tests pass, build succeeds, lint passes
