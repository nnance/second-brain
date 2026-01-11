# Phase 2: Obsidian File Writer + Wiring + Interaction Log

## Checkpoint
Send a text to the dedicated iMessage account → file appears in `Inbox/` folder of Obsidian vault with correct frontmatter → interaction logged to `_system/logs/YYYY-MM-DD.md`.

## Tickets
| Ticket | Description |
|--------|-------------|
| 2.1 | Implement environment configuration |
| 2.2 | Create vault initialization script |
| 2.3 | Implement markdown file writer |
| 2.4 | Implement interaction log writer |
| 2.5 | Wire iMessage listener to file writer |

## Environment Requirements
- `VAULT_PATH` environment variable set to Obsidian vault location
- Vault initialized via `npm run vault:init`

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. `npm run vault:init` creates folder structure in vault
4. Sending a text creates a markdown file in `Inbox/` with correct frontmatter
5. Each capture creates/appends to daily interaction log
