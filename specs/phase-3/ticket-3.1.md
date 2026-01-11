# Ticket 3.1: Anthropic SDK Integration

## Description
Add the Anthropic SDK as a dependency and create a client module for interacting with Claude. Configure authentication and model selection via environment variables. This establishes the foundation for the AI agent.

## Acceptance Criteria
- [ ] Anthropic SDK installed as a dependency
- [ ] Claude client module exists at `src/agent/client.ts`
- [ ] API key read from `ANTHROPIC_API_KEY` environment variable
- [ ] Model configurable via `CLAUDE_MODEL` environment variable
- [ ] Default model is `claude-sonnet-4-20250514`
- [ ] Client supports tool-use API format
- [ ] Application fails fast if API key is missing
- [ ] `.env.example` updated with new variables

## Technical Notes

### Dependencies
```bash
npm install @anthropic-ai/sdk
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

### src/agent/client.ts
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import logger from '../logger.js';

// Export the client for use in agent runner
export const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export const MODEL = config.claudeModel;

// Type exports for tool definitions
export type { Tool, ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
export type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages';

logger.info({ model: MODEL }, 'Anthropic client initialized');
```

### .env.example Update
```bash
# Required: Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Claude model (default: claude-sonnet-4-20250514)
CLAUDE_MODEL=claude-sonnet-4-20250514
```

### Unit Tests: src/agent/client.test.ts
Test cases:
- Client module exports `anthropic` and `MODEL`
- Config validation catches missing API key
- Model defaults to expected value

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. Run `npm start` without `ANTHROPIC_API_KEY` — exits with error containing "ANTHROPIC_API_KEY"
4. File `src/agent/client.ts` exists
5. `.env.example` includes `ANTHROPIC_API_KEY` and `CLAUDE_MODEL`
