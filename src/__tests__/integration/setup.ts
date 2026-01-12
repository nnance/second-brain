import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentResult } from "../../agent/runner.js";
import type { ConversationMessage } from "../../sessions/store.js";

/**
 * Create a temporary test vault with the standard folder structure.
 */
export async function createTestVault(): Promise<string> {
  const vaultPath = join(tmpdir(), `test-vault-${Date.now()}`);

  await mkdir(join(vaultPath, "_system", "logs"), { recursive: true });
  await mkdir(join(vaultPath, "Tasks"), { recursive: true });
  await mkdir(join(vaultPath, "Ideas"), { recursive: true });
  await mkdir(join(vaultPath, "Reference"), { recursive: true });
  await mkdir(join(vaultPath, "Projects"), { recursive: true });
  await mkdir(join(vaultPath, "Inbox"), { recursive: true });
  await mkdir(join(vaultPath, "Archive"), { recursive: true });

  return vaultPath;
}

/**
 * Clean up a temporary test vault.
 */
export async function cleanupTestVault(vaultPath: string): Promise<void> {
  await rm(vaultPath, { recursive: true, force: true });
}

/**
 * Type for the mock runAgent function.
 */
export type MockRunAgentFn = (
  message: string,
  context: { recipient: string },
  history: ConversationMessage[],
) => Promise<AgentResult>;

/**
 * Create a mock runAgent that simulates high-confidence direct storage.
 * Returns success with vault_write and send_message tools called.
 */
export function createMockDirectStorage(): MockRunAgentFn {
  return async (message, context, history) => ({
    success: true,
    toolsCalled: [
      "mcp__vault-tools__vault_write",
      "mcp__vault-tools__log_interaction",
      "mcp__vault-tools__send_message",
    ],
    history: [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: "Got it! Saved your task." },
    ],
  });
}

/**
 * Create a mock runAgent that simulates clarification request.
 * Returns success with only send_message called (no vault_write).
 */
export function createMockClarificationRequest(): MockRunAgentFn {
  return async (message, context, history) => ({
    success: true,
    toolsCalled: [
      "mcp__vault-tools__log_interaction",
      "mcp__vault-tools__send_message",
    ],
    history: [
      ...history,
      { role: "user", content: message },
      {
        role: "assistant",
        content: "Is this a link to save or a concept to research?",
      },
    ],
  });
}

/**
 * Create a mock runAgent that simulates completion after clarification.
 * Used for multi-turn conversations.
 */
export function createMockClarificationComplete(): MockRunAgentFn {
  return async (message, context, history) => ({
    success: true,
    toolsCalled: [
      "mcp__vault-tools__vault_write",
      "mcp__vault-tools__log_interaction",
      "mcp__vault-tools__send_message",
    ],
    history: [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: "Got it! Saved to Reference." },
    ],
  });
}

/**
 * Create a mock runAgent that always throws an error.
 */
export function createMockError(errorMessage: string): MockRunAgentFn {
  return async () => {
    throw new Error(errorMessage);
  };
}

/**
 * Create a mock runAgent that returns a failed result.
 */
export function createMockFailedResult(error: string): MockRunAgentFn {
  return async (message, context, history) => ({
    success: false,
    toolsCalled: [],
    history: [...history, { role: "user", content: message }],
    error,
  });
}

/**
 * Create a mock runAgent for timeout handling.
 * Simulates storing to Inbox when timeout occurs.
 */
export function createMockTimeoutHandling(): MockRunAgentFn {
  return async (message, context, history) => ({
    success: true,
    toolsCalled: [
      "mcp__vault-tools__vault_write",
      "mcp__vault-tools__log_interaction",
      "mcp__vault-tools__send_message",
    ],
    history: [
      ...history,
      { role: "user", content: message },
      {
        role: "assistant",
        content:
          "I've saved your earlier message to Inbox for later review since I didn't hear back.",
      },
    ],
  });
}
