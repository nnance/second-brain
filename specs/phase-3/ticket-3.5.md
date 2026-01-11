# Ticket 3.5: Implement send_message Tool

## Description
Create the `send_message` tool that enables the AI agent to reply to users via iMessage. This allows the agent to send confirmations, ask clarifying questions, and provide feedback.

## Acceptance Criteria
- [ ] Tool exists at `src/tools/send-message.ts`
- [ ] Accepts message text and recipient parameters
- [ ] Sends message via imessage-kit
- [ ] Returns structured result with success status
- [ ] Handles send failures gracefully
- [ ] Never throws—returns error in result object
- [ ] Unit tests with mocked imessage-kit

## Technical Notes

### Tool Interface
```typescript
// src/tools/send-message.ts

export interface SendMessageParams {
  message: string;              // Message to send
  recipient: string;            // Phone number or iMessage ID
}

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  // Implementation
}
```

### Implementation
```typescript
import { sendMessage as imessageSend } from 'imessage-kit';
import logger from '../logger.js';

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  try {
    const { message, recipient } = params;

    await imessageSend({
      to: recipient,
      text: message,
    });

    logger.info({ recipient }, 'send_message: Message sent');

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, params }, 'send_message: Failed');
    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

### Message Context
The recipient is extracted from the original incoming message. When the agent runner (Phase 4) invokes this tool, it provides the recipient from the conversation context.

### Rate Limiting Consideration
While not required for MVP, consider future rate limiting to prevent spam:
- Track messages sent per recipient
- Implement cooldown periods if needed

### Unit Tests: src/tools/send-message.test.ts
Test cases:
- Sends message successfully (mocked imessage-kit)
- Returns success result
- Returns error result on failure
- Handles network errors gracefully

### Mocking imessage-kit
```typescript
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock the imessage-kit module before importing the tool
const mockSendMessage = mock.fn();
mock.module('imessage-kit', {
  namedExports: {
    sendMessage: mockSendMessage,
  },
});

// Now import the tool (uses mocked module)
const { sendMessage } = await import('./send-message.js');

describe('sendMessage', () => {
  beforeEach(() => {
    mockSendMessage.mock.resetCalls();
  });

  it('sends message successfully', async () => {
    mockSendMessage.mock.mockImplementation(() => Promise.resolve());

    const result = await sendMessage({
      message: 'Got it! Saved as a task.',
      recipient: '+1234567890',
    });

    assert.equal(result.success, true);
    assert.equal(mockSendMessage.mock.callCount(), 1);
  });

  it('returns error on failure', async () => {
    mockSendMessage.mock.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const result = await sendMessage({
      message: 'Test message',
      recipient: '+1234567890',
    });

    assert.equal(result.success, false);
    assert.equal(result.error, 'Network error');
  });
});
```

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, send-message tests pass
3. File `src/tools/send-message.ts` exists
4. Tests exist in `src/tools/send-message.test.ts`
5. Manual test: (optional) send test message via the tool
