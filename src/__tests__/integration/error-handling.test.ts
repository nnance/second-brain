import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  createSession,
  deleteSession,
  getOrCreateSession,
  getSession,
} from "../../sessions/store.js";
import { resetRunAgentFn, setRunAgentFn } from "../../sessions/timeout.js";
import { isRetryableError, withRetry } from "../../utils/retry.js";
import {
  cleanupTestVault,
  createMockDirectStorage,
  createMockError,
  createMockFailedResult,
  createTestVault,
} from "./setup.js";

describe("Integration: Error Handling", () => {
  let vaultPath: string;
  const originalVaultPath = process.env.VAULT_PATH;

  beforeEach(async () => {
    vaultPath = await createTestVault();
    process.env.VAULT_PATH = vaultPath;
    clearAllSessions();
  });

  afterEach(async () => {
    await cleanupTestVault(vaultPath);
    process.env.VAULT_PATH = originalVaultPath;
    clearAllSessions();
    resetRunAgentFn();
  });

  describe("agent failures", () => {
    it("handles agent returning error result", async () => {
      const sender = "error-sender";
      const mockRunAgent = createMockFailedResult("API error");

      const session = getOrCreateSession(sender);
      const result = await mockRunAgent(
        "test message",
        { recipient: sender },
        session.history,
      );

      assert.equal(result.success, false);
      assert.equal(result.error, "API error");
    });

    it("session should be cleaned up on error", async () => {
      const sender = "cleanup-sender";

      // Create session
      createSession(sender);
      assert.notEqual(getSession(sender), undefined);

      // Simulate error handling - in production code this would happen
      // Here we just verify the cleanup behavior works
      deleteSession(sender);
      assert.equal(getSession(sender), undefined);
    });
  });

  describe("retry logic", () => {
    it("retries on retryable error", async () => {
      let attempts = 0;
      const mockOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("network error");
        }
        return "success";
      };

      const result = await withRetry(mockOperation, {
        maxRetries: 3,
        delayMs: 10,
      });

      assert.equal(result, "success");
      assert.equal(attempts, 3);
    });

    it("fails immediately on non-retryable error", async () => {
      let attempts = 0;
      const mockOperation = async () => {
        attempts++;
        throw new Error("Invalid input");
      };

      await assert.rejects(
        withRetry(mockOperation, { maxRetries: 3, delayMs: 10 }),
        { message: "Invalid input" },
      );

      assert.equal(attempts, 1);
    });

    it("correctly identifies retryable errors", () => {
      assert.equal(isRetryableError(new Error("network error")), true);
      assert.equal(isRetryableError(new Error("timeout")), true);
      assert.equal(isRetryableError(new Error("rate limit")), true);
      assert.equal(isRetryableError({ status: 429 }), true);
      assert.equal(isRetryableError({ status: 503 }), true);
      assert.equal(isRetryableError(new Error("invalid")), false);
      assert.equal(isRetryableError({ status: 400 }), false);
    });
  });

  describe("error isolation", () => {
    it("errors don't affect other sessions", async () => {
      const sender1 = "sender-1";
      const sender2 = "sender-2";

      // Create both sessions
      createSession(sender1);
      createSession(sender2);

      // Simulate error on sender1
      deleteSession(sender1);

      // Sender2 should be unaffected
      assert.equal(getSession(sender1), undefined);
      assert.notEqual(getSession(sender2), undefined);
    });

    it("can process new message after error", async () => {
      const sender = "retry-sender";
      const mockRunAgent = createMockDirectStorage();

      // First attempt fails
      const errorMock = createMockError("API Error");
      try {
        await errorMock("message", { recipient: sender }, []);
      } catch {
        // Expected error
        deleteSession(sender);
      }

      // New session can be created
      const session = getOrCreateSession(sender);
      assert.notEqual(session, undefined);
      assert.deepEqual(session.history, []);

      // And processing can succeed
      const result = await mockRunAgent(
        "new message",
        { recipient: sender },
        [],
      );
      assert.equal(result.success, true);
    });
  });
});
