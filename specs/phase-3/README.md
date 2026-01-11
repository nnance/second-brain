# Phase 3: Refactor to Agent Tools

## Checkpoint
Existing Phase 2 code refactored into agent-callable tools. Each tool is a pure function that can be invoked by the AI agent. Tools have no business logic—they execute actions and return structured results.

## Tickets
| Ticket | Description |
|--------|-------------|
| 3.1 | Refactor vault writer to vault_write tool |
| 3.2 | Implement vault_read tool |
| 3.3 | Implement vault_list tool |
| 3.4 | Refactor interaction log to log_interaction tool |
| 3.5 | Implement send_message tool |

## Background

Phase 2 implemented direct file writing that stores all messages to Inbox:
- `src/vault/writer.ts` — Writes markdown files with frontmatter
- `src/vault/interaction-log.ts` — Appends to daily log files

This phase refactors these modules into **agent tools** that:
1. Accept structured parameters from the agent
2. Return structured results (success/error)
3. Can be called for any folder, not just Inbox
4. Support the full tag and confidence metadata

## Tool Design Principles

1. **Pure functions** — Tools take input, perform action, return result
2. **No business logic** — Tools don't decide *what* to do, only *how* to do it
3. **Typed interfaces** — Clear input/output types for agent schema generation
4. **Never throw** — Return error in result object instead
5. **Comprehensive tests** — Each tool has unit tests for all scenarios

## Directory Structure Change

```
# Before (Phase 2)
src/
├── vault/
│   ├── writer.ts           # Direct file writer
│   └── interaction-log.ts  # Log appender

# After (Phase 3)
src/
├── vault/
│   ├── writer.ts           # Keep for backwards compatibility
│   └── interaction-log.ts  # Keep for backwards compatibility
├── tools/
│   ├── vault-write.ts      # Agent tool: create notes
│   ├── vault-read.ts       # Agent tool: read notes
│   ├── vault-list.ts       # Agent tool: list/search notes
│   ├── log-interaction.ts  # Agent tool: audit logging
│   └── send-message.ts     # Agent tool: reply to user
```

## Migration Strategy

1. Create new `src/tools/` directory
2. Implement each tool as a new module (can reuse logic from Phase 2)
3. Keep Phase 2 code in place for now (wiring changes in Phase 4)
4. Tools work independently and can be tested in isolation

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. All five tools implemented in `src/tools/`
4. Each tool has corresponding `.test.ts` file
5. Tools can be imported and called programmatically
6. Tools return structured results (not throw exceptions)
