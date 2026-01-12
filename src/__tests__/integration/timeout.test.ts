import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  createSession,
  getSession,
  updateSession,
} from "../../sessions/store.js";
import {
  checkTimeouts,
  resetRunAgentFn,
  setRunAgentFn,
} from "../../sessions/timeout.js";
import {
  cleanupTestVault,
  createMockTimeoutHandling,
  createTestVault,
} from "./setup.js";

describe("Integration: Session Timeout", () => {
  let vaultPath: string;
  const originalVaultPath = process.env.VAULT_PATH;

  beforeEach(async () => {
    vaultPath = await createTestVault();
    process.env.VAULT_PATH = vaultPath;
    clearAllSessions();
    setRunAgentFn(createMockTimeoutHandling());
  });

  afterEach(async () => {
    await cleanupTestVault(vaultPath);
    process.env.VAULT_PATH = originalVaultPath;
    clearAllSessions();
    resetRunAgentFn();
  });

  describe("expired sessions", () => {
    it("handles timed out session", async () => {
      const sender = "timeout-sender";

      // Create a session with old lastActivity
      createSession(sender, `chat-${sender}`);
      const session = getSession(sender);
      if (session) {
        session.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
        session.pendingInput = "original input";
        session.history = [
          { role: "user", content: "original input" },
          { role: "assistant", content: "What category?" },
        ];
      }

      // Verify session exists
      assert.notEqual(getSession(sender), undefined);

      // Run timeout check
      await checkTimeouts();

      // Session should be deleted after timeout handling
      assert.equal(getSession(sender), undefined);
    });

    it("preserves pending input for timeout handling", async () => {
      const sender = "pending-input-sender";
      let capturedMessage = "";

      // Set up mock to capture the message
      setRunAgentFn(async (message) => {
        capturedMessage = message;
        return {
          success: true,
          toolsCalled: [],
          history: [],
        };
      });

      // Create expired session with pending input
      createSession(sender, `chat-${sender}`);
      const session = getSession(sender);
      if (session) {
        session.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
        session.pendingInput = "my original message";
      }

      await checkTimeouts();

      // Verify the timeout message includes the original input
      assert(capturedMessage.includes("[SYSTEM:"));
      assert(capturedMessage.includes("my original message"));
    });

    it("does not affect fresh sessions", async () => {
      const freshSender = "fresh-sender";
      const expiredSender = "expired-sender";

      // Create fresh session
      createSession(freshSender, "chat-fresh");
      updateSession(freshSender, {
        pendingInput: "fresh input",
      });

      // Create expired session
      createSession(expiredSender, "chat-expired");
      const expiredSession = getSession(expiredSender);
      if (expiredSession) {
        expiredSession.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expiredSession.pendingInput = "expired input";
      }

      // Run timeout check
      await checkTimeouts();

      // Fresh session should remain
      assert.notEqual(getSession(freshSender), undefined);
      // Expired session should be deleted
      assert.equal(getSession(expiredSender), undefined);
    });
  });
});
