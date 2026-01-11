# Phase 3: Claude Categorization + Tags

## Checkpoint
Send a text to the dedicated iMessage account → Claude analyzes content → file is stored in correct folder (Tasks, Ideas, Reference, Projects, or Inbox) with relevant tags and predicted priority → interaction log includes categorization details.

## Tickets
| Ticket | Description |
|--------|-------------|
| 3.1 | Integrate Claude Agent SDK |
| 3.2 | Implement category analysis |
| 3.3 | Implement existing tag discovery |
| 3.4 | Implement tag generation |
| 3.5 | Implement priority prediction |
| 3.6 | Route files to correct folder |
| 3.7 | Update interaction log with categorization details |

## Environment Requirements
- `ANTHROPIC_API_KEY` environment variable
- `CLAUDE_MODEL` environment variable (optional, defaults to `claude-sonnet-4-20250514`)

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. Send various message types (task, idea, reference, project-related)
4. Verify files land in correct folders
5. Verify tags include entity tags (#person/X, #project/X) when relevant
6. Verify priority tags are assigned
7. Interaction log shows category, confidence, reasoning, and tags
