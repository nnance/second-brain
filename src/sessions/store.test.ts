import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  createSession,
  deleteSession,
  getAllSessions,
  getOrCreateSession,
  getSession,
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
});
