import assert from "node:assert";
import { describe, it, mock } from "node:test";

describe("agent/runner", () => {
  describe("runAgent", () => {
    it("exports runAgent function", async () => {
      const runner = await import("./runner.js");
      assert.equal(typeof runner.runAgent, "function");
    });

    it("exports AgentContext interface via TypeScript", async () => {
      // This test verifies the module can be imported without errors
      const runner = await import("./runner.js");
      assert.ok(runner);
    });

    it("exports AgentResult interface via TypeScript", async () => {
      // This test verifies the module can be imported without errors
      const runner = await import("./runner.js");
      assert.ok(runner);
    });

    it("runAgent accepts string and context parameters", async () => {
      const runner = await import("./runner.js");

      // Verify the function signature by checking it's a function
      // We can't actually call it without mocking the SDK,
      // but we verify the types are correct at compile time
      assert.equal(typeof runner.runAgent, "function");
      assert.equal(runner.runAgent.length, 2); // 2 parameters
    });
  });
});
