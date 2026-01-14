import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { FileSessionStore } from "./file-store.js";
import {
  checkTimeouts,
  isTimeoutCheckerRunning,
  startTimeoutChecker,
  stopTimeoutChecker,
} from "./timeout.js";

describe("Session Timeout", () => {
  let tempDir: string;
  let sessionStore: FileSessionStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "timeout-test-"));
    sessionStore = new FileSessionStore(tempDir);
    stopTimeoutChecker();
  });

  afterEach(() => {
    stopTimeoutChecker();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("startTimeoutChecker", () => {
    it("starts the timeout checker", () => {
      assert.strictEqual(isTimeoutCheckerRunning(), false);

      startTimeoutChecker(sessionStore);

      assert.strictEqual(isTimeoutCheckerRunning(), true);
    });

    it("does not start multiple checkers", () => {
      startTimeoutChecker(sessionStore);
      startTimeoutChecker(sessionStore);

      assert.strictEqual(isTimeoutCheckerRunning(), true);
    });
  });

  describe("stopTimeoutChecker", () => {
    it("stops the timeout checker", () => {
      startTimeoutChecker(sessionStore);
      assert.strictEqual(isTimeoutCheckerRunning(), true);

      stopTimeoutChecker();

      assert.strictEqual(isTimeoutCheckerRunning(), false);
    });

    it("handles stopping when not running", () => {
      assert.strictEqual(isTimeoutCheckerRunning(), false);

      stopTimeoutChecker();

      assert.strictEqual(isTimeoutCheckerRunning(), false);
    });
  });

  describe("checkTimeouts", () => {
    it("ignores sessions within timeout window", async () => {
      // Need to start checker to set the store
      startTimeoutChecker(sessionStore);

      sessionStore.createSession("+15551234567");
      sessionStore.updateSession("+15551234567", {
        sdkSessionId: "session-123",
        pendingInput: "test message",
      });

      await checkTimeouts();

      // Session should still exist
      const session = sessionStore.getSession("+15551234567");
      assert.ok(session);
      assert.strictEqual(session.sdkSessionId, "session-123");
    });

    it("identifies expired sessions correctly", async () => {
      startTimeoutChecker(sessionStore);

      // Create a session with old lastActivity
      sessionStore.createSession("+15551234567");
      const session = sessionStore.getSession("+15551234567");
      assert.ok(session);

      // Manually set lastActivity to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      session.lastActivity = twoHoursAgo;
      session.pendingInput = "test message";

      // Check that it's recognized as expired
      const sessions = sessionStore.getAllSessions();
      const age = Date.now() - sessions[0].lastActivity.getTime();
      assert.ok(age >= 3600000); // Should be at least 1 hour old
    });

    it("cleans up expired sessions without pending input", async () => {
      startTimeoutChecker(sessionStore);

      // Create a session with old lastActivity but no pendingInput
      sessionStore.createSession("+15551234567");
      const session = sessionStore.getSession("+15551234567");
      assert.ok(session);

      // Manually set lastActivity to 2 hours ago (no pendingInput)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      session.lastActivity = twoHoursAgo;

      await checkTimeouts();

      // Session should be cleaned up (deleted)
      const afterSession = sessionStore.getSession("+15551234567");
      assert.strictEqual(afterSession, undefined);
    });
  });

  describe("session cleanup", () => {
    it("sessions can be manually cleaned up", () => {
      sessionStore.createSession("+15551234567");
      sessionStore.updateSession("+15551234567", { pendingInput: "test" });

      const before = sessionStore.getAllSessions();
      assert.strictEqual(before.length, 1);

      sessionStore.clearAllSessions();

      const after = sessionStore.getAllSessions();
      assert.strictEqual(after.length, 0);
    });
  });
});
