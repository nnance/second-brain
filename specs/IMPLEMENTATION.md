# Second Brain - Implementation Plan

## Overview

Implementation plan for the Personal Knowledge Capture System. Designed for autonomous development using Claude Code with manual review checkpoints between phases.

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
| 2 | Obsidian File Writer + Interaction Log | Send text → file in Inbox + log entry |
| 3 | Claude Categorization + Tags | Send text → file in correct folder with tags |
| 4 | Clarification Flow + Confirmation | Ambiguous text → clarification → storage + reply |

## Directory Structure

```
specs/
├── README.md                    # This file
├── phase-1/
│   ├── README.md               # Phase overview + checkpoint
│   ├── ticket-1.1.md           # Initialize TypeScript project
│   ├── ticket-1.2.md           # Configure Pino logging
│   ├── ticket-1.3.md           # Set up Node test runner
│   └── ticket-1.4.md           # Implement iMessage listener
├── phase-2/
│   ├── README.md
│   ├── ticket-2.1.md           # Environment configuration
│   ├── ticket-2.2.md           # Vault initialization script
│   ├── ticket-2.3.md           # Markdown file writer
│   ├── ticket-2.4.md           # Interaction log writer
│   └── ticket-2.5.md           # Wire listener to writer
├── phase-3/
│   ├── README.md
│   ├── ticket-3.1.md           # Integrate Claude Agent SDK
│   ├── ticket-3.2.md           # Category analysis
│   ├── ticket-3.3.md           # Existing tag discovery
│   ├── ticket-3.4.md           # Tag generation
│   ├── ticket-3.5.md           # Priority prediction
│   ├── ticket-3.6.md           # Route files to correct folder
│   └── ticket-3.7.md           # Update interaction log
└── phase-4/
    ├── README.md
    ├── ticket-4.1.md           # Confidence threshold check
    ├── ticket-4.2.md           # Conversation state management
    ├── ticket-4.3.md           # Clarification question generation
    ├── ticket-4.4.md           # Response detection
    ├── ticket-4.5.md           # Clarification timeout
    ├── ticket-4.6.md           # Confirmation reply
    └── ticket-4.7.md           # Update interaction log
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
| AI | Anthropic SDK (Claude Sonnet) |
| Storage | Obsidian vault (markdown files) |

## Environment Variables

| Variable | Required | Default | Phase |
|----------|----------|---------|-------|
| `VAULT_PATH` | Yes | — | 2 |
| `LOG_LEVEL` | No | `info` | 1 |
| `ANTHROPIC_API_KEY` | Yes | — | 3 |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | 3 |
| `CONFIDENCE_THRESHOLD` | No | `70` | 4 |
| `CLARIFICATION_TIMEOUT_MS` | No | `3600000` | 4 |

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

- [Design Document](../knowledge-capture-system-design.md) — Full system specification
