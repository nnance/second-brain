import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { FileSessionStore } from "./sessions/file-store.js";

describe("Lifecycle", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "lifecycle-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("session persistence across restart", () => {
    it("session survives simulated restart", () => {
      // Create store, add session
      const store1 = new FileSessionStore(tempDir);
      store1.createSession("user-123");
      store1.updateSession("user-123", {
        sdkSessionId: "sdk-session-456",
        pendingInput: "test message",
      });

      // Simulate shutdown - flush and release store
      store1.flush();

      // Create new store (simulates restart)
      const store2 = new FileSessionStore(tempDir);

      // Verify session restored
      const session = store2.getSession("user-123");
      assert.ok(session);
      assert.strictEqual(session.senderId, "user-123");
      assert.strictEqual(session.sdkSessionId, "sdk-session-456");
      assert.strictEqual(session.pendingInput, "test message");
    });

    it("multiple sessions survive restart", () => {
      const store1 = new FileSessionStore(tempDir);
      store1.createSession("user-1");
      store1.createSession("user-2");
      store1.createSession("user-3");
      store1.updateSession("user-1", { pendingInput: "msg-1" });
      store1.updateSession("user-2", { pendingInput: "msg-2" });
      store1.updateSession("user-3", { pendingInput: "msg-3" });
      store1.flush();

      const store2 = new FileSessionStore(tempDir);
      assert.strictEqual(store2.getAllSessions().length, 3);
      assert.strictEqual(store2.getSession("user-1")?.pendingInput, "msg-1");
      assert.strictEqual(store2.getSession("user-2")?.pendingInput, "msg-2");
      assert.strictEqual(store2.getSession("user-3")?.pendingInput, "msg-3");
    });

    it("deleted sessions do not survive restart", () => {
      const store1 = new FileSessionStore(tempDir);
      store1.createSession("user-123");
      store1.deleteSession("user-123");
      store1.flush();

      const store2 = new FileSessionStore(tempDir);
      assert.strictEqual(store2.getSession("user-123"), undefined);
    });
  });

  describe("expired session handling", () => {
    it("expired sessions are not restored after restart", () => {
      const store1 = new FileSessionStore(tempDir);
      store1.createSession("user-123");

      // Manually modify the session to appear expired
      // We'll do this by writing directly to the file with an old timestamp
      const session = store1.getSession("user-123");
      assert.ok(session);

      // Override the lastActivity to be very old (more than 1 hour ago)
      const expiredTime = new Date(Date.now() - 4_000_000); // ~1.1 hours ago
      session.lastActivity = expiredTime;

      // Force save the expired session
      store1.flush();

      // Create new store - should not restore expired session
      const store2 = new FileSessionStore(tempDir);
      assert.strictEqual(store2.getSession("user-123"), undefined);
    });

    it("only expired sessions are filtered, recent ones preserved", () => {
      const store1 = new FileSessionStore(tempDir);

      // Create a recent session
      store1.createSession("recent-user");
      store1.updateSession("recent-user", { pendingInput: "recent" });

      // Create and expire another session
      store1.createSession("expired-user");
      const expiredSession = store1.getSession("expired-user");
      assert.ok(expiredSession);
      expiredSession.lastActivity = new Date(Date.now() - 4_000_000);

      store1.flush();

      const store2 = new FileSessionStore(tempDir);
      assert.ok(store2.getSession("recent-user"));
      assert.strictEqual(store2.getSession("expired-user"), undefined);
    });
  });

  describe("flush behavior", () => {
    it("flush ensures all changes are persisted", () => {
      const store1 = new FileSessionStore(tempDir);
      store1.createSession("user-123");
      store1.updateSession("user-123", { sdkSessionId: "final-state" });
      store1.flush();

      const store2 = new FileSessionStore(tempDir);
      assert.strictEqual(
        store2.getSession("user-123")?.sdkSessionId,
        "final-state",
      );
    });

    it("flush is safe to call multiple times", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");

      // Multiple flushes should not cause issues
      store.flush();
      store.flush();
      store.flush();

      const session = store.getSession("user-123");
      assert.ok(session);
    });

    it("flush on empty store does not error", () => {
      const store = new FileSessionStore(tempDir);

      // Should not throw
      store.flush();

      assert.deepStrictEqual(store.getAllSessions(), []);
    });
  });
});
