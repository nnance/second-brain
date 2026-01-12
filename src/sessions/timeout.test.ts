import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  createSession,
  getSession,
  updateSession,
} from "./store.js";
import {
  checkTimeouts,
  isTimeoutCheckerRunning,
  resetRunAgentFn,
  setRunAgentFn,
  startTimeoutChecker,
  stopTimeoutChecker,
} from "./timeout.js";

// Mock runAgent for testing
const mockRunAgent = async () => ({
  success: true,
  toolsCalled: ["vault_write", "send_message"],
  history: [],
});

describe("Session Timeout", () => {
  beforeEach(() => {
    clearAllSessions();
    stopTimeoutChecker();
    // Use mock runAgent to avoid actual API calls
    setRunAgentFn(mockRunAgent);
  });

  afterEach(() => {
    stopTimeoutChecker();
    clearAllSessions();
    resetRunAgentFn();
  });

  describe("startTimeoutChecker / stopTimeoutChecker", () => {
    it("starts the timeout checker", () => {
      assert.equal(isTimeoutCheckerRunning(), false);
      startTimeoutChecker();
      assert.equal(isTimeoutCheckerRunning(), true);
    });

    it("stops the timeout checker", () => {
      startTimeoutChecker();
      assert.equal(isTimeoutCheckerRunning(), true);
      stopTimeoutChecker();
      assert.equal(isTimeoutCheckerRunning(), false);
    });

    it("does not start multiple checkers", () => {
      startTimeoutChecker();
      startTimeoutChecker(); // Should be ignored
      assert.equal(isTimeoutCheckerRunning(), true);
      stopTimeoutChecker();
      assert.equal(isTimeoutCheckerRunning(), false);
    });
  });

  describe("checkTimeouts", () => {
    it("ignores sessions within timeout window", async () => {
      // Create a fresh session
      createSession("sender1", "chat-1");
      updateSession("sender1", {
        pendingInput: "test input",
        history: [{ role: "user", content: "test" }],
      });

      // Run timeout check
      await checkTimeouts();

      // Session should still exist
      assert.notEqual(getSession("sender1"), undefined);
    });

    it("identifies expired sessions", async () => {
      // Create a session with old lastActivity
      createSession("sender1", "chat-1");
      const session = getSession("sender1");
      if (session) {
        // Manually set lastActivity to be old (2 hours ago)
        session.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
        session.pendingInput = "test input";
      }

      // Session exists before check
      assert.notEqual(getSession("sender1"), undefined);

      // Run timeout check
      await checkTimeouts();

      // Session should be deleted after timeout handling
      assert.equal(getSession("sender1"), undefined);
    });

    it("handles multiple sessions with different ages", async () => {
      // Fresh session
      createSession("fresh", "chat-fresh");
      updateSession("fresh", {
        pendingInput: "fresh input",
      });

      // Expired session
      createSession("expired", "chat-expired");
      const expiredSession = getSession("expired");
      if (expiredSession) {
        expiredSession.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expiredSession.pendingInput = "expired input";
      }

      await checkTimeouts();

      // Fresh session should still exist
      assert.notEqual(getSession("fresh"), undefined);
      // Expired session should be deleted
      assert.equal(getSession("expired"), undefined);
    });

    it("deletes session after handling even on error", async () => {
      // Set mock to throw error
      setRunAgentFn(async () => {
        throw new Error("API Error");
      });

      // Create an expired session
      createSession("sender1", "chat-1");
      const session = getSession("sender1");
      if (session) {
        session.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
        session.pendingInput = "test input";
      }

      // Run timeout check - even if runAgent fails, session should be cleaned up
      await checkTimeouts();

      // Session should be deleted
      assert.equal(getSession("sender1"), undefined);
    });

    it("calls runAgent with chatGuid as recipient", async () => {
      let capturedMessage = "";
      let capturedRecipient = "";

      setRunAgentFn(async (message, context) => {
        capturedMessage = message;
        capturedRecipient = context.recipient;
        return { success: true, toolsCalled: [], history: [] };
      });

      // Create an expired session with chatGuid
      createSession("sender123", "chat-guid-123");
      const session = getSession("sender123");
      if (session) {
        session.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
        session.pendingInput = "original user input";
      }

      await checkTimeouts();

      // Verify the message contains timeout info
      assert(capturedMessage.includes("[SYSTEM:"));
      assert(capturedMessage.includes("original user input"));
      // Recipient should be chatGuid, not senderId
      assert.equal(capturedRecipient, "chat-guid-123");
    });
  });
});
