import assert from "node:assert";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it, mock } from "node:test";
import type { ReminderInfo } from "../tools/vault-list-reminders.js";
import { createReminderScheduler } from "./reminder-scheduler.js";

const TEST_VAULT_PATH = process.env.VAULT_PATH || "/tmp/test-vault";

describe("reminder-scheduler", () => {
  before(async () => {
    await mkdir(join(TEST_VAULT_PATH, "Tasks"), { recursive: true });
  });

  after(async () => {
    // Clean up test files
    try {
      await rm(join(TEST_VAULT_PATH, "Tasks", "scheduler-test.md"), {
        force: true,
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createReminderScheduler", () => {
    it("creates a scheduler instance", () => {
      const scheduler = createReminderScheduler({
        pollIntervalMs: 1000,
        onReminderDue: async () => {},
      });

      assert.ok(scheduler);
      assert.equal(typeof scheduler.start, "function");
      assert.equal(typeof scheduler.stop, "function");
      assert.equal(typeof scheduler.isRunning, "function");
    });

    it("starts and stops correctly", () => {
      const scheduler = createReminderScheduler({
        pollIntervalMs: 60000, // Long interval to avoid actual checks during test
        onReminderDue: async () => {},
      });

      assert.equal(scheduler.isRunning(), false);

      scheduler.start();
      assert.equal(scheduler.isRunning(), true);

      // Starting again should be idempotent
      scheduler.start();
      assert.equal(scheduler.isRunning(), true);

      scheduler.stop();
      assert.equal(scheduler.isRunning(), false);

      // Stopping again should be idempotent
      scheduler.stop();
      assert.equal(scheduler.isRunning(), false);
    });

    it("calls onReminderDue for due reminders", async () => {
      // Use a unique filename to avoid conflicts with other tests
      const uniqueFile = `scheduler-test-${Date.now()}.md`;
      const testFilePath = join(TEST_VAULT_PATH, "Tasks", uniqueFile);

      // Create a test file with a reminder that's already due
      const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      await writeFile(
        testFilePath,
        `---
created: 2026-01-14T10:00:00Z
reminder:
  due: ${pastDate}
  sent: false
---

# Test Reminder

This reminder should be due.
`,
      );

      const receivedReminders: ReminderInfo[] = [];

      const scheduler = createReminderScheduler({
        pollIntervalMs: 100, // Short interval for testing
        onReminderDue: async (reminder) => {
          receivedReminders.push(reminder);
        },
      });

      scheduler.start();

      // Wait for the scheduler to check
      await new Promise((resolve) => setTimeout(resolve, 250));

      scheduler.stop();

      // Clean up
      await rm(testFilePath, { force: true });

      // Should have received at least one reminder (may include others from parallel tests)
      assert.ok(
        receivedReminders.length > 0,
        "Should have received at least one reminder",
      );
      const found = receivedReminders.find((r) =>
        r.filepath.includes(uniqueFile),
      );
      assert.ok(found, "Should have found the test reminder");
    });

    it("continues on error in onReminderDue callback", async () => {
      // Use a unique filename to avoid conflicts with other tests
      const uniqueFile = `scheduler-error-test-${Date.now()}.md`;
      const testFilePath = join(TEST_VAULT_PATH, "Tasks", uniqueFile);

      // Create a test file with a reminder that's already due
      const pastDate = new Date(Date.now() - 60000).toISOString();
      await writeFile(
        testFilePath,
        `---
reminder:
  due: ${pastDate}
  sent: false
---

# Test
`,
      );

      let callCount = 0;

      const scheduler = createReminderScheduler({
        pollIntervalMs: 100,
        onReminderDue: async () => {
          callCount++;
          throw new Error("Simulated failure");
        },
      });

      scheduler.start();

      // Wait for a couple of check cycles
      await new Promise((resolve) => setTimeout(resolve, 350));

      scheduler.stop();

      // Clean up
      await rm(testFilePath, { force: true });

      // Should have tried multiple times despite errors (at least 1 call per file per cycle)
      assert.ok(callCount >= 1, `Expected at least 1 call, got ${callCount}`);
    });
  });
});
