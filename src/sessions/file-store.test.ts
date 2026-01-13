import assert from "node:assert";
import { promises as fs } from "node:fs";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import { loadSessions, saveSessions } from "./file-store.js";
import type { Session } from "./store.js";

describe("File Store", () => {
  const testStorePath = "/tmp/test-sessions.json";

  // Set environment variable for testing
  beforeEach(() => {
    process.env.SESSION_STORE_PATH = testStorePath;
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testStorePath);
    } catch {
      // Ignore if file doesn't exist
    }
    try {
      await fs.unlink(`${testStorePath}.tmp`);
    } catch {
      // Ignore if temp file doesn't exist
    }
  });

  after(() => {
    delete process.env.SESSION_STORE_PATH;
  });

  describe("loadSessions", () => {
    it("should return empty Map when file doesn't exist", async () => {
      const sessions = await loadSessions();

      assert.ok(sessions instanceof Map);
      assert.strictEqual(sessions.size, 0);
    });

    it("should parse existing JSON file correctly", async () => {
      const testData = [
        {
          senderId: "+15551234567",
          sdkSessionId: "session-123",
          lastActivity: "2026-01-13T12:00:00.000Z",
          pendingInput: "test message",
        },
        {
          senderId: "+15559876543",
          lastActivity: "2026-01-13T13:00:00.000Z",
        },
      ];

      await fs.writeFile(testStorePath, JSON.stringify(testData, null, 2));

      const sessions = await loadSessions();

      assert.strictEqual(sessions.size, 2);

      const session1 = sessions.get("+15551234567");
      assert.ok(session1);
      assert.strictEqual(session1.senderId, "+15551234567");
      assert.strictEqual(session1.sdkSessionId, "session-123");
      assert.strictEqual(session1.pendingInput, "test message");
      assert.ok(session1.lastActivity instanceof Date);
      assert.strictEqual(
        session1.lastActivity.toISOString(),
        "2026-01-13T12:00:00.000Z",
      );

      const session2 = sessions.get("+15559876543");
      assert.ok(session2);
      assert.strictEqual(session2.senderId, "+15559876543");
      assert.strictEqual(session2.sdkSessionId, undefined);
      assert.strictEqual(session2.pendingInput, undefined);
      assert.ok(session2.lastActivity instanceof Date);
    });

    it("should convert ISO date strings back to Date objects", async () => {
      const testData = [
        {
          senderId: "+15551234567",
          lastActivity: "2026-01-13T12:30:45.123Z",
        },
      ];

      await fs.writeFile(testStorePath, JSON.stringify(testData));

      const sessions = await loadSessions();
      const session = sessions.get("+15551234567");

      assert.ok(session);
      assert.ok(session.lastActivity instanceof Date);
      assert.strictEqual(
        session.lastActivity.toISOString(),
        "2026-01-13T12:30:45.123Z",
      );
    });

    it("should handle corrupt JSON gracefully", async () => {
      await fs.writeFile(testStorePath, "{ invalid json [[[");

      const sessions = await loadSessions();

      assert.ok(sessions instanceof Map);
      assert.strictEqual(sessions.size, 0);
    });
  });

  describe("saveSessions", () => {
    it("should create file when it doesn't exist", async () => {
      const sessions = new Map<string, Session>();
      sessions.set("+15551234567", {
        senderId: "+15551234567",
        lastActivity: new Date("2026-01-13T12:00:00.000Z"),
      });

      await saveSessions(sessions);

      const exists = await fs
        .access(testStorePath)
        .then(() => true)
        .catch(() => false);
      assert.ok(exists);
    });

    it("should write valid JSON", async () => {
      const sessions = new Map<string, Session>();
      sessions.set("+15551234567", {
        senderId: "+15551234567",
        sdkSessionId: "session-abc",
        lastActivity: new Date("2026-01-13T12:00:00.000Z"),
        pendingInput: "test message",
      });

      await saveSessions(sessions);

      const content = await fs.readFile(testStorePath, "utf-8");
      const parsed = JSON.parse(content);

      assert.ok(Array.isArray(parsed));
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].senderId, "+15551234567");
      assert.strictEqual(parsed[0].sdkSessionId, "session-abc");
      assert.strictEqual(parsed[0].lastActivity, "2026-01-13T12:00:00.000Z");
      assert.strictEqual(parsed[0].pendingInput, "test message");
    });

    it("should handle Date serialization", async () => {
      const now = new Date();
      const sessions = new Map<string, Session>();
      sessions.set("+15551234567", {
        senderId: "+15551234567",
        lastActivity: now,
      });

      await saveSessions(sessions);

      const content = await fs.readFile(testStorePath, "utf-8");
      const parsed = JSON.parse(content);

      assert.strictEqual(parsed[0].lastActivity, now.toISOString());
    });

    it("should use atomic write (temp file then rename)", async () => {
      const sessions = new Map<string, Session>();
      sessions.set("+15551234567", {
        senderId: "+15551234567",
        lastActivity: new Date(),
      });

      // Write initial content
      await saveSessions(sessions);

      // Verify temp file doesn't exist after successful write
      const tempExists = await fs
        .access(`${testStorePath}.tmp`)
        .then(() => true)
        .catch(() => false);
      assert.strictEqual(tempExists, false);

      // Verify actual file exists
      const fileExists = await fs
        .access(testStorePath)
        .then(() => true)
        .catch(() => false);
      assert.strictEqual(fileExists, true);
    });

    it("should handle multiple sessions", async () => {
      const sessions = new Map<string, Session>();
      sessions.set("+15551111111", {
        senderId: "+15551111111",
        lastActivity: new Date("2026-01-13T10:00:00.000Z"),
      });
      sessions.set("+15552222222", {
        senderId: "+15552222222",
        sdkSessionId: "session-2",
        lastActivity: new Date("2026-01-13T11:00:00.000Z"),
      });
      sessions.set("+15553333333", {
        senderId: "+15553333333",
        lastActivity: new Date("2026-01-13T12:00:00.000Z"),
        pendingInput: "message 3",
      });

      await saveSessions(sessions);

      const content = await fs.readFile(testStorePath, "utf-8");
      const parsed = JSON.parse(content);

      assert.strictEqual(parsed.length, 3);
      const senderIds = parsed.map((s: { senderId: string }) => s.senderId);
      assert.ok(senderIds.includes("+15551111111"));
      assert.ok(senderIds.includes("+15552222222"));
      assert.ok(senderIds.includes("+15553333333"));
    });
  });

  describe("round-trip persistence", () => {
    it("should preserve data through save and load cycle", async () => {
      const originalSessions = new Map<string, Session>();
      originalSessions.set("+15551234567", {
        senderId: "+15551234567",
        sdkSessionId: "session-xyz",
        lastActivity: new Date("2026-01-13T14:30:00.000Z"),
        pendingInput: "original message",
      });
      originalSessions.set("+15559876543", {
        senderId: "+15559876543",
        lastActivity: new Date("2026-01-13T15:00:00.000Z"),
      });

      await saveSessions(originalSessions);
      const loadedSessions = await loadSessions();

      assert.strictEqual(loadedSessions.size, 2);

      const session1 = loadedSessions.get("+15551234567");
      assert.ok(session1);
      assert.strictEqual(session1.senderId, "+15551234567");
      assert.strictEqual(session1.sdkSessionId, "session-xyz");
      assert.strictEqual(session1.pendingInput, "original message");
      assert.strictEqual(
        session1.lastActivity.toISOString(),
        "2026-01-13T14:30:00.000Z",
      );

      const session2 = loadedSessions.get("+15559876543");
      assert.ok(session2);
      assert.strictEqual(session2.senderId, "+15559876543");
      assert.strictEqual(session2.sdkSessionId, undefined);
      assert.strictEqual(
        session2.lastActivity.toISOString(),
        "2026-01-13T15:00:00.000Z",
      );
    });
  });
});
