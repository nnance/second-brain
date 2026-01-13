import assert from "node:assert";
import { promises as fs } from "node:fs";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  createSession,
  deleteSession,
  getAllSessions,
  getOrCreateSession,
  getSession,
  initSessionStore,
  updateSession,
} from "./store.js";

describe("Session Store", () => {
  beforeEach(() => {
    clearAllSessions();
  });

  describe("createSession", () => {
    it("creates session without sdkSessionId", () => {
      const session = createSession("+15551234567");

      assert.strictEqual(session.senderId, "+15551234567");
      assert.strictEqual(session.sdkSessionId, undefined);
      assert.strictEqual(session.pendingInput, undefined);
      assert.ok(session.lastActivity instanceof Date);
    });

    it("overwrites existing session with same senderId", () => {
      createSession("+15551234567");
      updateSession("+15551234567", { sdkSessionId: "session-123" });

      const second = createSession("+15551234567");

      assert.strictEqual(second.sdkSessionId, undefined);
      assert.strictEqual(getSession("+15551234567"), second);
    });
  });

  describe("getSession", () => {
    it("returns undefined for unknown sender", () => {
      const session = getSession("+15559999999");

      assert.strictEqual(session, undefined);
    });

    it("returns existing session", () => {
      createSession("+15551234567");

      const session = getSession("+15551234567");

      assert.ok(session);
      assert.strictEqual(session.senderId, "+15551234567");
    });
  });

  describe("getOrCreateSession", () => {
    it("creates if not exists", () => {
      const session = getOrCreateSession("+15551234567");

      assert.strictEqual(session.senderId, "+15551234567");
      assert.strictEqual(session.sdkSessionId, undefined);
    });

    it("returns existing if exists", () => {
      createSession("+15551234567");
      updateSession("+15551234567", { sdkSessionId: "session-456" });

      const session = getOrCreateSession("+15551234567");

      assert.strictEqual(session.sdkSessionId, "session-456");
    });
  });

  describe("updateSession", () => {
    it("returns undefined for unknown sender", () => {
      const result = updateSession("+15559999999", {
        sdkSessionId: "session-789",
      });

      assert.strictEqual(result, undefined);
    });

    it("updates fields and timestamp", async () => {
      const session = createSession("+15551234567");
      const originalTime = session.lastActivity.getTime();

      // Small delay to ensure timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = updateSession("+15551234567", {
        sdkSessionId: "session-abc",
        pendingInput: "original message",
      });

      assert.ok(updated);
      assert.strictEqual(updated.sdkSessionId, "session-abc");
      assert.strictEqual(updated.pendingInput, "original message");
      assert.ok(updated.lastActivity.getTime() >= originalTime);
    });

    it("preserves fields not being updated", () => {
      createSession("+15551234567");
      updateSession("+15551234567", {
        pendingInput: "original",
      });

      const updated = updateSession("+15551234567", {
        sdkSessionId: "session-def",
      });

      assert.ok(updated);
      assert.strictEqual(updated.pendingInput, "original");
    });
  });

  describe("deleteSession", () => {
    it("removes session", () => {
      createSession("+15551234567");

      const result = deleteSession("+15551234567");

      assert.strictEqual(result, true);
      assert.strictEqual(getSession("+15551234567"), undefined);
    });

    it("returns false for unknown sender", () => {
      const result = deleteSession("+15559999999");

      assert.strictEqual(result, false);
    });
  });

  describe("getAllSessions", () => {
    it("returns empty array when no sessions", () => {
      const sessions = getAllSessions();

      assert.deepStrictEqual(sessions, []);
    });

    it("returns all sessions", () => {
      createSession("+15551111111");
      createSession("+15552222222");
      createSession("+15553333333");

      const sessions = getAllSessions();

      assert.strictEqual(sessions.length, 3);
      const senderIds = sessions.map((s) => s.senderId).sort();
      assert.deepStrictEqual(senderIds, [
        "+15551111111",
        "+15552222222",
        "+15553333333",
      ]);
    });
  });

  describe("session isolation", () => {
    it("maintains separate state for different senders", () => {
      getOrCreateSession("+15551111111");
      getOrCreateSession("+15552222222");

      updateSession("+15551111111", {
        sdkSessionId: "session-1",
        pendingInput: "message 1",
      });
      updateSession("+15552222222", {
        sdkSessionId: "session-2",
        pendingInput: "message 2",
      });

      const retrieved1 = getSession("+15551111111");
      const retrieved2 = getSession("+15552222222");

      assert.ok(retrieved1);
      assert.ok(retrieved2);
      assert.strictEqual(retrieved1.sdkSessionId, "session-1");
      assert.strictEqual(retrieved1.pendingInput, "message 1");
      assert.strictEqual(retrieved2.sdkSessionId, "session-2");
      assert.strictEqual(retrieved2.pendingInput, "message 2");
    });
  });

  describe("persistence", () => {
    const testStorePath = "/tmp/test-store-persistence.json";
    const originalPath = process.env.SESSION_STORE_PATH;

    beforeEach(() => {
      clearAllSessions();
      process.env.SESSION_STORE_PATH = testStorePath;
    });

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.unlink(testStorePath);
      } catch {
        // File may not exist
      }
      try {
        await fs.unlink(`${testStorePath}.tmp`);
      } catch {
        // Temp file may not exist
      }
    });

    after(() => {
      // Restore original environment
      if (originalPath) {
        process.env.SESSION_STORE_PATH = originalPath;
      } else {
        delete process.env.SESSION_STORE_PATH;
      }
    });

    it("should persist session to file when created", async () => {
      const session = createSession("+15551234567");

      // Wait briefly for async save to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify file was created and contains session
      const data = await fs.readFile(testStorePath, "utf-8");
      const parsed = JSON.parse(data);

      assert.ok(Array.isArray(parsed));
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].senderId, "+15551234567");
    });

    it("should survive simulated restart", async () => {
      // Create sessions
      const session1 = createSession("+15551234567");
      updateSession("+15551234567", {
        sdkSessionId: "session-abc",
        pendingInput: "test message",
      });
      createSession("+15559876543");

      // Wait for async saves to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simulate process death by clearing in-memory Map
      clearAllSessions();

      // Verify sessions are gone from memory
      assert.strictEqual(getSession("+15551234567"), undefined);
      assert.strictEqual(getSession("+15559876543"), undefined);

      // Simulate process restart by loading from disk
      await initSessionStore();

      // Verify sessions are restored
      const restored1 = getSession("+15551234567");
      const restored2 = getSession("+15559876543");

      assert.ok(restored1);
      assert.strictEqual(restored1.senderId, "+15551234567");
      assert.strictEqual(restored1.sdkSessionId, "session-abc");
      assert.strictEqual(restored1.pendingInput, "test message");
      assert.ok(restored1.lastActivity instanceof Date);

      assert.ok(restored2);
      assert.strictEqual(restored2.senderId, "+15559876543");
      assert.ok(restored2.lastActivity instanceof Date);
    });

    it("should persist updates to file", async () => {
      const session = createSession("+15551234567");

      // Wait for initial save
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Update session
      updateSession("+15551234567", {
        sdkSessionId: "session-updated",
        pendingInput: "new message",
      });

      // Wait for update to persist
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify file reflects the update
      const data = await fs.readFile(testStorePath, "utf-8");
      const parsed = JSON.parse(data);

      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].senderId, "+15551234567");
      assert.strictEqual(parsed[0].sdkSessionId, "session-updated");
      assert.strictEqual(parsed[0].pendingInput, "new message");
    });

    it("should remove session from file when deleted", async () => {
      // Create two sessions
      createSession("+15551234567");
      createSession("+15559876543");

      // Wait for saves
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify both are in file
      let data = await fs.readFile(testStorePath, "utf-8");
      let parsed = JSON.parse(data);
      assert.strictEqual(parsed.length, 2);

      // Delete one session
      deleteSession("+15551234567");

      // Wait for deletion to persist
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify only one session remains in file
      data = await fs.readFile(testStorePath, "utf-8");
      parsed = JSON.parse(data);
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].senderId, "+15559876543");
    });

    it("should handle multiple rapid updates", async () => {
      createSession("+15551234567");

      // Rapid updates (fire-and-forget saves)
      updateSession("+15551234567", { sdkSessionId: "session-1" });
      updateSession("+15551234567", { pendingInput: "message-1" });
      updateSession("+15551234567", { sdkSessionId: "session-2" });
      updateSession("+15551234567", { pendingInput: "message-2" });

      // Wait for all async saves to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear and reload
      clearAllSessions();
      await initSessionStore();

      // Verify final state persisted
      const restored = getSession("+15551234567");
      assert.ok(restored);
      assert.strictEqual(restored.sdkSessionId, "session-2");
      assert.strictEqual(restored.pendingInput, "message-2");
    });

    it("should initialize empty store when no file exists", async () => {
      // Ensure file doesn't exist
      try {
        await fs.unlink(testStorePath);
      } catch {
        // Already doesn't exist
      }

      await initSessionStore();

      // Should have no sessions
      assert.strictEqual(getAllSessions().length, 0);
    });
  });
});
