import assert from "node:assert";
import { describe, it } from "node:test";
import { getSDK } from "./listener.js";

describe("listener", () => {
  it("should export getSDK function", () => {
    assert.strictEqual(typeof getSDK, "function");
  });

  it("should return null when not started", () => {
    assert.strictEqual(getSDK(), null);
  });
});
