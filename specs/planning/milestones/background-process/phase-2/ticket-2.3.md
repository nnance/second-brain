# Ticket 2.3: Add Lifecycle Integration Tests

## Description

Create integration tests that verify the complete shutdown/restart cycle preserves session state.

## Acceptance Criteria

- [ ] Test file created: `src/lifecycle.test.ts`
- [ ] Test: Session survives simulated shutdown and restart
- [ ] Test: Expired sessions not restored
- [ ] Test: Shutdown completes within timeout
- [ ] Tests use temp directory for isolation

## Technical Notes

```typescript
// src/lifecycle.test.ts
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileSessionStore } from './sessions/file-store';

describe('Lifecycle', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'lifecycle-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('session survives restart', async () => {
    // Create store, add session
    const store1 = new FileSessionStore(tempDir);
    store1.set('user-123', {
      messages: [{ role: 'user', content: 'test' }],
      lastActivity: Date.now(),
    });

    // Simulate shutdown (store goes out of scope)
    // In real scenario, shutdown handler would call flush()

    // Create new store (simulates restart)
    const store2 = new FileSessionStore(tempDir);

    // Verify session restored
    const session = store2.get('user-123');
    assert.ok(session);
    assert.equal(session.messages[0].content, 'test');
  });

  test('expired sessions cleaned up on restore', async () => {
    const store1 = new FileSessionStore(tempDir);
    store1.set('user-123', {
      messages: [],
      lastActivity: Date.now() - 4_000_000, // Older than 1hr default
    });

    const store2 = new FileSessionStore(tempDir);
    assert.equal(store2.get('user-123'), undefined);
  });
});
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes with lifecycle tests
3. `npm run lint` passes
4. Tests cover happy path and edge cases
