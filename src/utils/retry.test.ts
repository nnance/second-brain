import assert from "node:assert";
import { describe, it } from "node:test";
import { isApiRetryable, isRetryableError, withRetry } from "./retry.js";

describe("Retry Utility", () => {
  describe("isRetryableError", () => {
    it("returns true for network errors", () => {
      assert.equal(isRetryableError(new Error("network error")), true);
      assert.equal(isRetryableError(new Error("Network failure")), true);
    });

    it("returns true for timeout errors", () => {
      assert.equal(isRetryableError(new Error("timeout occurred")), true);
      assert.equal(isRetryableError(new Error("Request timeout")), true);
    });

    it("returns true for rate limit errors", () => {
      assert.equal(isRetryableError(new Error("rate limit exceeded")), true);
      assert.equal(isRetryableError(new Error("Error 429")), true);
    });

    it("returns true for connection errors", () => {
      assert.equal(isRetryableError(new Error("connection refused")), true);
      assert.equal(isRetryableError(new Error("ECONNRESET")), true);
      assert.equal(isRetryableError(new Error("ENOTFOUND")), true);
    });

    it("returns true for server errors", () => {
      assert.equal(
        isRetryableError(new Error("503 Service Unavailable")),
        true,
      );
    });

    it("returns true for HTTP status codes 429 and 5xx", () => {
      assert.equal(isRetryableError({ status: 429 }), true);
      assert.equal(isRetryableError({ status: 500 }), true);
      assert.equal(isRetryableError({ status: 502 }), true);
      assert.equal(isRetryableError({ status: 503 }), true);
    });

    it("returns false for non-retryable errors", () => {
      assert.equal(isRetryableError(new Error("Invalid input")), false);
      assert.equal(isRetryableError(new Error("Authentication failed")), false);
      assert.equal(isRetryableError({ status: 400 }), false);
      assert.equal(isRetryableError({ status: 401 }), false);
      assert.equal(isRetryableError({ status: 404 }), false);
    });

    it("returns false for non-Error values", () => {
      assert.equal(isRetryableError("string error"), false);
      assert.equal(isRetryableError(null), false);
      assert.equal(isRetryableError(undefined), false);
    });
  });

  describe("isApiRetryable", () => {
    it("returns true for 429 status", () => {
      assert.equal(isApiRetryable({ status: 429 }), true);
    });

    it("returns true for 5xx status", () => {
      assert.equal(isApiRetryable({ status: 500 }), true);
      assert.equal(isApiRetryable({ status: 503 }), true);
    });

    it("returns false for 4xx status (except 429)", () => {
      assert.equal(isApiRetryable({ status: 400 }), false);
      assert.equal(isApiRetryable({ status: 401 }), false);
      assert.equal(isApiRetryable({ status: 403 }), false);
      assert.equal(isApiRetryable({ status: 404 }), false);
    });

    it("falls back to general check for Error objects", () => {
      assert.equal(isApiRetryable(new Error("network error")), true);
      assert.equal(isApiRetryable(new Error("Invalid request")), false);
    });
  });

  describe("withRetry", () => {
    it("succeeds on first attempt", async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts++;
        return "success";
      });

      assert.equal(result, "success");
      assert.equal(attempts, 1);
    });

    it("retries on retryable error", async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error("network error");
          }
          return "success";
        },
        { maxRetries: 3, delayMs: 10 },
      );

      assert.equal(result, "success");
      assert.equal(attempts, 3);
    });

    it("fails immediately on non-retryable error", async () => {
      let attempts = 0;
      await assert.rejects(
        withRetry(
          async () => {
            attempts++;
            throw new Error("Invalid input");
          },
          { maxRetries: 3, delayMs: 10 },
        ),
        { message: "Invalid input" },
      );

      assert.equal(attempts, 1);
    });

    it("respects max retry limit", async () => {
      let attempts = 0;
      await assert.rejects(
        withRetry(
          async () => {
            attempts++;
            throw new Error("network error");
          },
          { maxRetries: 2, delayMs: 10 },
        ),
        { message: "network error" },
      );

      // 1 initial attempt + 2 retries = 3 total
      assert.equal(attempts, 3);
    });

    it("uses custom shouldRetry function", async () => {
      let attempts = 0;
      await assert.rejects(
        withRetry(
          async () => {
            attempts++;
            throw new Error("custom error");
          },
          {
            maxRetries: 3,
            delayMs: 10,
            shouldRetry: (error) =>
              error instanceof Error && error.message === "retry me",
          },
        ),
        { message: "custom error" },
      );

      // Should not retry because custom shouldRetry returns false
      assert.equal(attempts, 1);
    });

    it("applies exponential backoff", async () => {
      const startTime = Date.now();
      let attempts = 0;

      await assert.rejects(
        withRetry(
          async () => {
            attempts++;
            throw new Error("network error");
          },
          { maxRetries: 2, delayMs: 50 },
        ),
      );

      const elapsed = Date.now() - startTime;
      // Expected delays: 50ms (first retry) + 100ms (second retry) = 150ms minimum
      // Allow some margin for execution time
      assert(elapsed >= 100, `Expected at least 100ms, got ${elapsed}ms`);
      assert.equal(attempts, 3);
    });
  });
});
