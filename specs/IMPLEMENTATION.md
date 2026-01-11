# Second Brain - Implementation Plan

## Overview

Implementation plan for the Personal Knowledge Capture System. The system is designed as an **autonomous AI agent** that uses tools to interact with the Obsidian vault and communicate with users. All decision-making is handled by the agent through a system prompt—application code provides tools only.

## Development Workflow

```
Phase N
  ├── Ticket N.1 → build → test → verify → commit
  ├── Ticket N.2 → build → test → verify → commit
  └── Ticket N.M → build → test → verify → commit
  ⏸️ STOP — Manual review

Phase N+1 (after approval)
  └── ...
```

**Within each phase:** Claude Code works autonomously, completing each ticket fully (build passes, tests pass) before committing and moving to the next ticket.

**Between phases:** Development stops for manual review. Verify the checkpoint criteria, then kick off the next phase.

## Phase Summary

| Phase | Description | Checkpoint |
|-------|-------------|------------|
| 1 | Project Setup + iMessage Listener | Send text → logged to console |
| 2 | Agent Tools Implementation | All tools work independently with tests |
| 3 | Agent Integration | Send text → agent processes → file stored + reply sent |
| 4 | Conversation Management + Polish | Multi-turn clarification works, timeout handling |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   iMessage Listener                     │
│                  (imessage-kit)                         │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Agent Runner (Anthropic SDK)               │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              System Prompt                      │   │
│   │  - Role, vault structure, tag taxonomy          │   │
│   │  - Decision guidelines                          │   │
│   │  - Clarification framework                      │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │                 Tool Handlers                   │   │
│   │  vault_write | vault_read | vault_list          │   │
│   │  log_interaction | send_message                 │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Obsidian Vault                        │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
specs/
├── DESIGN-SPEC.md              # Full system specification
├── IMPLEMENTATION.md           # This file
├── phase-1/
│   ├── README.md               # Phase overview + checkpoint
│   ├── ticket-1.1.md           # Initialize TypeScript project
│   ├── ticket-1.2.md           # Configure Pino logging
│   ├── ticket-1.3.md           # Set up Node test runner
│   └── ticket-1.4.md           # Implement iMessage listener
├── phase-2/
│   ├── README.md
│   ├── ticket-2.1.md           # Environment configuration
│   ├── ticket-2.2.md           # Vault initialization + folder structure
│   ├── ticket-2.3.md           # vault_write tool implementation
│   ├── ticket-2.4.md           # vault_read tool implementation
│   ├── ticket-2.5.md           # vault_list tool implementation
│   ├── ticket-2.6.md           # log_interaction tool implementation
│   └── ticket-2.7.md           # send_message tool implementation
├── phase-3/
│   ├── README.md
│   ├── ticket-3.1.md           # Anthropic SDK integration
│   ├── ticket-3.2.md           # Tool schema definitions
│   ├── ticket-3.3.md           # System prompt creation
│   ├── ticket-3.4.md           # Agent runner with tool dispatch
│   └── ticket-3.5.md           # Wire iMessage to agent
└── phase-4/
    ├── README.md
    ├── ticket-4.1.md           # Conversation context management
    ├── ticket-4.2.md           # Session timeout handling
    ├── ticket-4.3.md           # Error handling + retries
    └── ticket-4.4.md           # End-to-end integration tests
```

## Technology Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript |
| Runtime | Node.js (LTS) |
| Execution | tsx |
| Testing | Node native test runner |
| Linting/Formatting | Biome |
| Logging | Pino |
| iMessage | imessage-kit |
| AI | Anthropic SDK (Claude) |
| Storage | Obsidian vault (markdown files) |

## Environment Variables

| Variable | Required | Default | Phase |
|----------|----------|---------|-------|
| `VAULT_PATH` | Yes | — | 2 |
| `LOG_LEVEL` | No | `info` | 1 |
| `ANTHROPIC_API_KEY` | Yes | — | 3 |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | 3 |
| `SESSION_TIMEOUT_MS` | No | `3600000` | 4 |

## Key Design Decisions

### Agent-First Architecture

All decision-making logic lives in the system prompt, not in code:

| Decision | Where It Lives |
|----------|----------------|
| Category selection | System prompt guidelines |
| Tag assignment | System prompt taxonomy |
| When to clarify | System prompt framework |
| Response tone | System prompt role definition |

### Tools as Pure Functions

Tools are stateless functions that execute a single action:
- No business logic in tools
- Tools return results; agent decides next action
- Each tool has comprehensive tests

### Conversation Context

Multi-turn conversations are handled by maintaining message history:
- Agent receives full conversation context
- No coded state machines for clarification flow
- Timeout triggers Inbox storage as fallback

## Post-MVP (Tracked)

Not planned in detail, to be revisited after MVP usage:

- Archive lifecycle (move items when marked #status/done)
- Inbox triage tooling
- Tag evolution/suggestions
- Slack adapter
- Apple Calendar integration
- Apple Contacts integration
- Reminder/surfacing engine

## Reference Documents

- [Design Document](./DESIGN-SPEC.md) — Full system specification
