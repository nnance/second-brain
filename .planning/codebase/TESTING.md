# Testing Patterns

**Analysis Date:** 2026-01-13

## Test Framework

**Runner:**
- Node.js native test runner (built-in `node:test` module)
- No external test framework (Jest, Vitest, etc.)

**Assertion Library:**
- Node.js built-in `assert` module
- Matchers: `assert.equal`, `assert.strictEqual`, `assert.ok`, `assert.deepStrictEqual`

**Run Commands:**
```bash
npm test                              # Run all tests
# (no watch mode - native runner limitation)
# (no single file option documented)
# (no coverage built-in)
```

**Test Script:**
```json
"test": "VAULT_PATH=/tmp/test-vault ANTHROPIC_API_KEY=test-key node --import tsx --test 'src/**/*.test.ts'"
```

## Test File Organization

**Location:**
- Co-located with source files
- `src/tools/vault-write.ts` → `src/tools/vault-write.test.ts`

**Naming:**
- `*.test.ts` suffix for all test files
- No distinction between unit/integration in filename

**Structure:**
```
src/
├── tools/
│   ├── vault-write.ts
│   ├── vault-write.test.ts
│   ├── vault-read.ts
│   ├── vault-read.test.ts
│   └── ...
├── agent/
│   ├── runner.ts
│   ├── runner.test.ts
│   └── ...
└── sessions/
    ├── store.ts
    ├── store.test.ts
    └── ...
```

## Test Structure

**Suite Organization:**
```typescript
import assert from "node:assert";
import { describe, it, before, after, beforeEach } from "node:test";

describe("ModuleName", () => {
  before(async () => {
    // Setup (create test directories, etc.)
  });

  after(async () => {
    // Cleanup (remove test files, etc.)
  });

  beforeEach(() => {
    // Reset state (clear sessions, etc.)
  });

  describe("functionName", () => {
    it("should handle success case", async () => {
      // arrange
      const input = createTestInput();

      // act
      const result = await functionName(input);

      // assert
      assert.strictEqual(result.success, true);
    });

    it("should handle error case", () => {
      assert.throws(() => functionName(null), /expected error/);
    });
  });
});
```

**Patterns:**
- `before()` for test setup (create directories, initialize state)
- `after()` for cleanup (remove test files)
- `beforeEach()` for per-test reset (clear sessions)
- Descriptive test names starting with "should"

## Mocking

**Framework:**
- Node.js native `mock` from `node:test`
- Limited use; most tests use real file system with temp directories

**Patterns:**
```typescript
import { mock } from "node:test";

// Mock function
const mockFn = mock.fn(() => "mocked result");

// Verify calls
assert.strictEqual(mockFn.mock.calls.length, 1);
```

**What to Mock:**
- External API calls (Anthropic API not called in tests)
- iMessage SDK (returns mock unavailable in tests)

**What NOT to Mock:**
- File system operations (use /tmp/test-vault)
- Internal business logic
- Session store (use real in-memory store with clearAllSessions())

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test data for simple cases
const params = {
  folder: "Tasks",
  title: "Test Note",
  body: "Test content",
  tags: ["test"],
  confidence: 85,
};

// Shared test vault path via environment
const testVaultPath = "/tmp/test-vault";
```

**Location:**
- Inline in test files (no separate fixtures directory)
- Environment variables for paths (`VAULT_PATH=/tmp/test-vault`)

## Coverage

**Requirements:**
- No enforced coverage target
- No coverage tooling configured

**How to Add:**
```bash
# Example with c8 (Node.js coverage tool)
npx c8 npm test
```

## Test Types

**Unit Tests:**
- Test single function in isolation
- Mock external boundaries (SDK, API)
- Examples: `src/logger.test.ts`, `src/config.test.ts`

**Integration Tests:**
- Test module with real file system
- Use temp directories (/tmp/test-vault)
- Examples: `src/tools/vault-write.test.ts`, `src/sessions/store.test.ts`

**E2E Tests:**
- Not implemented
- Manual testing for iMessage integration

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operation", async () => {
  const result = await asyncFunction();
  assert.strictEqual(result.success, true);
});
```

**Error Testing:**
```typescript
it("should return error when invalid input", async () => {
  const result = await vaultRead({ filepath: "../../../etc/passwd" });
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("Invalid path"));
});
```

**File System Testing:**
```typescript
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

const testDir = "/tmp/test-vault";

before(async () => {
  await mkdir(join(testDir, "Tasks"), { recursive: true });
});

after(async () => {
  await rm(testDir, { recursive: true, force: true });
});
```

**Session Testing:**
```typescript
import { clearAllSessions, createSession, getSession } from "./store.js";

beforeEach(() => {
  clearAllSessions();
});

it("creates session with correct properties", () => {
  const session = createSession("+15551234567");
  assert.strictEqual(session.senderId, "+15551234567");
  assert.ok(session.lastActivity instanceof Date);
});
```

**Snapshot Testing:**
- Not used in this codebase
- Prefer explicit assertions for clarity

## Test File Inventory

| File | Purpose | Tests |
|------|---------|-------|
| `src/tools/vault-write.test.ts` | Vault writing | File creation, slug generation, collision handling |
| `src/tools/vault-read.test.ts` | Vault reading | File reading, path validation |
| `src/tools/vault-list.test.ts` | Vault listing | Folder scanning, tag filtering |
| `src/tools/log-interaction.test.ts` | Audit logging | Log file creation, entry formatting |
| `src/tools/send-message.test.ts` | iMessage sending | SDK unavailable handling |
| `src/sessions/store.test.ts` | Session state | CRUD operations, timestamp updates |
| `src/sessions/timeout.test.ts` | Timeout handling | Timeout detection, cleanup |
| `src/agent/mcp-server.test.ts` | MCP server | Tool registration, server creation |
| `src/agent/runner.test.ts` | Agent runner | Function existence verification |
| `src/agent/system-prompt.test.ts` | System prompt | Module export verification |
| `src/agent/client.test.ts` | SDK client | Export verification |
| `src/messages/listener.test.ts` | iMessage listener | Listener setup |
| `src/logger.test.ts` | Logger | Logger methods exist |
| `src/vault/writer.test.ts` | Legacy writer | Note creation |
| `src/vault/interaction-log.test.ts` | Legacy logging | Log formatting |

---

*Testing analysis: 2026-01-13*
*Update when test patterns change*
