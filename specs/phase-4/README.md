# Phase 4: Agent Integration

## Checkpoint
Send a text to the dedicated iMessage account → Claude Agent SDK processes the message using MCP tools → file is stored in the appropriate folder with tags → confirmation reply sent to user. The agent makes all decisions about categorization, tags, and whether to ask for clarification.

## Tickets
| Ticket | Description |
|--------|-------------|
| 4.1 | Claude Agent SDK integration |
| 4.2 | MCP server with tool definitions |
| 4.3 | System prompt creation |
| 4.4 | Agent query runner |
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
│              Agent Query Runner                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  query({                                       │  │
│  │    prompt: [systemPrompt, userMessage],        │  │
│  │    options: {                                  │  │
│  │      mcpServers: { "vault-tools": mcpServer }, │  │
│  │      allowedTools: [...],                      │  │
│  │      maxTurns: 10                              │  │
│  │    }                                           │  │
│  │  })                                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  MCP Server Tools:                                   │
│  ├── vault_write  → src/tools/vault-write.ts        │
│  ├── vault_read   → src/tools/vault-read.ts         │
│  ├── vault_list   → src/tools/vault-list.ts         │
│  ├── log_interaction → src/tools/log-interaction.ts │
│  └── send_message → src/tools/send-message.ts       │
└─────────────────────────────────────────────────────┘
```

## Key Concepts

### Claude Agent SDK
The Claude Agent SDK provides:
- `query()` function for running agent interactions
- `createSdkMcpServer()` for hosting custom tools in-process
- `tool()` function for type-safe tool definitions with Zod schemas

### In-Process MCP Server
Tools are hosted in an in-process MCP server (no subprocess overhead):
```typescript
const mcpServer = createSdkMcpServer({
  name: "vault-tools",
  version: "1.0.0",
  tools: [vaultWriteTool, vaultReadTool, ...],
});
```

### No Coded Logic
All decision-making happens in the system prompt:
- Which category to use
- What tags to assign
- Whether to ask for clarification
- How to respond to the user

## Done Criteria for Phase
1. `npm run build` succeeds
2. `npm test` passes
3. Send a clear task message → stored in Tasks/ with appropriate tags
4. Send a reference/link message → stored in Reference/
5. Agent sends confirmation reply via iMessage
6. Interaction logged to `_system/logs/YYYY-MM-DD.md`
7. Agent handles clarification naturally (Phase 5 adds timeout handling)
