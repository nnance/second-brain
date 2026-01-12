import assert from "node:assert";
import { describe, it } from "node:test";
import SYSTEM_PROMPT from "./system-prompt.js";
import { SYSTEM_PROMPT as namedExport } from "./system-prompt.js";

describe("system-prompt", () => {
  describe("SYSTEM_PROMPT", () => {
    it("is a non-empty string", () => {
      assert.equal(typeof SYSTEM_PROMPT, "string");
      assert.ok(SYSTEM_PROMPT.length > 0);
    });

    it("exports both default and named export", () => {
      assert.equal(SYSTEM_PROMPT, namedExport);
    });

    it("contains Vault Structure section", () => {
      assert.ok(
        SYSTEM_PROMPT.includes("## Vault Structure"),
        "Should contain Vault Structure section",
      );
    });

    it("contains Tag Taxonomy section", () => {
      assert.ok(
        SYSTEM_PROMPT.includes("## Tag Taxonomy"),
        "Should contain Tag Taxonomy section",
      );
    });

    it("contains Decision Guidelines section", () => {
      assert.ok(
        SYSTEM_PROMPT.includes("## Decision Guidelines"),
        "Should contain Decision Guidelines section",
      );
    });

    it("contains Workflow section", () => {
      assert.ok(
        SYSTEM_PROMPT.includes("## Workflow"),
        "Should contain Workflow section",
      );
    });

    it("contains Important Rules section", () => {
      assert.ok(
        SYSTEM_PROMPT.includes("## Important Rules"),
        "Should contain Important Rules section",
      );
    });

    it("mentions all vault folders", () => {
      const folders = [
        "Tasks",
        "Ideas",
        "Reference",
        "Projects",
        "Inbox",
        "Archive",
      ];
      for (const folder of folders) {
        assert.ok(
          SYSTEM_PROMPT.includes(folder),
          `Should mention ${folder} folder`,
        );
      }
    });

    it("includes entity tag examples", () => {
      assert.ok(SYSTEM_PROMPT.includes("person/{name}"));
      assert.ok(SYSTEM_PROMPT.includes("project/{name}"));
      assert.ok(SYSTEM_PROMPT.includes("topic/{name}"));
      assert.ok(SYSTEM_PROMPT.includes("company/{name}"));
    });

    it("includes priority tag examples", () => {
      assert.ok(SYSTEM_PROMPT.includes("priority/urgent"));
      assert.ok(SYSTEM_PROMPT.includes("priority/high"));
      assert.ok(SYSTEM_PROMPT.includes("priority/normal"));
      assert.ok(SYSTEM_PROMPT.includes("priority/low"));
      assert.ok(SYSTEM_PROMPT.includes("priority/someday"));
    });

    it("includes status tag examples", () => {
      assert.ok(SYSTEM_PROMPT.includes("status/waiting"));
      assert.ok(SYSTEM_PROMPT.includes("status/active"));
      assert.ok(SYSTEM_PROMPT.includes("status/scheduled"));
      assert.ok(SYSTEM_PROMPT.includes("status/done"));
    });

    it("mentions required tools", () => {
      assert.ok(SYSTEM_PROMPT.includes("vault_write"));
      assert.ok(SYSTEM_PROMPT.includes("log_interaction"));
      assert.ok(SYSTEM_PROMPT.includes("send_message"));
    });
  });
});
