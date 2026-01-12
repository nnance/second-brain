import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { clearAllSessions, getOrCreateSession } from "../../sessions/store.js";
import { resetRunAgentFn, setRunAgentFn } from "../../sessions/timeout.js";
import {
  cleanupTestVault,
  createMockClarificationRequest,
  createTestVault,
} from "./setup.js";

describe("Integration: Clarification Flow", () => {
  let vaultPath: string;
  const originalVaultPath = process.env.VAULT_PATH;

  beforeEach(async () => {
    vaultPath = await createTestVault();
    process.env.VAULT_PATH = vaultPath;
    clearAllSessions();
    setRunAgentFn(createMockClarificationRequest());
  });

  afterEach(async () => {
    await cleanupTestVault(vaultPath);
    process.env.VAULT_PATH = originalVaultPath;
    clearAllSessions();
    resetRunAgentFn();
  });

  describe("ambiguous input", () => {
    it("asks clarification for ambiguous input", async () => {
      const sender = "test-sender-1";
      const mockRunAgent = createMockClarificationRequest();

      const session = getOrCreateSession(sender, `chat-${sender}`);
      const result = await mockRunAgent(
        "zero trust architecture",
        { recipient: sender },
        session.history,
      );

      assert.equal(result.success, true);
      // send_message called but NOT vault_write
      assert(result.toolsCalled.some((t) => t.includes("send_message")));
      assert(!result.toolsCalled.some((t) => t.includes("vault_write")));
    });

    it("returns clarification question in history", async () => {
      const mockRunAgent = createMockClarificationRequest();
      const result = await mockRunAgent(
        "zero trust architecture",
        { recipient: "sender" },
        [],
      );

      const assistantMessage = result.history.find(
        (m) => m.role === "assistant",
      );
      assert(assistantMessage);
      assert(assistantMessage.content.includes("link to save"));
    });

    it("can detect clarification from tool calls", async () => {
      const mockRunAgent = createMockClarificationRequest();
      const result = await mockRunAgent("testing", { recipient: "sender" }, []);

      // Logic used in index.ts to detect clarification
      const askedClarification =
        result.toolsCalled.some((t) => t.includes("send_message")) &&
        !result.toolsCalled.some((t) => t.includes("vault_write"));

      assert.equal(askedClarification, true);
    });
  });
});
