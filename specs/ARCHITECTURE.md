# Architecture

**Analysis Date:** 2026-01-13

## Pattern Overview

**Overall:** Agent-First, Event-Driven Knowledge Capture System

**Key Characteristics:**
- Event-driven: iMessage messages trigger agent processing
- Agent-centric: Claude AI makes all business decisions
- Tool-based: Application provides capabilities via MCP tools
- Session-aware: Multi-turn conversations with state management
- Stateless handlers: Tools are pure operations without business logic

## Layers

**Input Layer:**
- Purpose: Capture incoming messages and events
- Contains: iMessage listener, message normalization
- Location: `src/messages/listener.ts`
- Depends on: @photon-ai/imessage-kit SDK
- Used by: Main orchestrator (`src/index.ts`)

**Orchestration Layer:**
- Purpose: Session management and lifecycle coordination
- Contains: Session CRUD, timeout handling, graceful shutdown
- Location: `src/sessions/store.ts`, `src/sessions/timeout.ts`
- Depends on: Agent runner
- Used by: Main orchestrator, timeout checker

**Agent Layer:**
- Purpose: AI decision engine using Claude Agent SDK
- Contains: Agent query execution, system prompt, MCP server
- Location: `src/agent/runner.ts`, `src/agent/client.ts`, `src/agent/mcp-server.ts`, `src/agent/system-prompt.ts`
- Depends on: @anthropic-ai/claude-agent-sdk, tools layer
- Used by: Orchestration layer

**Tool Layer:**
- Purpose: Capabilities exposed to agent via MCP server
- Contains: 5 tool implementations (vault_write, vault_read, vault_list, log_interaction, send_message)
- Location: `src/tools/*.ts`
- Depends on: File system, config, logger
- Used by: Agent layer (invoked by Claude)

**Storage Layer:**
- Purpose: Persistent note storage in Obsidian vault
- Contains: Markdown files with YAML frontmatter
- Location: Configured via `VAULT_PATH` environment variable
- Depends on: Node.js fs/promises
- Used by: Tool layer

## Data Flow

**Message Processing:**

1. iMessage received → `src/messages/listener.ts` (IMessageSDK.startWatching)
2. Message normalized → IncomingMessage interface
3. Session retrieved/created → `src/sessions/store.ts`
4. Agent query executed → `src/agent/runner.ts` (SDK query())
5. Claude decides action → calls MCP tools
6. Tools execute → vault operations, iMessage replies
7. Session updated → pendingInput if clarification needed, deleted if complete

**Timeout Flow:**

1. Interval fires every 60s → `src/sessions/timeout.ts`
2. Check all sessions for age ≥ SESSION_TIMEOUT_MS
3. If pendingInput exists → send [SYSTEM: timeout] message to agent
4. Agent stores to Inbox → notifies user
5. Session deleted

**State Management:**
- In-memory Map-based session store
- SDK session ID for multi-turn conversation resumption
- No database persistence (ephemeral sessions)

## Key Abstractions

**Session:**
- Purpose: Track conversation state per sender
- Examples: `src/sessions/store.ts` Session interface
- Pattern: In-memory Map with CRUD operations

**Tool:**
- Purpose: Capability exposed to agent
- Examples: vault_write, vault_read, vault_list, log_interaction, send_message
- Pattern: SDK tool() factory with Zod schema validation

**Agent Runner:**
- Purpose: Execute agent queries with context
- Examples: `src/agent/runner.ts` runAgent()
- Pattern: Async generator streaming SDK responses

**Note:**
- Purpose: Knowledge unit stored in vault
- Examples: Markdown files in Tasks/, Ideas/, Reference/, etc.
- Pattern: YAML frontmatter + markdown body

## Entry Points

**Main Application:**
- Location: `src/index.ts`
- Triggers: `npm start` or `npm run dev`
- Responsibilities: Start listener, timeout checker, handle shutdown

**Vault Initialization:**
- Location: `src/scripts/init-vault.ts`
- Triggers: `npm run vault:init`
- Responsibilities: Create vault folder structure

**Agent Query:**
- Location: `src/agent/runner.ts` runAgent()
- Triggers: New message or timeout event
- Responsibilities: Execute agent, track tools called, manage session

## Error Handling

**Strategy:** Throw at source, catch at boundaries, log and fail gracefully

**Patterns:**
- Tools return `{ success: boolean, error?: string }` result objects
- Agent runner catches errors, logs, returns AgentResult
- Timeout handler logs errors, continues with next session
- Graceful shutdown on SIGINT/SIGTERM

## Cross-Cutting Concerns

**Logging:**
- Pino structured logging throughout
- Log level configurable via LOG_LEVEL env var
- Objects as first parameter: `logger.info({ data }, "message")`

**Validation:**
- Zod schemas for tool input validation (`src/agent/mcp-server.ts`)
- Path validation prevents directory traversal (`src/tools/vault-read.ts`, `src/tools/vault-list.ts`)
- Config validation at startup (`src/config.ts`)

**Security:**
- API keys via environment variables only
- No hardcoded secrets
- Path traversal prevention on vault operations

---

*Architecture analysis: 2026-01-13*
*Update when major patterns change*
