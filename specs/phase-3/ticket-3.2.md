# Ticket 3.2: Tool Schema Definitions

## Description
Define the tool schemas in the Anthropic API format. These schemas describe each tool's name, description, and parameters so Claude can understand when and how to use them. The schemas are passed to the Claude API on each request.

## Acceptance Criteria
- [ ] Tool definitions module exists at `src/agent/tools.ts`
- [ ] All five tools defined with JSON Schema parameters
- [ ] Descriptions are clear and help Claude understand when to use each tool
- [ ] Parameter schemas match the tool implementations from Phase 2
- [ ] Exports array of tools for use in API calls
- [ ] Unit tests verify schema structure

## Technical Notes

### Tool Schema Format
Each tool follows the Anthropic tool format:
```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}
```

### src/agent/tools.ts
```typescript
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const TOOLS: Tool[] = [
  {
    name: 'vault_write',
    description: `Create a new note in the Obsidian vault. Use this to store captured thoughts, tasks, ideas, or references.

Choose the appropriate folder:
- Tasks: Actionable items, reminders, follow-ups
- Ideas: Thoughts to explore, creative sparks, concepts
- Reference: Links, articles, facts to save
- Projects: Items related to multi-step initiatives
- Inbox: Only if genuinely uncertain about categorization
- Archive: Completed or inactive items

Always assign relevant tags and a confidence score reflecting how certain you are about the categorization.`,
    input_schema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          enum: ['Tasks', 'Ideas', 'Reference', 'Projects', 'Inbox', 'Archive'],
          description: 'The folder to store the note in',
        },
        title: {
          type: 'string',
          description: 'A concise, descriptive title for the note',
        },
        content: {
          type: 'string',
          description: 'The markdown content of the note (without frontmatter)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags without # prefix. Use hierarchical format: person/sarah, project/security-audit, topic/security, priority/high, status/waiting',
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Confidence score (0-100) for the categorization',
        },
      },
      required: ['folder', 'title', 'content', 'tags', 'confidence'],
    },
  },
  {
    name: 'vault_read',
    description: 'Read an existing note from the vault. Use this to check related notes, verify stored content, or get context about previous captures.',
    input_schema: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path relative to vault root, e.g., "Tasks/2026-01-10_follow-up.md"',
        },
      },
      required: ['filepath'],
    },
  },
  {
    name: 'vault_list',
    description: 'List notes in the vault. Use this to find related notes, check for potential duplicates, or browse existing content before creating new notes.',
    input_schema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'Folder to list (omit for all content folders)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (all must match)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'log_interaction',
    description: `Record this interaction in the daily log. ALWAYS call this tool to maintain an audit trail. Include:
- The user's original input
- Your categorization decision and reasoning
- Tags assigned
- Where the note was stored
- Any clarification questions asked`,
    input_schema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: "User's original message",
        },
        category: {
          type: 'string',
          description: 'Assigned category (Tasks, Ideas, Reference, Projects, Inbox)',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-100)',
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of categorization decision',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags assigned to the note',
        },
        stored_path: {
          type: 'string',
          description: 'Where the note was stored',
        },
        clarification: {
          type: 'string',
          description: 'Clarification question asked (if any)',
        },
        user_response: {
          type: 'string',
          description: "User's response to clarification (if any)",
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'send_message',
    description: `Send a message to the user via iMessage. Use this to:
- Confirm successful storage: "Got it! Saved as a task to follow up with Sarah."
- Ask clarifying questions: "Is this a link to save or a concept to research?"
- Provide feedback: "I've added this to your Reference folder with tags #topic/security."

Keep messages concise and helpful.`,
    input_schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send to the user',
        },
      },
      required: ['message'],
    },
  },
];

// Export individual tool names for type safety
export type ToolName = 'vault_write' | 'vault_read' | 'vault_list' | 'log_interaction' | 'send_message';
```

### Tool Description Guidelines
- Describe WHEN to use the tool, not just WHAT it does
- Include examples of appropriate usage
- Mention constraints and expectations
- Guide Claude toward good decisions

### Unit Tests: src/agent/tools.test.ts
Test cases:
- All tools have name, description, input_schema
- Required fields are specified correctly
- Property types match expected formats
- Enum values are correct for vault_write folder

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, tools tests pass
3. File `src/agent/tools.ts` exists
4. Tests exist in `src/agent/tools.test.ts`
5. TOOLS array contains exactly 5 tools
