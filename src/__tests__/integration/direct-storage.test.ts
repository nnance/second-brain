import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  clearAllSessions,
  getOrCreateSession,
  getSession,
} from "../../sessions/store.js";
import { resetRunAgentFn, setRunAgentFn } from "../../sessions/timeout.js";
import {
  cleanupTestVault,
  createMockDirectStorage,
  createTestVault,
} from "./setup.js";

describe("Integration: Direct Storage Flow", () => {
  let vaultPath: string;
  const originalVaultPath = process.env.VAULT_PATH;

  beforeEach(async () => {
    vaultPath = await createTestVault();
    process.env.VAULT_PATH = vaultPath;
    clearAllSessions();
    setRunAgentFn(createMockDirectStorage());
  });

  afterEach(async () => {
    await cleanupTestVault(vaultPath);
    process.env.VAULT_PATH = originalVaultPath;
    clearAllSessions();
    resetRunAgentFn();
  });

  describe("high-confidence storage", () => {
    it("processes message and completes session", async () => {
      const sender = "test-sender-1";
      const mockRunAgent = createMockDirectStorage();

      // Create session
      const session = getOrCreateSession(sender);
      assert.deepEqual(session.history, []);

      // Simulate agent processing
      const result = await mockRunAgent(
        "remind me to follow up with Sarah",
        { recipient: sender },
        session.history,
      );

      assert.equal(result.success, true);
      assert(result.toolsCalled.includes("mcp__vault-tools__vault_write"));
      assert(result.toolsCalled.includes("mcp__vault-tools__send_message"));
      assert.equal(result.history.length, 2); // user + assistant
    });

    it("returns updated history with user and assistant messages", async () => {
      const sender = "test-sender-2";
      const mockRunAgent = createMockDirectStorage();

      const session = getOrCreateSession(sender);
      const result = await mockRunAgent(
        "save this important note",
        { recipient: sender },
        session.history,
      );

      assert.equal(result.history[0].role, "user");
      assert.equal(result.history[0].content, "save this important note");
      assert.equal(result.history[1].role, "assistant");
    });

    it("includes vault_write in tools called", async () => {
      const mockRunAgent = createMockDirectStorage();
      const result = await mockRunAgent(
        "task: finish report",
        { recipient: "sender" },
        [],
      );

      // Check for vault_write tool
      const hasVaultWrite = result.toolsCalled.some((tool) =>
        tool.includes("vault_write"),
      );
      assert(hasVaultWrite, "Expected vault_write to be called");
    });
  });
});
