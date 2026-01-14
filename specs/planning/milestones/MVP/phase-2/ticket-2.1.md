# Ticket 2.1: Implement Environment Configuration

## Description
Create a centralized configuration module that reads environment variables and provides typed access throughout the application. Include validation for required variables.

## Acceptance Criteria
- [ ] Configuration module exists at `src/config.ts`
- [ ] `VAULT_PATH` environment variable is read and validated
- [ ] Application fails fast with clear error if required config is missing
- [ ] Optional variables have sensible defaults
- [ ] `.env.example` file documents all environment variables
- [ ] README updated with configuration section

## Technical Notes

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAULT_PATH` | Yes | — | Absolute path to Obsidian vault |
| `LOG_LEVEL` | No | `info` | Pino log level |

### src/config.ts
```typescript
import logger from './logger.js';

interface Config {
  vaultPath: string;
  logLevel: string;
}

function loadConfig(): Config {
  const vaultPath = process.env.VAULT_PATH;
  
  if (!vaultPath) {
    logger.fatal('VAULT_PATH environment variable is required');
    process.exit(1);
  }
  
  return {
    vaultPath,
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

export const config = loadConfig();
```

### .env.example
```bash
# Required: Absolute path to Obsidian vault
VAULT_PATH=/Users/yourname/Documents/SecondBrain

# Optional: Log level (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info
```

### README.md Addition
Add a "Configuration" section documenting all environment variables.

### Usage Note
Import config module early in application startup to fail fast on missing config.

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. Run `npm start` without VAULT_PATH — exits with error containing "VAULT_PATH"
4. File `.env.example` exists
5. File `src/config.ts` exists and exports `config` object
