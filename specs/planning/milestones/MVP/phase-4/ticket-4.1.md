# Ticket 4.1: Claude Agent SDK Integration

## Description
Add the Claude Agent SDK as a dependency and configure it for agent interactions. The SDK provides the `query()` function for running agent conversations and `createSdkMcpServer()` for hosting custom tools. Configure authentication and model selection via environment variables.

## Acceptance Criteria
- [ ] Claude Agent SDK installed as a dependency
- [ ] Zod installed for tool schema definitions
- [ ] SDK client module exists at `src/agent/client.ts`
- [ ] API key read from `ANTHROPIC_API_KEY` environment variable
- [ ] Model configurable via `CLAUDE_MODEL` environment variable
- [ ] Default model is `claude-sonnet-4-20250514`
- [ ] Application fails fast if API key is missing
- [ ] `.env.example` updated with new variables

## Technical Notes

### Dependencies
```bash
npm install @anthropic-ai/claude-agent-sdk zod
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
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { config } from '../config.js';
import logger from '../logger.js';

// Re-export SDK functions for use in other modules
export { query, tool, createSdkMcpServer };

// Export model configuration
export const MODEL = config.claudeModel;

// Validate API key is present (SDK reads from ANTHROPIC_API_KEY automatically)
if (!config.anthropicApiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

logger.info({ model: MODEL }, 'Claude Agent SDK initialized');
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
- Client module exports `query`, `tool`, `createSdkMcpServer`, and `MODEL`
- Config validation catches missing API key
- Model defaults to expected value

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. Run `npm start` without `ANTHROPIC_API_KEY` — exits with error containing "ANTHROPIC_API_KEY"
4. File `src/agent/client.ts` exists
5. `.env.example` includes `ANTHROPIC_API_KEY` and `CLAUDE_MODEL`
