# Ticket 3.4: Agent Runner with Tool Dispatch

## Description
Create the agent runner that implements the agentic loop—sending messages to Claude with tools, handling tool_use responses by dispatching to the appropriate tool handlers, and returning results until Claude completes its response. This is the core of the agent architecture.

## Acceptance Criteria
- [ ] Agent runner module exists at `src/agent/runner.ts`
- [ ] Implements the agentic loop (send → tool_use → dispatch → tool_result → repeat)
- [ ] Dispatches to correct tool handler based on tool name
- [ ] Handles multiple sequential tool calls in one turn
- [ ] Returns final text response from agent
- [ ] Provides conversation context (recipient) to tools that need it
- [ ] Logs each step for debugging
- [ ] Handles errors gracefully (tool failures don't crash the loop)
- [ ] Unit tests with mocked Anthropic client

## Technical Notes

### Agent Loop Flow
```
1. Build messages array (system + conversation history + new user message)
2. Call Claude API with tools
3. If response contains tool_use:
   a. Execute tool with params
   b. Add tool_result to messages
   c. Call Claude API again
   d. Repeat until no more tool_use
4. Return final assistant message
```

### src/agent/runner.ts
```typescript
import { anthropic, MODEL } from './client.js';
import { TOOLS, ToolName } from './tools.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import { vaultWrite } from '../tools/vault-write.js';
import { vaultRead } from '../tools/vault-read.js';
import { vaultList } from '../tools/vault-list.js';
import { logInteraction } from '../tools/log-interaction.js';
import { sendMessage } from '../tools/send-message.js';
import logger from '../logger.js';
import type { MessageParam, ContentBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';

// Tool dispatch map
const toolHandlers: Record<ToolName, (params: unknown) => Promise<unknown>> = {
  vault_write: (params) => vaultWrite(params as Parameters<typeof vaultWrite>[0]),
  vault_read: (params) => vaultRead(params as Parameters<typeof vaultRead>[0]),
  vault_list: (params) => vaultList(params as Parameters<typeof vaultList>[0]),
  log_interaction: (params) => logInteraction(params as Parameters<typeof logInteraction>[0]),
  send_message: (params) => sendMessage(params as Parameters<typeof sendMessage>[0]),
};

export interface AgentContext {
  recipient: string;  // For send_message tool - the user's phone/iMessage ID
}

export interface AgentResult {
  success: boolean;
  toolsCalled: string[];
  error?: string;
}

export async function runAgent(
  userMessage: string,
  context: AgentContext,
  conversationHistory: MessageParam[] = []
): Promise<AgentResult> {
  const toolsCalled: string[] = [];

  try {
    // Build initial messages
    const messages: MessageParam[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    logger.info({ messageCount: messages.length }, 'Starting agent run');

    // Agent loop
    let continueLoop = true;
    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      logger.debug({
        stopReason: response.stop_reason,
        contentBlocks: response.content.length,
      }, 'Received Claude response');

      // Process response content
      const assistantContent: ContentBlock[] = [];
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

      for (const block of response.content) {
        assistantContent.push(block);

        if (block.type === 'tool_use') {
          const toolResult = await dispatchTool(block, context);
          toolsCalled.push(block.name);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(toolResult),
          });
        }
      }

      // Add assistant message to conversation
      messages.push({ role: 'assistant', content: assistantContent });

      // If there were tool calls, add results and continue loop
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      } else {
        // No tool calls, we're done
        continueLoop = false;
      }

      // Check stop reason
      if (response.stop_reason === 'end_turn' && toolResults.length === 0) {
        continueLoop = false;
      }
    }

    logger.info({ toolsCalled }, 'Agent run complete');

    return {
      success: true,
      toolsCalled,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Agent run failed');
    return {
      success: false,
      toolsCalled,
      error: message,
    };
  }
}

async function dispatchTool(
  toolUse: ToolUseBlock,
  context: AgentContext
): Promise<unknown> {
  const { name, input, id } = toolUse;

  logger.debug({ tool: name, input }, 'Dispatching tool');

  const handler = toolHandlers[name as ToolName];
  if (!handler) {
    logger.error({ tool: name }, 'Unknown tool');
    return { success: false, error: `Unknown tool: ${name}` };
  }

  try {
    // Inject recipient for send_message tool
    let params = input;
    if (name === 'send_message') {
      params = { ...(input as object), recipient: context.recipient };
    }

    const result = await handler(params);
    logger.debug({ tool: name, result }, 'Tool completed');
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ tool: name, error }, 'Tool failed');
    return { success: false, error: message };
  }
}
```

### Key Design Decisions

1. **Stateless runner** — Each call is independent; conversation history passed in
2. **Context injection** — Recipient is injected into send_message params
3. **Error isolation** — Tool failures return error objects, don't crash the loop
4. **Full logging** — Every step is logged for debugging

### Unit Tests: src/agent/runner.test.ts
Test cases:
- Dispatches to correct tool handler
- Handles multiple sequential tool calls
- Injects recipient into send_message
- Returns error on unknown tool
- Continues loop on tool_use, stops on end_turn
- Returns list of tools called

### Mocking Strategy
Mock the Anthropic client to return predictable tool_use and text responses:
```typescript
// Mock a simple tool call followed by end_turn
const mockResponse1 = {
  stop_reason: 'tool_use',
  content: [{
    type: 'tool_use',
    id: 'call_1',
    name: 'vault_write',
    input: { folder: 'Tasks', title: 'Test', content: 'Test', tags: [], confidence: 90 },
  }],
};

const mockResponse2 = {
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: 'Done!' }],
};
```

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, runner tests pass
3. File `src/agent/runner.ts` exists
4. Tests exist in `src/agent/runner.test.ts`
5. Tool dispatch works for all 5 tools
