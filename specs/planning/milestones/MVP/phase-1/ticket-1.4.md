# Ticket 1.4: Implement iMessage Listener

## Description
Integrate the `imessage-kit` library to listen for incoming iMessages. When a message is received, log it using Pino with relevant metadata (sender, timestamp, message body). Include graceful startup, shutdown, and error handling.

## Acceptance Criteria
- [ ] `imessage-kit` installed as a dependency
- [ ] Message listener module exists at `src/messages/listener.ts`
- [ ] Listener logs each incoming message with: timestamp, sender, message body
- [ ] Application starts listening on `npm start`
- [ ] Graceful shutdown on SIGINT/SIGTERM
- [ ] Errors are caught and logged (not thrown)
- [ ] README documents setup requirements (macOS, Messages.app signed in)

## Technical Notes

### Dependencies
```json
{
  "dependencies": {
    "imessage-kit": "^x.x"
  }
}
```

### Folder Structure
```
src/
├── messages/
│   ├── listener.ts
│   └── listener.test.ts
├── logger.ts
└── index.ts
```

### src/messages/listener.ts
```typescript
import logger from '../logger.js';
// Import from imessage-kit per its documentation

export interface MessageHandler {
  onMessage: (message: IncomingMessage) => void | Promise<void>;
}

export function startListener(handler: MessageHandler): void {
  // Initialize imessage-kit listener
  // On each message, call handler.onMessage
  // Log startup
  logger.info('iMessage listener started');
}

export function stopListener(): void {
  // Cleanup imessage-kit resources
  logger.info('iMessage listener stopped');
}
```

### src/index.ts Update
```typescript
import logger from './logger.js';
import { startListener, stopListener } from './messages/listener.js';

logger.info('second-brain starting...');

startListener({
  onMessage: (message) => {
    logger.info({
      event: 'message_received',
      sender: message.sender,
      body: message.text,
      timestamp: message.timestamp,
    }, 'Received iMessage');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  stopListener();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  stopListener();
  process.exit(0);
});
```

### package.json scripts
```json
{
  "scripts": {
    "start": "tsx src/index.ts"
  }
}
```

### README.md Addition
Document:
- Requires macOS
- Requires Messages.app signed into dedicated iMessage account
- Requires Full Disk Access permission for Terminal/IDE

### Error Handling
- Wrap listener initialization in try/catch
- Log errors with `logger.error()`
- Do not crash on individual message processing errors

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. Run `npm start` — outputs log line "iMessage listener started"
4. Ctrl+C triggers "Shutting down..." log message
5. File `src/messages/listener.ts` exists
6. README.md contains setup documentation
