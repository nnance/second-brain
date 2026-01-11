# Phase 4: Agent Integration

## Checkpoint
Send a text to the dedicated iMessage account → AI agent processes the message using tools → file is stored in the appropriate folder with tags → confirmation reply sent to user. The agent makes all decisions about categorization, tags, and whether to ask for clarification.

## Tickets
| Ticket | Description |
|--------|-------------|
| 4.1 | Anthropic SDK integration |
| 4.2 | Tool schema definitions |
| 4.3 | System prompt creation |
| 4.4 | Agent runner with tool dispatch |
| 4.5 | Wire iMessage to agent |

## Environment Requirements
- `ANTHROPIC_API_KEY` environment variable
- `CLAUDE_MODEL` environment variable (optional, defaults to `claude-sonnet-4-20250514`)
- `VAULT_PATH` environment variable
- Vault initialized via `npm run vault:init`

## Architecture

```
┌─────────────────┐
│ iMessage        │
│ Listener        │
└────────┬────────┘
         │ message
         ▼
┌─────────────────────────────────────────────────────┐
│              Agent Runner                           │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ 1. Build conversation (system prompt + user)  │  │
│  │ 2. Send to Claude API                         │  │
│  │ 3. If tool_use response:                      │  │
│  │    - Dispatch to tool handler                 │  │
│  │    - Return result to Claude                  │  │
│  │    - Loop until stop_sequence                 │  │
│  │ 4. Extract final text response                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Tool Handlers:                                     │
│  ├── vault_write  → src/tools/vault-write.ts       │
│  ├── vault_read   → src/tools/vault-read.ts        │
│  ├── vault_list   → src/tools/vault-list.ts        │
│  ├── log_interaction → src/tools/log-interaction.ts│
│  └── send_message → src/tools/send-message.ts      │
└─────────────────────────────────────────────────────┘
```

## Key Concepts

### Agent Loop
The agent runner implements a loop that:
1. Sends messages to Claude with tools defined
2. Handles `tool_use` responses by executing the tool
3. Returns `tool_result` to Claude
4. Continues until Claude responds with `end_turn`

### No Coded Logic
All decision-making happens in the system prompt:
- Which category to use
- What tags to assign
- Whether to ask for clarification
- How to respond to the user

### Tool Dispatch
A dispatcher maps tool names to handler functions:
```typescript
const toolHandlers = {
  vault_write: vaultWrite,
  vault_read: vaultRead,
  vault_list: vaultList,
  log_interaction: logInteraction,
  send_message: sendMessage,
};
```

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. Send a clear task message → stored in Tasks/ with appropriate tags
4. Send a reference/link message → stored in Reference/
5. Agent sends confirmation reply via iMessage
6. Interaction logged to `_system/logs/YYYY-MM-DD.md`
7. Agent handles clarification naturally (Phase 5 adds timeout handling)
