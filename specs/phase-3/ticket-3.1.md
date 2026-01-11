# Ticket 3.1: Integrate Claude Agent SDK

## Description
Add the Claude Agent SDK (or Anthropic SDK) as a dependency and create a client module for interacting with Claude. Configure authentication and model selection via environment variables.

## Acceptance Criteria
- [ ] Anthropic SDK installed as a dependency
- [ ] Claude client module exists at `src/ai/client.ts`
- [ ] API key read from `ANTHROPIC_API_KEY` environment variable
- [ ] Model configurable via `CLAUDE_MODEL` environment variable
- [ ] Default model is `claude-sonnet-4-20250514`
- [ ] Client exports a function to send prompts and receive responses
- [ ] Application fails fast if API key is missing
- [ ] `.env.example` updated with new variables

## Technical Notes

### Dependencies
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.x"
  }
}
```

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | Claude model to use |

### src/config.ts Update
Add to config:
```typescript
anthropicApiKey: string;
claudeModel: string;
```

Validate `ANTHROPIC_API_KEY` is present.

### src/ai/client.ts
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import logger from '../logger.js';

const client = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  maxTokens?: number;
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const { systemPrompt, maxTokens = 1024 } = options;
  
  logger.debug({ messageCount: messages.length, model: config.claudeModel }, 'Sending request to Claude');
  
  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });
  
  // Extract text from response
  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }
  
  logger.debug({ responseLength: textContent.text.length }, 'Received response from Claude');
  
  return textContent.text;
}
```

### .env.example Update
```bash
# Required: Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Claude model (default: claude-sonnet-4-20250514)
CLAUDE_MODEL=claude-sonnet-4-20250514
```

### Unit Tests: src/ai/client.test.ts
Test cases:
- Client module exports `chat` function
- Config validation catches missing API key

Note: Actual API calls should be mocked in tests.

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. Run `npm start` without `ANTHROPIC_API_KEY` — exits with error containing "ANTHROPIC_API_KEY"
4. File `src/ai/client.ts` exists
5. `.env.example` includes `ANTHROPIC_API_KEY` and `CLAUDE_MODEL`
