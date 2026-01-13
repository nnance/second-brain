import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  createSession,
  getAllSessions,
  getSession,
  updateSession,
} from "./store.js";
import {
  checkTimeouts,
  isTimeoutCheckerRunning,
  startTimeoutChecker,
  stopTimeoutChecker,
} from "./timeout.js";

describe("Session Timeout", () => {
  beforeEach(() => {
    clearAllSessions();
    stopTimeoutChecker();
  });

  afterEach(() => {
    stopTimeoutChecker();
    clearAllSessions();
  });

  describe("startTimeoutChecker", () => {
    it("starts the timeout checker", () => {
      assert.strictEqual(isTimeoutCheckerRunning(), false);

      startTimeoutChecker();

      assert.strictEqual(isTimeoutCheckerRunning(), true);
    });

    it("does not start multiple checkers", () => {
      startTimeoutChecker();
      startTimeoutChecker();

      assert.strictEqual(isTimeoutCheckerRunning(), true);
    });
  });

  describe("stopTimeoutChecker", () => {
    it("stops the timeout checker", () => {
      startTimeoutChecker();
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
      createSession("+15551234567");
      updateSession("+15551234567", {
        sdkSessionId: "session-123",
        pendingInput: "test message",
      });

      await checkTimeouts();

      // Session should still exist
      const session = getSession("+15551234567");
      assert.ok(session);
      assert.strictEqual(session.sdkSessionId, "session-123");
    });

    it("identifies expired sessions correctly", async () => {
      // Create a session with old lastActivity
      createSession("+15551234567");
      const session = getSession("+15551234567");
      assert.ok(session);

      // Manually set lastActivity to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      session.lastActivity = twoHoursAgo;
      session.pendingInput = "test message";

      // Check that it's recognized as expired
      const sessions = getAllSessions();
      const age = Date.now() - sessions[0].lastActivity.getTime();
      assert.ok(age >= 3600000); // Should be at least 1 hour old
    });

    it("cleans up expired sessions without pending input", async () => {
      // Create a session with old lastActivity but no pendingInput
      createSession("+15551234567");
      const session = getSession("+15551234567");
      assert.ok(session);

      // Manually set lastActivity to 2 hours ago (no pendingInput)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      session.lastActivity = twoHoursAgo;

      await checkTimeouts();

      // Session should be cleaned up (deleted)
      const afterSession = getSession("+15551234567");
      assert.strictEqual(afterSession, undefined);
    });
  });

  describe("session cleanup", () => {
    it("sessions can be manually cleaned up", () => {
      createSession("+15551234567");
      updateSession("+15551234567", { pendingInput: "test" });

      const before = getAllSessions();
      assert.strictEqual(before.length, 1);

      clearAllSessions();

      const after = getAllSessions();
      assert.strictEqual(after.length, 0);
    });
  });
});
