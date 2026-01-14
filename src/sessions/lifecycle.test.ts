import assert from "node:assert";
import { unlink } from "node:fs/promises";
import { afterEach, beforeEach, describe, it } from "node:test";
import { setStorePath, waitForPendingSave } from "./file-store.js";
import {
  clearAllSessions,
  createSession,
  getAllSessions,
  getSession,
  initSessionStore,
  updateSession,
} from "./store.js";

const TEST_STORE_PATH = "/tmp/lifecycle-test-sessions.json";

describe("lifecycle", () => {
  beforeEach(async () => {
    // Set test store path for this test
    setStorePath(TEST_STORE_PATH);

    // Clear in-memory sessions from previous tests
    clearAllSessions();

    // Cleanup test files
    try {
      await unlink(TEST_STORE_PATH);
    } catch {}
    try {
      await unlink(`${TEST_STORE_PATH}.tmp`);
    } catch {}

    // Wait for any lingering async operations
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // Cleanup test file
    try {
      await unlink(TEST_STORE_PATH);
    } catch {}
    try {
      await unlink(`${TEST_STORE_PATH}.tmp`);
    } catch {}

    // Restore default behavior
    setStorePath(null);
  });

  it("should restore sessions after simulated restart", async () => {
    // Create a session
    const session = createSession("test-sender-lifecycle");
    assert.ok(session);

    // Wait for save to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate process death by clearing in-memory map
    clearAllSessions();

    // Verify session is gone from memory
    assert.strictEqual(getSession("test-sender-lifecycle"), undefined);

    // Simulate process restart by loading from disk
    await initSessionStore();

    // Verify session restored
    const restored = getSession("test-sender-lifecycle");
    assert.ok(restored, "Session should be restored from disk");
    assert.strictEqual(restored.senderId, "test-sender-lifecycle");
  });

  it("should preserve session data through restart cycle", async () => {
    // Create session with specific data
    createSession("data-test");
    updateSession("data-test", {
      sdkSessionId: "sdk-123",
      pendingInput: "test input",
    });

    // Wait for all saves to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate process death by clearing in-memory map
    clearAllSessions();

    // Simulate process restart by loading from disk
    await initSessionStore();

    // Verify all data restored
    const restored = getSession("data-test");
    assert.ok(restored);
    assert.strictEqual(restored.sdkSessionId, "sdk-123");
    assert.strictEqual(restored.pendingInput, "test input");
  });

  it("should handle empty store on first startup", async () => {
    // Ensure no store file exists
    try {
      await unlink(TEST_STORE_PATH);
    } catch {}

    // Initialize should not throw
    await initSessionStore();

    // Should have no sessions
    assert.strictEqual(getAllSessions().length, 0);
  });
});
