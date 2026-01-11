# Ticket 4.4: Agent Query Runner

## Description
Create the agent runner that uses the Claude Agent SDK's `query()` function to process user messages. The runner streams through query results, handling the agent's tool calls automatically through the MCP server. This replaces the need for a manual agent loop—the SDK handles tool dispatch internally.

## Acceptance Criteria
- [ ] Agent runner module exists at `src/agent/runner.ts`
- [ ] Uses SDK's `query()` function with MCP server
- [ ] Streams through query results to handle messages
- [ ] Returns success/failure status with metadata
- [ ] Provides conversation context (recipient) for send_message tool
- [ ] Logs each step for debugging
- [ ] Handles errors gracefully
- [ ] Unit tests with mocked query responses

## Technical Notes

### Agent Runner Flow
```
1. Create MCP server with recipient-specific send_message tool
2. Call query() with system prompt, user message, and MCP server
3. Stream through results:
   - Handle 'result' messages (success/error)
   - Optionally log tool calls for debugging
4. Return final result
```

### src/agent/runner.ts
```typescript
import { query } from './client.js';
import { createVaultMcpServer, TOOL_NAMES } from './mcp-server.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import { MODEL } from './client.js';
import logger from '../logger.js';

export interface AgentContext {
  recipient: string;  // For send_message tool - the user's phone/iMessage ID
}

export interface AgentResult {
  success: boolean;
  error?: string;
}

export async function runAgent(
  userMessage: string,
  context: AgentContext
): Promise<AgentResult> {
  try {
    // Create MCP server with recipient-specific send_message tool
    const mcpServer = createVaultMcpServer(context.recipient);

    logger.info({ recipient: context.recipient }, 'Starting agent run');

    // Run the agent query
    for await (const message of query({
      prompt: userMessage,
      options: {
        model: MODEL,
        systemPrompt: SYSTEM_PROMPT,
        mcpServers: {
          'vault-tools': mcpServer,
        },
        allowedTools: [...TOOL_NAMES],
        maxTurns: 10,
      },
    })) {
      // Log message types for debugging
      logger.debug({ type: message.type }, 'Query message received');

      // Handle result messages
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          logger.info('Agent run completed successfully');
          return { success: true };
        } else if (message.subtype === 'error') {
          const errorMsg = message.error?.message || 'Unknown error';
          logger.error({ error: errorMsg }, 'Agent run failed');
          return { success: false, error: errorMsg };
        }
      }

      // Log tool use for debugging (optional)
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'tool_use') {
            logger.debug({ tool: block.name }, 'Tool called');
          }
        }
      }
    }

    // Should not reach here, but handle gracefully
    logger.warn('Query stream ended without result message');
    return { success: true };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Agent run threw exception');
    return { success: false, error: message };
  }
}
```

### Key Design Decisions

1. **SDK handles tool dispatch** — No need to manually dispatch tools; MCP server handles it
2. **Recipient injection** — MCP server created per-request with recipient baked into send_message tool
3. **Streaming results** — Process query results as a stream for efficiency
4. **Error isolation** — Catch and return errors, don't throw

### Why No Manual Tool Loop?

The Claude Agent SDK's `query()` function handles the entire tool-use loop internally:
- Sends messages to Claude with tools defined
- Automatically dispatches tool calls to the MCP server
- Returns tool results to Claude
- Continues until Claude completes

This eliminates the need for manual tool dispatch code.

### Unit Tests: src/agent/runner.test.ts
Test cases:
- Returns success on successful query completion
- Returns error on query failure
- Creates MCP server with correct recipient
- Handles exceptions gracefully
- Logs appropriate messages

### Mocking Strategy
Mock the `query` function to return predictable results:
```typescript
// Mock a successful run
const mockSuccessResult = {
  type: 'result',
  subtype: 'success',
  result: 'Done',
};

// Mock a failure
const mockErrorResult = {
  type: 'result',
  subtype: 'error',
  error: { message: 'API error' },
};
```

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, runner tests pass
3. File `src/agent/runner.ts` exists
4. Tests exist in `src/agent/runner.test.ts`
5. Runner uses SDK `query()` function (not manual loop)
