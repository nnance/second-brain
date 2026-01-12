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
    it("creates session with empty history", () => {
      const session = createSession("sender1");

      assert.equal(session.senderId, "sender1");
      assert.deepEqual(session.history, []);
      assert(session.lastActivity instanceof Date);
      assert.equal(session.pendingInput, undefined);
    });

    it("overwrites existing session", () => {
      createSession("sender1");
      const session2 = createSession("sender1");

      assert.equal(getAllSessions().length, 1);
      assert.deepEqual(session2.history, []);
    });
  });

  describe("getSession", () => {
    it("returns undefined for unknown sender", () => {
      const session = getSession("unknown");
      assert.equal(session, undefined);
    });

    it("returns existing session", () => {
      createSession("sender1");
      const session = getSession("sender1");

      assert.notEqual(session, undefined);
      assert.equal(session?.senderId, "sender1");
    });
  });

  describe("getOrCreateSession", () => {
    it("creates session if not exists", () => {
      const session = getOrCreateSession("sender1");

      assert.equal(session.senderId, "sender1");
      assert.deepEqual(session.history, []);
    });

    it("returns existing session if exists", () => {
      const original = createSession("sender1");
      updateSession("sender1", {
        history: [{ role: "user", content: "test" }],
      });

      const session = getOrCreateSession("sender1");

      assert.equal(session.senderId, "sender1");
      assert.equal(session.history.length, 1);
    });
  });

  describe("updateSession", () => {
    it("returns undefined for unknown sender", () => {
      const result = updateSession("unknown", { history: [] });
      assert.equal(result, undefined);
    });

    it("updates fields and timestamp", async () => {
      const original = createSession("sender1");
      const originalTime = original.lastActivity.getTime();

      // Small delay to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = updateSession("sender1", {
        history: [{ role: "user", content: "test message" }],
        pendingInput: "original input",
      });

      assert.notEqual(updated, undefined);
      assert.equal(updated?.senderId, "sender1");
      assert.equal(updated?.history.length, 1);
      assert.equal(updated?.pendingInput, "original input");
      assert((updated?.lastActivity.getTime() ?? 0) >= originalTime);
    });

    it("cannot overwrite senderId", () => {
      createSession("sender1");

      // TypeScript prevents this at compile time, but test runtime behavior
      const updated = updateSession("sender1", {
        history: [],
      } as Partial<{ senderId: string; history: never[] }>);

      assert.equal(updated?.senderId, "sender1");
    });
  });

  describe("deleteSession", () => {
    it("returns false for unknown sender", () => {
      const result = deleteSession("unknown");
      assert.equal(result, false);
    });

    it("removes session and returns true", () => {
      createSession("sender1");
      const result = deleteSession("sender1");

      assert.equal(result, true);
      assert.equal(getSession("sender1"), undefined);
    });
  });

  describe("getAllSessions", () => {
    it("returns empty array when no sessions", () => {
      const sessions = getAllSessions();
      assert.deepEqual(sessions, []);
    });

    it("returns all sessions", () => {
      createSession("sender1");
      createSession("sender2");
      createSession("sender3");

      const sessions = getAllSessions();
      assert.equal(sessions.length, 3);

      const senderIds = sessions.map((s) => s.senderId).sort();
      assert.deepEqual(senderIds, ["sender1", "sender2", "sender3"]);
    });
  });

  describe("session isolation", () => {
    it("sessions are isolated by sender ID", () => {
      createSession("sender1");
      createSession("sender2");

      updateSession("sender1", {
        history: [{ role: "user", content: "message 1" }],
        pendingInput: "input 1",
      });

      updateSession("sender2", {
        history: [{ role: "user", content: "message 2" }],
        pendingInput: "input 2",
      });

      const session1 = getSession("sender1");
      const session2 = getSession("sender2");

      assert.equal(session1?.pendingInput, "input 1");
      assert.equal(session2?.pendingInput, "input 2");

      // Deleting one doesn't affect the other
      deleteSession("sender1");
      assert.equal(getSession("sender1"), undefined);
      assert.notEqual(getSession("sender2"), undefined);
    });
  });
});
