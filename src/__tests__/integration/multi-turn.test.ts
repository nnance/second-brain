import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  deleteSession,
  getOrCreateSession,
  getSession,
  updateSession,
} from "../../sessions/store.js";
import { resetRunAgentFn, setRunAgentFn } from "../../sessions/timeout.js";
import {
  cleanupTestVault,
  createMockClarificationComplete,
  createMockClarificationRequest,
  createTestVault,
} from "./setup.js";

describe("Integration: Multi-Turn Conversation", () => {
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

  describe("clarification then storage", () => {
    it("completes storage after clarification response", async () => {
      const sender = "multi-turn-sender";

      // Turn 1: Agent asks clarification
      setRunAgentFn(createMockClarificationRequest());
      const session1 = getOrCreateSession(sender);

      const result1 = await createMockClarificationRequest()(
        "zero trust architecture",
        { recipient: sender },
        session1.history,
      );

      // Detect clarification
      const askedClarification =
        result1.toolsCalled.some((t) => t.includes("send_message")) &&
        !result1.toolsCalled.some((t) => t.includes("vault_write"));
      assert.equal(askedClarification, true);

      // Save session with history
      updateSession(sender, {
        history: result1.history,
        pendingInput: "zero trust architecture",
      });

      // Verify session saved
      const savedSession = getSession(sender);
      assert.notEqual(savedSession, undefined);
      assert.equal(savedSession?.pendingInput, "zero trust architecture");
      assert.equal(savedSession?.history.length, 2);

      // Turn 2: User responds, agent stores
      setRunAgentFn(createMockClarificationComplete());

      const result2 = await createMockClarificationComplete()(
        "it's a link to save",
        { recipient: sender },
        savedSession?.history ?? [],
      );

      assert.equal(result2.success, true);
      assert(result2.toolsCalled.some((t) => t.includes("vault_write")));

      // Session should be cleared after storage
      deleteSession(sender);
      assert.equal(getSession(sender), undefined);
    });

    it("preserves conversation history across turns", async () => {
      const sender = "history-test-sender";

      // Initial message
      const session = getOrCreateSession(sender);
      const result1 = await createMockClarificationRequest()(
        "first message",
        { recipient: sender },
        session.history,
      );

      // Update session with history
      updateSession(sender, {
        history: result1.history,
        pendingInput: "first message",
      });

      // Second message with history
      const updatedSession = getSession(sender);
      assert.notEqual(updatedSession, undefined);
      assert.equal(updatedSession?.history.length, 2);

      // Process second message
      const result2 = await createMockClarificationComplete()(
        "second message",
        { recipient: sender },
        updatedSession?.history ?? [],
      );

      // History should include all messages
      assert.equal(result2.history.length, 4); // 2 from turn 1 + 2 from turn 2
    });

    it("different senders have isolated sessions", async () => {
      const sender1 = "sender-1";
      const sender2 = "sender-2";

      // Create sessions for both
      getOrCreateSession(sender1);
      getOrCreateSession(sender2);

      // Update sender1 with history
      updateSession(sender1, {
        history: [
          { role: "user", content: "message 1" },
          { role: "assistant", content: "response 1" },
        ],
        pendingInput: "pending 1",
      });

      // Update sender2 with different history
      updateSession(sender2, {
        history: [
          { role: "user", content: "message 2" },
          { role: "assistant", content: "response 2" },
        ],
        pendingInput: "pending 2",
      });

      // Verify isolation
      const session1 = getSession(sender1);
      const session2 = getSession(sender2);

      assert.equal(session1?.pendingInput, "pending 1");
      assert.equal(session2?.pendingInput, "pending 2");
      assert.equal(session1?.history[0].content, "message 1");
      assert.equal(session2?.history[0].content, "message 2");

      // Delete one doesn't affect other
      deleteSession(sender1);
      assert.equal(getSession(sender1), undefined);
      assert.notEqual(getSession(sender2), undefined);
    });
  });
});
