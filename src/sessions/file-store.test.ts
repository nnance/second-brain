import assert from "node:assert";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { FileSessionStore } from "./file-store.js";

describe("FileSessionStore", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "session-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("creates data directory if missing", () => {
      const nestedDir = join(tempDir, "nested", "dir");
      new FileSessionStore(nestedDir);

      assert.ok(existsSync(nestedDir));
    });

    it("uses provided dataDir", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");

      const filePath = join(tempDir, "sessions.json");
      assert.ok(existsSync(filePath));
    });
  });

  describe("persistence", () => {
    it("persists session to file", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");

      const filePath = join(tempDir, "sessions.json");
      const data = readFileSync(filePath, "utf-8");
      const sessions = JSON.parse(data);

      assert.strictEqual(sessions.length, 1);
      assert.strictEqual(sessions[0].senderId, "user-123");
    });

    it("loads sessions on instantiation", () => {
      // Create initial sessions
      const store1 = new FileSessionStore(tempDir);
      store1.createSession("user-123");
      store1.updateSession("user-123", { sdkSessionId: "sdk-456" });

      // Create new store instance from same directory
      const store2 = new FileSessionStore(tempDir);
      const session = store2.getSession("user-123");

      assert.ok(session);
      assert.strictEqual(session.senderId, "user-123");
      assert.strictEqual(session.sdkSessionId, "sdk-456");
    });

    it("persists session updates", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");
      store.updateSession("user-123", { pendingInput: "test input" });

      // Create new store to verify persistence
      const store2 = new FileSessionStore(tempDir);
      const session = store2.getSession("user-123");

      assert.ok(session);
      assert.strictEqual(session.pendingInput, "test input");
    });

    it("persists session deletion", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");
      store.deleteSession("user-123");

      // Create new store to verify persistence
      const store2 = new FileSessionStore(tempDir);
      const session = store2.getSession("user-123");

      assert.strictEqual(session, undefined);
    });
  });

  describe("error handling", () => {
    it("handles corrupted file gracefully", () => {
      const filePath = join(tempDir, "sessions.json");
      writeFileSync(filePath, "not valid json");

      // Should not throw, starts with empty sessions
      const store = new FileSessionStore(tempDir);
      const sessions = store.getAllSessions();

      assert.deepStrictEqual(sessions, []);
    });

    it("handles empty file gracefully", () => {
      const filePath = join(tempDir, "sessions.json");
      writeFileSync(filePath, "");

      const store = new FileSessionStore(tempDir);
      const sessions = store.getAllSessions();

      assert.deepStrictEqual(sessions, []);
    });

    it("starts fresh when file does not exist", () => {
      const store = new FileSessionStore(tempDir);
      const sessions = store.getAllSessions();

      assert.deepStrictEqual(sessions, []);
    });
  });

  describe("atomic write", () => {
    it("cleans up temp file on load", () => {
      const tempFilePath = join(tempDir, "sessions.json.tmp");
      writeFileSync(tempFilePath, '{"stale": "data"}');

      new FileSessionStore(tempDir);

      assert.ok(!existsSync(tempFilePath));
    });

    it("does not leave temp file after save", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");

      const tempFilePath = join(tempDir, "sessions.json.tmp");
      assert.ok(!existsSync(tempFilePath));
    });
  });

  describe("CRUD operations", () => {
    it("getSession returns undefined for unknown sender", () => {
      const store = new FileSessionStore(tempDir);
      const session = store.getSession("unknown");

      assert.strictEqual(session, undefined);
    });

    it("createSession creates new session", () => {
      const store = new FileSessionStore(tempDir);
      const session = store.createSession("user-123");

      assert.strictEqual(session.senderId, "user-123");
      assert.ok(session.lastActivity instanceof Date);
    });

    it("updateSession updates existing session", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");

      const updated = store.updateSession("user-123", {
        sdkSessionId: "sdk-456",
      });

      assert.ok(updated);
      assert.strictEqual(updated.sdkSessionId, "sdk-456");
    });

    it("updateSession returns undefined for unknown sender", () => {
      const store = new FileSessionStore(tempDir);
      const result = store.updateSession("unknown", {
        sdkSessionId: "sdk-456",
      });

      assert.strictEqual(result, undefined);
    });

    it("deleteSession removes session", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");

      const result = store.deleteSession("user-123");

      assert.strictEqual(result, true);
      assert.strictEqual(store.getSession("user-123"), undefined);
    });

    it("deleteSession returns false for unknown sender", () => {
      const store = new FileSessionStore(tempDir);
      const result = store.deleteSession("unknown");

      assert.strictEqual(result, false);
    });

    it("getOrCreateSession creates if not exists", () => {
      const store = new FileSessionStore(tempDir);
      const session = store.getOrCreateSession("user-123");

      assert.strictEqual(session.senderId, "user-123");
    });

    it("getOrCreateSession returns existing if exists", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-123");
      store.updateSession("user-123", { sdkSessionId: "sdk-456" });

      const session = store.getOrCreateSession("user-123");

      assert.strictEqual(session.sdkSessionId, "sdk-456");
    });

    it("getAllSessions returns all sessions", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-1");
      store.createSession("user-2");
      store.createSession("user-3");

      const sessions = store.getAllSessions();

      assert.strictEqual(sessions.length, 3);
    });

    it("clearAllSessions removes all sessions", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-1");
      store.createSession("user-2");

      store.clearAllSessions();

      assert.deepStrictEqual(store.getAllSessions(), []);
    });

    it("clearAllSessions persists to file", () => {
      const store = new FileSessionStore(tempDir);
      store.createSession("user-1");
      store.clearAllSessions();

      const store2 = new FileSessionStore(tempDir);
      assert.deepStrictEqual(store2.getAllSessions(), []);
    });
  });

  describe("date serialization", () => {
    it("preserves lastActivity date across persistence", async () => {
      const store1 = new FileSessionStore(tempDir);
      const created = store1.createSession("user-123");
      const originalTime = created.lastActivity.getTime();

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      const store2 = new FileSessionStore(tempDir);
      const loaded = store2.getSession("user-123");

      assert.ok(loaded);
      assert.ok(loaded.lastActivity instanceof Date);
      assert.strictEqual(loaded.lastActivity.getTime(), originalTime);
    });
  });
});
