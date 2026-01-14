# Ticket 1.3: Write Unit Tests for FileSessionStore

## Description

Create comprehensive unit tests for the `FileSessionStore` class covering all CRUD operations and edge cases.

## Acceptance Criteria

- [ ] Tests created in `src/sessions/file-store.test.ts`
- [ ] Tests use temp directory (cleaned up after)
- [ ] All CRUD operations tested (get, set, delete, has, clear)
- [ ] Edge cases tested (missing file, corrupted file, missing directory)
- [ ] Atomic write tested (temp file cleanup)

## Technical Notes

```typescript
// src/sessions/file-store.test.ts
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileSessionStore } from './file-store';

describe('FileSessionStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'session-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('creates data directory if missing', () => {
    const store = new FileSessionStore(join(tempDir, 'nested', 'dir'));
    // assert directory exists
  });

  test('persists session to file', () => {
    const store = new FileSessionStore(tempDir);
    store.set('user-123', { /* session data */ });
    // assert file contains session
  });

  test('loads sessions on instantiation', () => {
    // Pre-create sessions.json
    // Instantiate store
    // Assert sessions loaded
  });

  test('handles corrupted file gracefully', () => {
    writeFileSync(join(tempDir, 'sessions.json'), 'not valid json');
    const store = new FileSessionStore(tempDir);
    // Assert no crash, empty sessions
  });

  test('cleans up temp file on load', () => {
    writeFileSync(join(tempDir, 'sessions.json.tmp'), '{}');
    const store = new FileSessionStore(tempDir);
    // Assert temp file removed
  });
});
```

## Done Conditions

1. `npm run build` completes without errors
2. `npm test` passes with all new tests
3. `npm run lint` passes
4. Test coverage includes happy path and error cases
