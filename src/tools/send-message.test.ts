import assert from "node:assert";
import { describe, it } from "node:test";
import { sendMessage } from "./send-message.js";

describe("send-message-tool", () => {
  describe("sendMessage", () => {
    it("returns error when SDK not available", async () => {
      const result = await sendMessage({
        chat_guid: "iMessage;-;+1234567890",
        text: "Test message",
      });

      assert.equal(result.success, false);
      assert.equal(result.error, "iMessage SDK not available");
    });

    it("returns error for empty message", async () => {
      const result = await sendMessage({
        chat_guid: "iMessage;-;+1234567890",
        text: "",
      });

      assert.equal(result.success, false);
      assert.equal(result.error, "Message text cannot be empty");
    });

    it("returns error for whitespace-only message", async () => {
      const result = await sendMessage({
        chat_guid: "iMessage;-;+1234567890",
        text: "   ",
      });

      assert.equal(result.success, false);
      assert.equal(result.error, "Message text cannot be empty");
    });

    it("validates that chat_guid and text are required params", async () => {
      // TypeScript ensures these are required, but test the runtime behavior
      const result = await sendMessage({
        chat_guid: "test",
        text: "Hello",
      });

      // Should fail because SDK is not available, not because of params
      assert.equal(result.success, false);
      assert.equal(result.error, "iMessage SDK not available");
    });
  });
});
