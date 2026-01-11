# Personal Knowledge Capture System

## Design Document v0.2

**Created:** 2026-01-10
**Updated:** 2026-01-11
**Status:** Draft

---

## Overview

A personal system for capturing thoughts, ideas, tasks, and reference material via natural language input. The system is built as an **autonomous AI agent** that uses tools to interact with the Obsidian vault and communicate with the user. All decision-making—categorization, tagging, when to ask clarifying questions, where to store items—is handled by the AI agent through a system prompt, not coded application logic.

### Design Principles

- **Agent-first architecture** — Claude makes all decisions; application code provides tools only
- **Minimal dependencies** — Favor simple, zero-dependency libraries where possible
- **Single source of truth** — Obsidian vault only; no syncing to external systems
- **Tags over folders** — Flat folder structure with hierarchical tags for flexible organization
- **Auditable** — Complete interaction log for every capture event
- **Confidence-aware** — Low-confidence categorizations trigger clarification rather than silent misclassification

---

## Architecture

The system follows an **agentic architecture** where the AI agent is the decision-maker and the application provides tools as capabilities.

```
┌─────────────────────────────────────────────────────────┐
│                   Interaction Layer                     │
│                  (iMessage via imessage-kit)            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    AI Agent (Claude)                    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              System Prompt                      │   │
│   │  - Role & personality                           │   │
│   │  - Vault structure knowledge                    │   │
│   │  - Tag taxonomy                                 │   │
│   │  - Decision guidelines                          │   │
│   │  - When to clarify vs store                     │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │                   Tools                         │   │
│   │                                                 │   │
│   │  vault_read      - Read notes from vault        │   │
│   │  vault_write     - Create/update notes          │   │
│   │  vault_list      - List files in folders        │   │
│   │  log_interaction - Write to interaction log     │   │
│   │  send_message    - Reply to user via iMessage   │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Storage Layer                        │
│                   (Obsidian Vault)                      │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **No hardcoded categorization logic** — The agent decides categories based on system prompt guidelines
2. **No hardcoded confidence thresholds** — The agent judges when it needs clarification
3. **No hardcoded tag rules** — The agent follows tag taxonomy from system prompt
4. **Tools are capabilities, not decisions** — Tools execute actions; the agent decides when/how to use them
5. **Conversation state in agent context** — Multi-turn clarification handled naturally by agent context

---

## Obsidian Vault Structure

```
vault/
├── _system/
│   └── logs/
│       └── YYYY-MM-DD.md
│
├── Tasks/
├── Ideas/
├── Reference/
├── Projects/
├── Inbox/
└── Archive/
```

### Folder Descriptions

| Folder | Purpose |
|--------|---------|
| `_system/` | System files, not for manual editing. Contains interaction logs. |
| `Tasks/` | Actionable items—things to do or follow up on. |
| `Ideas/` | Thoughts, concepts, things to explore or develop. |
| `Reference/` | Information to retrieve later—links, articles, facts. |
| `Projects/` | Longer-running initiatives that accumulate multiple notes. |
| `Inbox/` | Safety net for items that remain uncertain after clarification. |
| `Archive/` | Completed or inactive items. Preserves tags for searchability. |

---

## Tag Taxonomy

All tags use hierarchical format for consistency and filtering.

### Entity Tags

```
#person/{name}          — People (e.g., #person/sarah)
#project/{name}         — Projects (e.g., #project/security-audit)
#topic/{name}           — Subject areas (e.g., #topic/security)
#company/{name}         — Organizations (e.g., #company/clutch)
```

### Priority Tags

```
#priority/urgent        — Needs attention now
#priority/high          — Important, do soon
#priority/normal        — Default, no special urgency
#priority/low           — Eventually, no pressure
#priority/someday       — Nice to do, no commitment
```

### Status Tags

```
#status/waiting         — Blocked on someone or something
#status/active          — Currently in progress
#status/scheduled       — Has a specific date/time
#status/done            — Completed (triggers move to Archive/)
```

---

## File Naming Convention

**Format:** `YYYY-MM-DD_title-slug.md`

**Examples:**
- `2026-01-10_follow-up-sarah-security-audit.md`
- `2026-01-10_zero-trust-architecture-article.md`
- `2026-01-10_idea-for-automation-workflow.md`

**Rules:**
- Date prefix enables chronological sorting
- Title slug is lowercase, hyphen-separated
- Keep slugs concise but descriptive

---

## Note Format

All notes include YAML frontmatter with standard metadata:

```markdown
---
created: 2026-01-10T14:32:00Z
tags:
  - person/sarah
  - project/security-audit
  - topic/security
  - priority/high
  - status/waiting
confidence: 92
---

# Follow up with Sarah about security audit

Waiting for Sarah to send the updated compliance checklist.
```

### Required Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `created` | ISO 8601 datetime | When the item was captured |
| `tags` | array | Hierarchical tags (without # prefix in YAML) |
| `confidence` | integer (0-100) | Categorization confidence score |

---

## Agent Tools

The AI agent has access to the following tools. Each tool is a capability that the agent can invoke; the agent decides when and how to use them.

### vault_write

Creates or updates a note in the Obsidian vault.

```typescript
interface VaultWriteParams {
  folder: 'Tasks' | 'Ideas' | 'Reference' | 'Projects' | 'Inbox' | 'Archive';
  title: string;           // Note title (used for filename slug)
  content: string;         // Markdown content (without frontmatter)
  tags: string[];          // Tags without # prefix
  confidence: number;      // 0-100 categorization confidence
}

interface VaultWriteResult {
  success: boolean;
  filepath: string;        // Full path to created file
  error?: string;
}
```

### vault_read

Reads an existing note from the vault.

```typescript
interface VaultReadParams {
  filepath: string;        // Path relative to vault root
}

interface VaultReadResult {
  success: boolean;
  content?: string;        // Full file content including frontmatter
  error?: string;
}
```

### vault_list

Lists files in a vault folder, optionally filtered by tags.

```typescript
interface VaultListParams {
  folder?: string;         // Folder to list (all if omitted)
  tags?: string[];         // Filter by tags
  limit?: number;          // Max results (default 20)
}

interface VaultListResult {
  success: boolean;
  files: Array<{
    filepath: string;
    title: string;
    tags: string[];
    created: string;
  }>;
}
```

### log_interaction

Appends an entry to the daily interaction log.

```typescript
interface LogInteractionParams {
  input: string;           // User's original message
  category?: string;       // Assigned category
  confidence?: number;     // Confidence score
  reasoning?: string;      // Why this categorization
  tags?: string[];         // Assigned tags
  stored_path?: string;    // Where the note was stored
  clarification?: string;  // Clarification question asked
  user_response?: string;  // User's clarification response
}

interface LogInteractionResult {
  success: boolean;
  log_path: string;        // Path to log file
}
```

### send_message

Sends a message back to the user via iMessage.

```typescript
interface SendMessageParams {
  message: string;         // Message to send
}

interface SendMessageResult {
  success: boolean;
  error?: string;
}
```

---

## System Prompt

The agent's behavior is defined by a system prompt that provides context, guidelines, and decision frameworks. The system prompt contains:

### Role Definition
- Personal knowledge assistant that helps capture and organize information
- Concise, helpful responses
- Proactive clarification when uncertain

### Vault Structure Knowledge
- Folder purposes (Tasks, Ideas, Reference, Projects, Inbox, Archive)
- File naming conventions
- Frontmatter format

### Tag Taxonomy
- Entity tags: `#person/{name}`, `#project/{name}`, `#topic/{name}`, `#company/{name}`
- Priority tags: `#priority/urgent|high|normal|low|someday`
- Status tags: `#status/waiting|active|scheduled|done`

### Decision Guidelines

The system prompt instructs the agent to:

1. **Analyze intent** — Determine what the user wants to capture
2. **Assess confidence** — Evaluate how certain the categorization is
3. **Decide action** — Either store directly or ask for clarification
4. **Use appropriate tools** — Call tools to execute the decision
5. **Always log** — Record every interaction for auditability

### Clarification Framework

Rather than hardcoded thresholds, the system prompt guides the agent on when clarification is needed:

- **Clear intent** → Store directly, confirm to user
- **Ambiguous category** → Ask: "Is this a task or a reference?"
- **Missing context** → Ask: "Is this related to [project] or something new?"
- **Multiple interpretations** → Present options: "I could store this as A or B—which fits better?"

---

## Agent Behavior Examples

### Example 1: High Confidence Capture

**User:** "remind me to follow up with Sarah about the security audit"

**Agent reasoning:**
- Clear action verb ("remind me to follow up")
- Named person (Sarah)
- Specific topic (security audit)
- High confidence this is a Task

**Agent actions:**
1. Call `vault_write` with folder: "Tasks", tags: ["person/sarah", "project/security-audit", "priority/high", "status/waiting"]
2. Call `log_interaction` with full details
3. Call `send_message` with confirmation: "Got it! Saved as a task to follow up with Sarah about the security audit."

### Example 2: Low Confidence - Clarification Needed

**User:** "interesting article about zero-trust architecture"

**Agent reasoning:**
- Topic is clear (zero-trust architecture)
- Unclear if this is: a link to save, a concept to research, or a thought to expand on
- Should ask for clarification

**Agent actions:**
1. Call `log_interaction` with clarification note
2. Call `send_message`: "Is this a link you want me to save, a concept to research later, or a thought you want to capture?"

**User response:** "link to save"

**Agent actions:**
1. Call `vault_write` with folder: "Reference", tags: ["topic/security", "topic/zero-trust"]
2. Call `log_interaction` with clarification resolution
3. Call `send_message`: "Saved to Reference. Do you have the URL to add?"

### Example 3: Context-Aware Decision

**User:** "call mom"

**Agent reasoning:**
- Very brief input
- Could be a task or just a note
- Context needed

**Agent actions:**
1. Call `send_message`: "Should I save this as a task to complete, or just capture it as a note?"

---

## Interaction Log

A daily log file captures every interaction for auditability.

**Location:** `_system/logs/YYYY-MM-DD.md`

### Log Format

```markdown
# Interaction Log: 2026-01-10

---

## 14:32:00

**Input:** "remind me to follow up with Sarah about the security audit"

**Categorization:**
- Category: Tasks
- Confidence: 92%
- Reasoning: Clear action verb, named person, specific topic

**Tags assigned:**
- person/sarah
- project/security-audit
- topic/security
- priority/high
- status/waiting

**Stored:** `Tasks/2026-01-10_follow-up-sarah-security-audit.md`

---

## 14:45:12

**Input:** "interesting article about zero-trust architecture"

**Categorization:**
- Category: Reference
- Confidence: 58%
- Reasoning: Topic clear, but unclear if this is a link, a note-to-self, or a thought to expand

**Clarification requested:** "Is this a link you want me to save, a concept to research later, or a thought you want to capture?"

**User response:** "link to save"

**Final categorization:**
- Category: Reference
- Confidence: 95%

**Tags assigned:**
- topic/security
- priority/normal
- status/active

**Stored:** `Reference/2026-01-10_zero-trust-architecture-article.md`

---
```

---

## Item Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Capture │ ──▶ │  Store  │ ──▶ │  Work   │ ──▶ │ Archive │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                    │
                    ▼
               ┌─────────┐
               │  Inbox  │ (if uncertain)
               └─────────┘
```

1. **Capture** — Input received via iMessage
2. **Store** — Categorized and saved to appropriate folder (or Inbox if uncertain)
3. **Work** — Item is active, may change status tags over time
4. **Archive** — When marked `#status/done`, item moves to `Archive/` folder

Archived items retain all tags, enabling full searchability of historical items.

---

## MVP Scope

### In Scope

- iMessage input via dedicated number (imessage-kit library)
- Claude-powered categorization with confidence scoring
- Clarification flow for low-confidence items
- Obsidian vault storage with frontmatter metadata
- Hierarchical tagging system
- Daily interaction logs
- Archive lifecycle for completed items

### Out of Scope (Future)

- Slack adapter
- Apple Calendar integration
- Apple Contacts integration
- Reminder/surfacing engine
- Scheduled notifications
- Email monitoring — Automatically extract follow-ups and knowledge from incoming emails
- Meeting transcript integration — Download and parse transcripts, extract action items and knowledge
- Project lifecycle archiving — Archive all project notes as a single operation when project completes
- Duplicate detection — Check for similar existing items before creating new ones

---

## Design Decisions

### Inbox Triage

Inbox triage is part of daily activities. Items that land in Inbox should be reviewed and properly categorized each day.

### Tag Evolution

Claude should suggest new tags when encountering novel topics that don't fit existing tags. This allows the taxonomy to grow organically based on actual usage.

---

## Open Questions

*None at this time.*

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-01-10 | Initial draft |
| 0.2 | 2026-01-11 | Redesigned as AI agent architecture with tools |
