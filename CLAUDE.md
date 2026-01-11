# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Second Brain is a Personal Knowledge Capture System built as an **autonomous AI agent**. It captures thoughts, ideas, tasks, and reference material via iMessage, and uses an AI agent (Claude) with tools to categorize, tag, and store them in an Obsidian vault.

**Key architectural principle**: The AI agent makes ALL decisions about categorization, tagging, and when to ask clarifying questions. Application code provides tools only—no business logic is coded.

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js (LTS)
- **Execution**: tsx
- **Testing**: Node native test runner
- **Linting/Formatting**: Biome
- **Logging**: Pino
- **iMessage**: imessage-kit
- **AI Agent**: Claude Agent SDK (@anthropic-ai/claude-agent-sdk)
- **Validation**: Zod (for tool schemas)
- **Storage**: Obsidian vault (markdown files)

## Common Commands

```bash
npm run build      # Compile TypeScript (tsc)
npm run dev        # Run with tsx
npm start          # Start the iMessage listener
npm test           # Run tests (Node native test runner)
npm run lint       # Check code with Biome
npm run format     # Format code with Biome
npm run vault:init # Initialize Obsidian vault folder structure
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_PATH` | Yes | — | Path to Obsidian vault |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `ANTHROPIC_API_KEY` | Yes | — | API key for Claude |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | Model to use |
| `SESSION_TIMEOUT_MS` | No | `3600000` | Timeout for clarification sessions |

## Architecture

The system follows an **agent-first architecture** using the Claude Agent SDK where the AI agent is the decision-maker and the application provides tools via an in-process MCP server.

```
┌─────────────────────────────────────────────────────────┐
│                   iMessage Listener                     │
│                  (imessage-kit)                         │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Claude Agent SDK (query)                   │
│                                                         │
│   System Prompt:                                        │
│   - Role & personality                                  │
│   - Vault structure knowledge                           │
│   - Tag taxonomy                                        │
│   - Decision guidelines                                 │
│   - When to clarify vs store                            │
│                                                         │
│   In-Process MCP Server (SDK tools):                    │
│   - vault_write    (create notes)                       │
│   - vault_read     (read existing notes)                │
│   - vault_list     (browse/search notes)                │
│   - log_interaction (audit trail)                       │
│   - send_message   (reply to user)                      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Obsidian Vault                        │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **No hardcoded categorization logic** — Agent decides categories based on system prompt
2. **No hardcoded confidence thresholds** — Agent judges when clarification is needed
3. **No hardcoded tag rules** — Agent follows taxonomy from system prompt
4. **Tools are capabilities, not decisions** — Tools execute; agent decides when/how
5. **Conversation state in agent context** — Multi-turn clarification handled naturally

## Obsidian Vault Structure

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

## Implementation Phases

The project is implemented in 5 phases with manual review between each:

1. **Phase 1**: Project Setup + iMessage Listener
2. **Phase 2**: Obsidian File Writer + Wiring (messages stored to Inbox)
3. **Phase 3**: Refactor to Agent Tools (vault_write, vault_read, vault_list, log_interaction, send_message)
4. **Phase 4**: Agent Integration (Anthropic SDK, system prompt, agent runner)
5. **Phase 5**: Conversation Management + Polish (sessions, timeouts, error handling)

See `specs/` directory for detailed ticket specifications.

## Development Workflow

Each ticket follows: build → test → lint → verify → commit

Verification checklist before completing a ticket:
```bash
npm run build    # Exit 0, no errors
npm test         # All tests pass
npm run lint     # No errors
```

## Key Design Decisions

- **Agent-first**: AI makes all decisions; code provides tools only
- **Tags over folders**: Flat structure with hierarchical tags (`#person/sarah`, `#project/security-audit`)
- **Confidence-aware**: Agent decides when to ask clarifying questions
- **Auditable**: Complete interaction log for every capture event
- **Single source of truth**: Obsidian vault only, no syncing to external systems

## Note Format

All notes use YAML frontmatter:
```markdown
---
created: 2026-01-10T14:32:00Z
tags:
  - person/sarah
  - project/security-audit
  - priority/high
  - status/waiting
confidence: 92
---

# Note Title

Content here...
```

## Tag Taxonomy

- Entity: `#person/{name}`, `#project/{name}`, `#topic/{name}`, `#company/{name}`
- Priority: `#priority/urgent|high|normal|low|someday`
- Status: `#status/waiting|active|scheduled|done`

## Source Code Structure

```
src/
├── index.ts              # Main entry point
├── config.ts             # Environment configuration
├── logger.ts             # Pino logger setup
├── messages/
│   └── listener.ts       # iMessage listener
├── tools/
│   ├── vault-write.ts    # vault_write tool handler
│   ├── vault-read.ts     # vault_read tool handler
│   ├── vault-list.ts     # vault_list tool handler
│   ├── log-interaction.ts # log_interaction tool handler
│   └── send-message.ts   # send_message tool handler
├── agent/
│   ├── client.ts         # Claude Agent SDK exports
│   ├── mcp-server.ts     # In-process MCP server with tools
│   ├── system-prompt.ts  # Agent system prompt
│   └── runner.ts         # Agent query runner
├── sessions/
│   ├── store.ts          # Session state management
│   └── timeout.ts        # Session timeout handling
└── utils/
    └── retry.ts          # Retry logic for API calls
```
