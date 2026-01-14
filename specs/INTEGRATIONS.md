# External Integrations

**Analysis Date:** 2026-01-13

## APIs & External Services

**Anthropic Claude API:**
- Purpose: AI agent for decision-making and knowledge categorization
- Package: `@anthropic-ai/claude-agent-sdk` ^0.2.5 - `package.json`
- Integration files:
  - `src/agent/client.ts` - SDK initialization and exports
  - `src/agent/runner.ts` - Query execution
  - `src/agent/mcp-server.ts` - Tool definitions via MCP server
- Auth: `ANTHROPIC_API_KEY` environment variable - `src/config.ts`
- Model: `claude-sonnet-4-20250514` (default, configurable via `CLAUDE_MODEL`)
- Features used: query(), tool(), createSdkMcpServer()

**iMessage (macOS):**
- Purpose: Capture incoming thoughts and send agent responses
- Package: `@photon-ai/imessage-kit` ^2.1.0 - `package.json`
- Integration files:
  - `src/messages/listener.ts` - Message capture via polling
  - `src/tools/send-message.ts` - Reply sending
- Auth: macOS system permissions (Full Disk Access required)
- Configuration:
  - Poll interval: 1 second - `src/messages/listener.ts`
  - Debug mode: Enabled when `LOG_LEVEL=debug`

**Email/SMS:**
- Not applicable (iMessage only)

## Data Storage

**Obsidian Vault (Local File System):**
- Purpose: Persistent storage for captured notes
- Integration: Node.js fs/promises built-in
- Connection: `VAULT_PATH` environment variable - `src/config.ts`
- Client: Direct file system operations
- Schema: Markdown files with YAML frontmatter

**Operations:**
- Write notes: `src/tools/vault-write.ts`
- Read notes: `src/tools/vault-read.ts`
- List/search notes: `src/tools/vault-list.ts`
- Audit logging: `src/tools/log-interaction.ts`

**Folder Structure:**
```
vault/
├── _system/logs/    # Daily interaction logs (YYYY-MM-DD.md)
├── Tasks/           # Actionable items
├── Ideas/           # Thoughts to explore
├── Reference/       # Information to retrieve later
├── Projects/        # Multi-note initiatives
├── Inbox/           # Uncertain items for manual triage
└── Archive/         # Completed/inactive items
```

**Caching:**
- None (all operations hit file system directly)

**Databases:**
- None (file-based storage only)

## Authentication & Identity

**Auth Provider:**
- None (single-user local application)
- Future: Could add user identification via iMessage sender

**API Authentication:**
- Anthropic: Bearer token via `ANTHROPIC_API_KEY` env var
- iMessage: macOS system permissions (no API key)

## Monitoring & Observability

**Error Tracking:**
- None (local application)
- Errors logged via Pino to stdout

**Analytics:**
- None

**Logs:**
- Pino structured logging to stdout - `src/logger.ts`
- Interaction audit logs in vault - `_system/logs/YYYY-MM-DD.md`
- Log level configurable via `LOG_LEVEL` env var

## CI/CD & Deployment

**Hosting:**
- Local macOS machine only
- Not deployed to cloud (iMessage requires local macOS)

**CI Pipeline:**
- None configured
- Manual: `npm test && npm run lint && npm run build`

## Environment Configuration

**Development:**
- Required env vars: `VAULT_PATH`, `ANTHROPIC_API_KEY`
- Optional env vars: `CLAUDE_MODEL`, `LOG_LEVEL`, `SESSION_TIMEOUT_MS`
- Secrets location: `.env` file (gitignored), copy from `.env.example`

**Production:**
- Same as development (local application)
- Recommended: Set `LOG_LEVEL=info` (debug produces verbose output)
- Session timeout: 3600000ms (1 hour) default

## Webhooks & Callbacks

**Incoming:**
- iMessage polling (not webhooks) - `src/messages/listener.ts`
- Polls every 1 second for new messages

**Outgoing:**
- iMessage replies via SDK - `src/tools/send-message.ts`
- Sent in response to agent's send_message tool calls

## MCP Server Tools

The application exposes 5 tools to the Claude agent via in-process MCP server:

| Tool | Purpose | File |
|------|---------|------|
| `vault_write` | Create notes with metadata | `src/tools/vault-write.ts` |
| `vault_read` | Read existing notes | `src/tools/vault-read.ts` |
| `vault_list` | Browse/search notes by folder and tags | `src/tools/vault-list.ts` |
| `log_interaction` | Record audit trail | `src/tools/log-interaction.ts` |
| `send_message` | Reply to user via iMessage | `src/tools/send-message.ts` |

**Tool Registration:** `src/agent/mcp-server.ts`

## Data Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   iMessage   │────>│ Second Brain │────>│ Anthropic    │
│   (macOS)    │<────│   (Node.js)  │<────│ Claude API   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Obsidian    │
                     │   Vault      │
                     │ (Local FS)   │
                     └──────────────┘
```

---

*Integration audit: 2026-01-13*
*Update when adding/removing external services*
