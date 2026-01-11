# Ticket 5.4: End-to-End Integration Tests

## Description
Create comprehensive integration tests that verify the entire system works correctly from message input through vault storage and user notification. These tests use mocked external dependencies (iMessage, Anthropic API) to verify the complete flow.

## Acceptance Criteria
- [ ] Integration test suite exists at `src/__tests__/integration/`
- [ ] Tests cover high-confidence direct storage flow
- [ ] Tests cover low-confidence clarification flow
- [ ] Tests cover multi-turn conversation
- [ ] Tests cover session timeout
- [ ] Tests cover error scenarios
- [ ] Tests use mocked Anthropic client
- [ ] Tests use mocked iMessage client
- [ ] Tests use temporary test vault
- [ ] All tests pass in CI

## Technical Notes

### Test Structure
```
src/__tests__/
├── integration/
│   ├── setup.ts              # Test setup and mocks
│   ├── direct-storage.test.ts
│   ├── clarification.test.ts
│   ├── multi-turn.test.ts
│   ├── timeout.test.ts
│   └── error-handling.test.ts
```

### Test Setup
```typescript
// src/__tests__/integration/setup.ts
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mock } from 'node:test';

// Create temporary vault for tests
export async function createTestVault(): Promise<string> {
  const vaultPath = join(tmpdir(), `test-vault-${Date.now()}`);

  await mkdir(join(vaultPath, '_system', 'logs'), { recursive: true });
  await mkdir(join(vaultPath, 'Tasks'), { recursive: true });
  await mkdir(join(vaultPath, 'Ideas'), { recursive: true });
  await mkdir(join(vaultPath, 'Reference'), { recursive: true });
  await mkdir(join(vaultPath, 'Projects'), { recursive: true });
  await mkdir(join(vaultPath, 'Inbox'), { recursive: true });
  await mkdir(join(vaultPath, 'Archive'), { recursive: true });

  return vaultPath;
}

export async function cleanupTestVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

// Mock Anthropic client
export function createMockAnthropicClient() {
  return {
    messages: {
      create: mock.fn(),
    },
  };
}

// Mock iMessage
export function createMockIMessage() {
  return {
    sendMessage: mock.fn(),
    startListener: mock.fn(),
    stopListener: mock.fn(),
  };
}
```

### Direct Storage Test
```typescript
// src/__tests__/integration/direct-storage.test.ts
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createTestVault, cleanupTestVault, createMockAnthropicClient } from './setup.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

describe('Direct Storage Flow', () => {
  let vaultPath: string;
  let mockClient: ReturnType<typeof createMockAnthropicClient>;

  before(async () => {
    vaultPath = await createTestVault();
    process.env.VAULT_PATH = vaultPath;
    mockClient = createMockAnthropicClient();
  });

  after(async () => {
    await cleanupTestVault(vaultPath);
  });

  it('stores high-confidence task to Tasks folder', async () => {
    // Mock Claude responding with tool calls
    mockClient.messages.create
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{
          type: 'tool_use',
          id: 'call_1',
          name: 'vault_write',
          input: {
            folder: 'Tasks',
            title: 'Follow up with Sarah',
            content: 'Follow up with Sarah about the security audit',
            tags: ['person/sarah', 'project/security-audit', 'priority/high'],
            confidence: 95,
          },
        }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{
          type: 'tool_use',
          id: 'call_2',
          name: 'log_interaction',
          input: { input: 'remind me to follow up with Sarah about the security audit' },
        }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{
          type: 'tool_use',
          id: 'call_3',
          name: 'send_message',
          input: { message: 'Got it! Saved as a task.' },
        }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done' }],
      });

    // Run the agent
    const result = await runAgent(
      'remind me to follow up with Sarah about the security audit',
      { recipient: '+15551234567' }
    );

    // Verify
    assert.equal(result.success, true);

    // Check file was created
    const files = await readdir(join(vaultPath, 'Tasks'));
    assert.equal(files.length, 1);
    assert(files[0].includes('follow-up-with-sarah'));

    // Check log was created
    const logs = await readdir(join(vaultPath, '_system', 'logs'));
    assert.equal(logs.length, 1);
  });
});
```

### Clarification Flow Test
```typescript
// src/__tests__/integration/clarification.test.ts
describe('Clarification Flow', () => {
  it('asks clarification for ambiguous input', async () => {
    // Mock Claude asking for clarification (send_message but no vault_write)
    mockClient.messages.create
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{
          type: 'tool_use',
          id: 'call_1',
          name: 'log_interaction',
          input: {
            input: 'zero trust architecture',
            clarification: 'Is this a link to save or a concept to research?',
          },
        }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{
          type: 'tool_use',
          id: 'call_2',
          name: 'send_message',
          input: { message: 'Is this a link to save or a concept to research?' },
        }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Asked clarification' }],
      });

    const result = await runAgent(
      'zero trust architecture',
      { recipient: '+15551234567' }
    );

    assert.equal(result.success, true);
    assert(result.toolsCalled.includes('send_message'));
    assert(!result.toolsCalled.includes('vault_write'));
  });
});
```

### Multi-Turn Test
```typescript
// src/__tests__/integration/multi-turn.test.ts
describe('Multi-Turn Conversation', () => {
  it('completes storage after clarification response', async () => {
    // First turn: ask clarification
    // Second turn: receive response and store

    // ... mock setup for both turns

    // Verify session is created after first turn
    // Verify session is cleared after storage
    // Verify file is in correct folder
  });
});
```

### Timeout Test
```typescript
// src/__tests__/integration/timeout.test.ts
describe('Session Timeout', () => {
  it('stores to Inbox on timeout', async () => {
    // Create session with old lastActivity
    // Trigger timeout check
    // Verify file created in Inbox
    // Verify session deleted
  });
});
```

### Error Handling Test
```typescript
// src/__tests__/integration/error-handling.test.ts
describe('Error Handling', () => {
  it('notifies user on API error', async () => {
    mockClient.messages.create.mockRejectedValue(new Error('API Error'));

    // Verify error notification sent
    // Verify session cleaned up
  });

  it('retries on transient error', async () => {
    mockClient.messages.create
      .mockRejectedValueOnce({ status: 429 })  // Rate limit
      .mockResolvedValueOnce({ /* success */ });

    // Verify retry occurred
    // Verify eventual success
  });
});
```

### Running Integration Tests
```bash
# Run all tests
npm test

# Run only integration tests
npm test -- --test-name-pattern="integration"
```

### CI Configuration
Add to existing test script or create separate integration test step:
```json
{
  "scripts": {
    "test": "node --test",
    "test:integration": "node --test src/__tests__/integration/"
  }
}
```

## Done Conditions (for Claude Code to verify)
1. Run `npm run build` — exits 0
2. Run `npm test` — exits 0, all integration tests pass
3. Integration tests exist in `src/__tests__/integration/`
4. Tests cover: direct storage, clarification, multi-turn, timeout, errors
5. Tests use mocked external dependencies
6. Tests clean up temporary files
