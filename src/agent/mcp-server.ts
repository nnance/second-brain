import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { calendarList } from "../tools/calendar-list.js";
import { logInteraction } from "../tools/log-interaction.js";
import { sendMessage } from "../tools/send-message.js";
import { vaultListReminders } from "../tools/vault-list-reminders.js";
import { vaultList } from "../tools/vault-list.js";
import { vaultMove } from "../tools/vault-move.js";
import { vaultRead } from "../tools/vault-read.js";
import { vaultSetReminder } from "../tools/vault-set-reminder.js";
import { type VaultFolder, vaultWrite } from "../tools/vault-write.js";

// Define CallToolResult type locally (from MCP SDK)
interface CallToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// Helper to format tool results
function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

// vault_write tool
const vaultWriteTool = tool(
  "vault_write",
  `Create a new note in the Obsidian vault. Use this to store captured thoughts, tasks, ideas, or references.

Choose the appropriate folder:
- Tasks: Actionable items, reminders, follow-ups
- Ideas: Thoughts to explore, creative sparks, concepts
- Reference: Links, articles, facts to save
- Projects: Items related to multi-step initiatives
- Inbox: Only if genuinely uncertain about categorization
- Archive: Completed or inactive items

Always assign relevant tags and a confidence score reflecting how certain you are about the categorization.`,
  {
    folder: z
      .enum(["Tasks", "Ideas", "Reference", "Projects", "Inbox", "Archive"])
      .describe("The folder to store the note in"),
    title: z.string().describe("A concise, descriptive title for the note"),
    content: z
      .string()
      .describe("The markdown content of the note (without frontmatter)"),
    tags: z
      .array(z.string())
      .describe(
        "Tags without # prefix. Use hierarchical format: person/sarah, project/security-audit",
      ),
    confidence: z
      .number()
      .min(0)
      .max(100)
      .describe("Confidence score (0-100) for the categorization"),
  },
  async (args) => {
    const result = await vaultWrite({
      folder: args.folder as VaultFolder,
      title: args.title,
      content: args.content,
      tags: args.tags,
      confidence: args.confidence,
    });
    return textResult(JSON.stringify(result));
  },
);

// vault_read tool
const vaultReadTool = tool(
  "vault_read",
  "Read an existing note from the vault. Use this to check related notes, verify stored content, or get context about previous captures.",
  {
    filepath: z
      .string()
      .describe(
        'Path relative to vault root, e.g., "Tasks/2026-01-10_follow-up.md"',
      ),
  },
  async (args) => {
    const result = await vaultRead({ filepath: args.filepath });
    return textResult(JSON.stringify(result));
  },
);

// vault_list tool
const vaultListTool = tool(
  "vault_list",
  "List notes in the vault. Use this to find related notes, check for potential duplicates, or browse existing content before creating new notes.",
  {
    folder: z
      .string()
      .optional()
      .describe("Folder to list (omit for all content folders)"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Filter by tags (all must match)"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results (default 20)"),
  },
  async (args) => {
    const result = await vaultList({
      folder: args.folder,
      tags: args.tags,
      limit: args.limit,
    });
    return textResult(JSON.stringify(result));
  },
);

// vault_move tool
const vaultMoveTool = tool(
  "vault_move",
  `Move a note from one folder to another in the vault. Use this to:
- Archive completed items: Move notes with #status/done to Archive
- Reorganize notes: Move items between Tasks, Ideas, Reference, Projects

When moving to Archive, the tool automatically adds archived_at timestamp and original_folder metadata.`,
  {
    source: z
      .string()
      .describe(
        'Source filepath relative to vault root, e.g., "Tasks/2026-01-10_follow-up.md"',
      ),
    destination: z
      .enum(["Tasks", "Ideas", "Reference", "Projects", "Inbox", "Archive"])
      .describe("The destination folder to move the note to"),
  },
  async (args) => {
    const result = await vaultMove({
      source: args.source,
      destination: args.destination,
    });
    return textResult(JSON.stringify(result));
  },
);

// vault_set_reminder tool
const vaultSetReminderTool = tool(
  "vault_set_reminder",
  `Set or update a reminder on a note. Reminders trigger iMessage notifications at the specified time.

Use cases:
- Absolute time: "remind me tomorrow at 9am" → provide 'due' as ISO 8601
- Relative to calendar: "remind me 1 hour before meeting" → provide 'calendar_event' and 'offset'

The scheduler will send an iMessage when the reminder is due.`,
  {
    filepath: z
      .string()
      .describe(
        'Path to note relative to vault root, e.g., "Tasks/2026-01-10_follow-up.md"',
      ),
    due: z
      .string()
      .optional()
      .describe("Reminder time as ISO 8601 (e.g., 2026-01-15T09:00:00Z)"),
    calendar_event: z
      .string()
      .optional()
      .describe(
        "Event title to link reminder to (for calendar-relative reminders)",
      ),
    offset: z
      .number()
      .optional()
      .describe(
        "Seconds relative to event time (negative = before event, e.g., -3600 for 1 hour before)",
      ),
    mark_sent: z
      .boolean()
      .optional()
      .describe("Internal: mark reminder as sent (used by scheduler)"),
  },
  async (args) => {
    const result = await vaultSetReminder({
      filepath: args.filepath,
      due: args.due,
      calendar_event: args.calendar_event,
      offset: args.offset,
      mark_sent: args.mark_sent,
    });
    return textResult(JSON.stringify(result));
  },
);

// vault_list_reminders tool
const vaultListRemindersTool = tool(
  "vault_list_reminders",
  `List all pending (unsent) reminders in the vault. Useful for:
- Showing the user their upcoming reminders
- Finding reminders that are due
- Checking reminder status

Excludes Archive folder by default. Returns reminders sorted by due date (soonest first).`,
  {
    due_before: z
      .string()
      .optional()
      .describe("Filter: only reminders due before this time (ISO 8601)"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results (default 50)"),
  },
  async (args) => {
    const result = await vaultListReminders({
      due_before: args.due_before,
      limit: args.limit,
    });
    return textResult(JSON.stringify(result));
  },
);

// calendar_list tool
const calendarListTool = tool(
  "calendar_list",
  `Query calendar events from the configured calendar provider. Use this to:
- Check what's on the user's schedule
- Find specific events by title (for calendar-linked reminders)
- Help the user plan their day

Range options: today, tomorrow, this_week, or custom (requires from/to dates).`,
  {
    range: z
      .enum(["today", "tomorrow", "this_week", "custom"])
      .optional()
      .describe("Time range to query (default: today)"),
    from: z
      .string()
      .optional()
      .describe("Start of custom range (ISO 8601, required if range=custom)"),
    to: z
      .string()
      .optional()
      .describe("End of custom range (ISO 8601, required if range=custom)"),
  },
  async (args) => {
    const result = await calendarList({
      range: args.range,
      from: args.from,
      to: args.to,
    });
    return textResult(JSON.stringify(result));
  },
);

// log_interaction tool
const logInteractionTool = tool(
  "log_interaction",
  `Record this interaction in the daily log. ALWAYS call this tool to maintain an audit trail. Include:
- The user's original input
- Your categorization decision and reasoning
- Tags assigned
- Where the note was stored
- Any clarification questions asked`,
  {
    input: z.string().describe("User's original message"),
    category: z
      .string()
      .optional()
      .describe("Assigned category (Tasks, Ideas, Reference, Projects, Inbox)"),
    confidence: z.number().optional().describe("Confidence score (0-100)"),
    reasoning: z
      .string()
      .optional()
      .describe("Brief explanation of categorization decision"),
    tags: z.array(z.string()).optional().describe("Tags assigned to the note"),
    stored_path: z.string().optional().describe("Where the note was stored"),
    clarification: z
      .string()
      .optional()
      .describe("Clarification question asked (if any)"),
    user_response: z
      .string()
      .optional()
      .describe("User's response to clarification (if any)"),
  },
  async (args) => {
    const result = await logInteraction({
      input: args.input,
      category: args.category,
      confidence: args.confidence,
      reasoning: args.reasoning,
      tags: args.tags,
      stored_path: args.stored_path,
      clarification: args.clarification,
      user_response: args.user_response,
    });
    return textResult(JSON.stringify(result));
  },
);

// send_message tool - requires recipient to be injected at runtime
// This is a factory function that creates the tool with a specific recipient
export function createSendMessageTool(recipient: string) {
  return tool(
    "send_message",
    `Send a message to the user via iMessage. Use this to:
- Confirm successful storage: "Got it! Saved as a task to follow up with Sarah."
- Ask clarifying questions: "Is this a link to save or a concept to research?"
- Provide feedback: "I've added this to your Reference folder with tags #topic/security."

Keep messages concise and helpful.`,
    {
      message: z.string().describe("The message to send to the user"),
    },
    async (args) => {
      const result = await sendMessage({
        chat_guid: recipient,
        text: args.message,
      });
      return textResult(JSON.stringify(result));
    },
  );
}

// Create the base MCP server (without send_message, which needs recipient)
export const baseTools = [
  vaultWriteTool,
  vaultReadTool,
  vaultListTool,
  vaultMoveTool,
  vaultSetReminderTool,
  vaultListRemindersTool,
  calendarListTool,
  logInteractionTool,
];

// Factory to create MCP server with recipient-specific send_message tool
export function createVaultMcpServer(recipient: string) {
  return createSdkMcpServer({
    name: "vault-tools",
    version: "1.0.0",
    tools: [...baseTools, createSendMessageTool(recipient)],
  });
}

// Tool names for allowedTools configuration
export const TOOL_NAMES = [
  "mcp__vault-tools__vault_write",
  "mcp__vault-tools__vault_read",
  "mcp__vault-tools__vault_list",
  "mcp__vault-tools__vault_move",
  "mcp__vault-tools__vault_set_reminder",
  "mcp__vault-tools__vault_list_reminders",
  "mcp__vault-tools__calendar_list",
  "mcp__vault-tools__log_interaction",
  "mcp__vault-tools__send_message",
] as const;
