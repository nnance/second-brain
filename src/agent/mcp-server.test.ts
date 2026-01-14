import assert from "node:assert";
import { describe, it } from "node:test";
import {
  TOOL_NAMES,
  baseTools,
  createSendMessageTool,
  createVaultMcpServer,
} from "./mcp-server.js";

describe("mcp-server", () => {
  describe("createVaultMcpServer", () => {
    it("returns an MCP server configuration", () => {
      const server = createVaultMcpServer("test-recipient");
      assert.ok(server);
      assert.equal(typeof server, "object");
    });

    it("creates server with correct name", () => {
      const server = createVaultMcpServer("test-recipient");
      assert.equal(server.name, "vault-tools");
    });

    it("creates server with sdk type", () => {
      const server = createVaultMcpServer("test-recipient");
      assert.equal(server.type, "sdk");
    });

    it("creates server with McpServer instance", () => {
      const server = createVaultMcpServer("test-recipient");
      assert.ok(server.instance);
    });
  });

  describe("baseTools", () => {
    it("has 7 base tools", () => {
      assert.equal(baseTools.length, 7);
    });

    it("includes vault_write tool", () => {
      const tool = baseTools.find((t) => t.name === "vault_write");
      assert.ok(tool, "vault_write tool should exist");
    });

    it("includes vault_read tool", () => {
      const tool = baseTools.find((t) => t.name === "vault_read");
      assert.ok(tool, "vault_read tool should exist");
    });

    it("includes vault_list tool", () => {
      const tool = baseTools.find((t) => t.name === "vault_list");
      assert.ok(tool, "vault_list tool should exist");
    });

    it("includes vault_move tool", () => {
      const tool = baseTools.find((t) => t.name === "vault_move");
      assert.ok(tool, "vault_move tool should exist");
    });

    it("includes vault_set_reminder tool", () => {
      const tool = baseTools.find((t) => t.name === "vault_set_reminder");
      assert.ok(tool, "vault_set_reminder tool should exist");
    });

    it("includes vault_list_reminders tool", () => {
      const tool = baseTools.find((t) => t.name === "vault_list_reminders");
      assert.ok(tool, "vault_list_reminders tool should exist");
    });

    it("includes log_interaction tool", () => {
      const tool = baseTools.find((t) => t.name === "log_interaction");
      assert.ok(tool, "log_interaction tool should exist");
    });
  });

  describe("createSendMessageTool", () => {
    it("creates send_message tool with correct name", () => {
      const tool = createSendMessageTool("test-recipient");
      assert.equal(tool.name, "send_message");
    });

    it("creates tool with recipient context", () => {
      const tool = createSendMessageTool("test-recipient-123");
      assert.ok(tool);
      // The recipient is baked into the handler closure
    });
  });

  describe("TOOL_NAMES", () => {
    it("contains 8 tool names", () => {
      assert.equal(TOOL_NAMES.length, 8);
    });

    it("all names have mcp__vault-tools__ prefix", () => {
      for (const name of TOOL_NAMES) {
        assert.ok(
          name.startsWith("mcp__vault-tools__"),
          `${name} should start with mcp__vault-tools__`,
        );
      }
    });

    it("includes vault_write", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__vault_write"));
    });

    it("includes vault_read", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__vault_read"));
    });

    it("includes vault_list", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__vault_list"));
    });

    it("includes vault_move", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__vault_move"));
    });

    it("includes vault_set_reminder", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__vault_set_reminder"));
    });

    it("includes vault_list_reminders", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__vault_list_reminders"));
    });

    it("includes log_interaction", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__log_interaction"));
    });

    it("includes send_message", () => {
      assert.ok(TOOL_NAMES.includes("mcp__vault-tools__send_message"));
    });
  });
});
