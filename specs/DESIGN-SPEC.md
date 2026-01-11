# Personal Knowledge Capture System

## Design Document v0.1

**Created:** 2026-01-10  
**Status:** Draft

---

## Overview

A personal system for capturing thoughts, ideas, tasks, and reference material via natural language input. The system categorizes and stores items in an Obsidian vault, with Claude providing intelligent categorization and a confidence-based workflow to ensure accuracy.

### Design Principles

- **Minimal dependencies** — Favor simple, zero-dependency libraries where possible
- **Single source of truth** — Obsidian vault only; no syncing to external systems
- **Tags over folders** — Flat folder structure with hierarchical tags for flexible organization
- **Auditable** — Complete interaction log for every capture event
- **Confidence-aware** — Low-confidence categorizations trigger clarification rather than silent misclassification

---

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
│   ┌─────────────────────────────────────────────────┐   │
│   │  Input → Analysis → Confidence Score            │   │
│   │                                                 │   │
│   │  High confidence    → Store directly            │   │
│   │  Low confidence     → Clarify, then store       │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Storage Layer                        │
│                   (Obsidian Vault)                      │
└─────────────────────────────────────────────────────────┘
```

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

## Confidence-Based Categorization

Claude analyzes each input and assigns a confidence score based on clarity of intent, category match, and available context.

### Confidence Handling

**High confidence (contextually clear):**
- Store directly to appropriate folder
- Log the interaction
- Confirm to user

**Low confidence (ambiguous):**
- Do not store yet
- Ask clarifying question with context: "I'm 65% confident this is a task vs. a reference note—which is it?"
- Once clarified, store with updated confidence
- If still unclear after clarification, store to `Inbox/` for manual triage

### Clarification Style

Rather than a hard numeric threshold, Claude considers *why* it's uncertain and asks targeted questions. Examples:

- "Is this a link to save, a concept to research, or a thought to capture?"
- "Should this be tracked as a task or just stored as a reference?"
- "Is this related to the security-audit project or something new?"

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
