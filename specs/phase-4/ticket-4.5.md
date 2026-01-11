# Ticket 4.5: Wire iMessage to Agent

## Description
Connect the iMessage listener from Phase 1 to the agent runner. When a message arrives, pass it to the agent for processing. This completes the basic end-to-end flow: message → agent → vault storage → reply.

## Acceptance Criteria
- [ ] Main entry point wires iMessage listener to agent runner
- [ ] Each message spawns an agent run with the message text
- [ ] Agent context includes sender as recipient
- [ ] Errors in agent don't crash the listener
- [ ] Logging shows end-to-end flow
- [ ] Graceful shutdown works correctly

## Technical Notes

### Updated src/index.ts
```typescript
import logger from './logger.js';
import { config } from './config.js';
import { startListener, stopListener } from './messages/listener.js';
import { runAgent } from './agent/runner.js';

logger.info({
  vaultPath: config.vaultPath,
  model: config.claudeModel,
}, 'second-brain starting...');

startListener({
  onMessage: async (message) => {
    const { text, sender } = message;

    logger.info({
      event: 'message_received',
      sender,
      textLength: text.length,
    }, 'Processing incoming message');

    try {
      const result = await runAgent(text, { recipient: sender });

      if (result.success) {
        logger.info({
          event: 'agent_complete',
          sender,
          toolsCalled: result.toolsCalled,
        }, 'Agent completed successfully');
      } else {
        logger.error({
          event: 'agent_failed',
          sender,
          error: result.error,
          toolsCalled: result.toolsCalled,
        }, 'Agent failed');
      }
    } catch (error) {
      logger.error({
        event: 'agent_error',
        sender,
        error,
      }, 'Unexpected error in agent');
    }
  },
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down...');
  stopListener();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info('Listening for messages...');
```

### Message Flow
```
iMessage received
    │
    ├── Log: message_received
    │
    ▼
runAgent(text, { recipient: sender })
    │
    ├── Agent analyzes message
    ├── Agent calls tools (vault_write, log_interaction, send_message)
    ├── Agent returns result
    │
    ▼
Log: agent_complete or agent_failed
```

### Error Handling
- Wrap agent call in try/catch
- Log errors but don't crash
- Listener continues running after individual failures
- Agent errors are isolated per message

### Important Notes

1. **No conversation state yet** — Each message is processed independently in Phase 4. Phase 5 adds conversation context for multi-turn clarifications.

2. **Synchronous processing** — Messages are processed one at a time. For high volume, consider queuing (future enhancement).

3. **Agent makes all decisions** — The code here just passes the message through. All categorization, tagging, and response logic is in the agent.

### Integration Test
Manual testing procedure:
1. Set environment variables (VAULT_PATH, ANTHROPIC_API_KEY)
2. Initialize vault: `npm run vault:init`
3. Start the app: `npm start`
4. Send a text: "remind me to call mom tomorrow"
5. Verify:
   - File created in `Tasks/` folder
   - Tags include appropriate metadata
   - Interaction logged in `_system/logs/`
   - Reply received via iMessage

### Unit Tests
The wiring code is thin and primarily integration. Consider:
- Verifying the message handler calls runAgent with correct params
- Verifying error handling doesn't propagate exceptions

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0
3. src/index.ts imports and uses runAgent
4. With env vars set and vault initialized:
   - Run `npm start`
   - Send a text to the dedicated iMessage account
   - Verify file appears in vault with correct frontmatter
   - Verify interaction log entry exists
   - Verify reply received (if send_message tool works)
