import { config } from "../config.js";
import logger from "../logger.js";

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Default check for retryable errors.
 * Retries on network errors, timeouts, rate limits, and server errors.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("connection") ||
      message.includes("econnreset") ||
      message.includes("enotfound")
    );
  }

  // Check for HTTP status codes in error objects
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    return status === 429 || status >= 500;
  }

  return false;
}

/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retries on failure.
 * Uses exponential backoff for retry delays.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = config.maxRetries,
    delayMs = config.retryDelayMs,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // If we've exhausted retries or the error isn't retryable, throw
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = delayMs * 2 ** (attempt - 1);

      logger.warn(
        {
          attempt,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error),
        },
        "Operation failed, retrying...",
      );

      await sleep(delay);
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}

/**
 * Check if an Anthropic API error is retryable.
 */
export function isApiRetryable(error: unknown): boolean {
  // Check for status code on error object
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    // Retry on rate limits (429) and server errors (5xx)
    return status === 429 || status >= 500;
  }

  // Fall back to general retryable check
  return isRetryableError(error);
}
