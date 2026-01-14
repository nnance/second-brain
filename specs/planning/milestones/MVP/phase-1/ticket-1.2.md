# Ticket 1.2: Configure Pino Structured Logging

## Description
Add Pino as the structured logging library. Create a logger module that can be imported throughout the application. Configure it with sensible defaults including timestamps and log levels.

## Acceptance Criteria
- [ ] Pino installed as a dependency
- [ ] Logger module exists at `src/logger.ts`
- [ ] Logger exports a configured Pino instance
- [ ] Log level configurable via `LOG_LEVEL` environment variable
- [ ] Pretty printing enabled in development (via `pino-pretty` in dev)
- [ ] Entry point uses logger instead of `console.log`

## Technical Notes

### Dependencies
```json
{
  "dependencies": {
    "pino": "^9.x"
  },
  "devDependencies": {
    "pino-pretty": "^11.x"
  }
}
```

### src/logger.ts
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
```

### Development Usage
Run with pretty printing:
```bash
npm run dev | npx pino-pretty
```

Or add a `dev:pretty` script:
```json
{
  "scripts": {
    "dev:pretty": "tsx src/index.ts | pino-pretty"
  }
}
```

### src/index.ts Update
```typescript
import logger from './logger.js';

logger.info('second-brain starting...');
```

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm run dev` — outputs JSON log line containing "second-brain starting"
3. Run `LOG_LEVEL=debug npm run dev` — exits without error
4. Verify `src/logger.ts` exists and exports a Pino logger
