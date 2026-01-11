# Ticket 2.5: Wire iMessage Listener to File Writer

## Description
Connect the iMessage listener from Phase 1 to the file writer and interaction log from this phase. When a message is received, it should be written to `Inbox/` and logged. This completes the basic capture pipeline.

## Acceptance Criteria
- [ ] Message handler calls file writer with message content
- [ ] Message handler calls interaction log writer
- [ ] Files are created in `Inbox/` folder
- [ ] Interaction log is updated on each capture
- [ ] Errors in writing don't crash the listener
- [ ] End-to-end flow works: text → file in vault + log entry

## Technical Notes

### Updated Message Handler Flow
```
iMessage received
    │
    ▼
Create note metadata
    │
    ▼
Write note to Inbox/
    │
    ▼
Write interaction log
    │
    ▼
Log success
```

### src/index.ts Update
```typescript
import logger from './logger.js';
import { config } from './config.js';
import { startListener, stopListener } from './messages/listener.js';
import { writeNote } from './vault/writer.js';
import { writeInteractionLog } from './vault/interaction-log.js';

logger.info({ vaultPath: config.vaultPath }, 'second-brain starting...');

startListener({
  onMessage: async (message) => {
    const timestamp = new Date();

    try {
      // Write note to Inbox
      const result = await writeNote({
        folder: 'Inbox',
        title: message.text.slice(0, 50), // Use first 50 chars as title
        body: message.text,
        metadata: {
          created: timestamp,
          source: 'imessage',
          confidence: null,
          tags: [],
        },
      });

      // Write interaction log
      await writeInteractionLog({
        timestamp,
        input: message.text,
        storedPath: `Inbox/${result.fileName}`,
      });

      logger.info({
        event: 'message_captured',
        sender: message.sender,
        filePath: result.filePath,
      }, 'Message captured successfully');

    } catch (error) {
      logger.error({
        event: 'capture_failed',
        sender: message.sender,
        error,
      }, 'Failed to capture message');
    }
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

### Title Extraction Strategy
For Phase 2, use a simple approach:
- Take first 50 characters of the message
- This becomes both the title and the slug basis

Phase 3 will refactor this to use agent tools for intelligent categorization.

### Error Handling
- Wrap the entire capture flow in try/catch
- Log errors but don't crash
- Listener continues running after individual message failures

### Integration Test Suggestion
Consider adding a manual integration test script:
```typescript
// src/scripts/test-capture.ts
// Simulates a message and verifies file creation
```

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. With `VAULT_PATH` set and vault initialized:
   - Run `npm start`
   - Send a text to the dedicated iMessage account
   - Verify file appears in `${VAULT_PATH}/Inbox/`
   - Verify log entry appears in `${VAULT_PATH}/_system/logs/YYYY-MM-DD.md`
4. Check that frontmatter contains: created, source, confidence, tags
