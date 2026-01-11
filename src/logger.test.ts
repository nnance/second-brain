import assert from "node:assert";
import { describe, it } from "node:test";
import logger from "./logger.js";

describe("logger", () => {
  it("should be defined", () => {
    assert.ok(logger);
  });

  it("should have info method", () => {
    assert.strictEqual(typeof logger.info, "function");
  });
});
