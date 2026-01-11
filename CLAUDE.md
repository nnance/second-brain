# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Second Brain is a Personal Knowledge Capture System that captures thoughts, ideas, tasks, and reference material via iMessage, categorizes them using Claude, and stores them in an Obsidian vault with intelligent tagging and confidence-based workflows.

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js (LTS)
- **Execution**: tsx
- **Testing**: Node native test runner
- **Linting/Formatting**: Biome
- **Logging**: Pino
- **iMessage**: imessage-kit
- **AI**: Anthropic SDK (Claude Sonnet)
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
| `CONFIDENCE_THRESHOLD` | No | `70` | Threshold for auto-categorization |
| `CLARIFICATION_TIMEOUT_MS` | No | `3600000` | Timeout before storing to Inbox |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Interaction Layer                     │
│                  (iMessage via imessage-kit)            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Categorization Engine                   │
│                   (Claude Agent SDK)                    │
│                                                         │
│   Input → Analysis → Confidence Score                   │
│   High confidence → Store directly                      │
│   Low confidence  → Clarify, then store                 │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Storage Layer                        │
│                   (Obsidian Vault)                      │
└─────────────────────────────────────────────────────────┘
```

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

The project is implemented in 4 phases with manual review between each:

1. **Phase 1**: Project Setup + iMessage Listener
2. **Phase 2**: Obsidian File Writer + Interaction Log
3. **Phase 3**: Claude Categorization + Tags
4. **Phase 4**: Clarification Flow + Confirmation

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

- **Tags over folders**: Flat structure with hierarchical tags (`#person/sarah`, `#project/security-audit`)
- **Confidence-aware**: Low-confidence categorizations trigger clarification questions
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
