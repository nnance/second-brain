import assert from "node:assert";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  parseExistingReminder,
  updateReminderInContent,
  vaultSetReminder,
} from "./vault-set-reminder.js";

const TEST_VAULT_PATH = process.env.VAULT_PATH || "/tmp/test-vault";

describe("vault-set-reminder-tool", () => {
  before(async () => {
    await mkdir(join(TEST_VAULT_PATH, "Tasks"), { recursive: true });
  });

  after(async () => {
    // Clean up test files
    try {
      await rm(join(TEST_VAULT_PATH, "Tasks", "test-reminder.md"), {
        force: true,
      });
      await rm(join(TEST_VAULT_PATH, "Tasks", "test-reminder-calendar.md"), {
        force: true,
      });
      await rm(join(TEST_VAULT_PATH, "Tasks", "test-reminder-mark-sent.md"), {
        force: true,
      });
      await rm(join(TEST_VAULT_PATH, "Tasks", "test-no-frontmatter.md"), {
        force: true,
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("vaultSetReminder", () => {
    it("sets a due-based reminder", async () => {
      // Create a test file
      const testFile = join(TEST_VAULT_PATH, "Tasks", "test-reminder.md");
      await writeFile(
        testFile,
        `---
created: 2026-01-14T10:00:00Z
tags:
  - test
---

# Test Note

Content here.
`,
      );

      const result = await vaultSetReminder({
        filepath: "Tasks/test-reminder.md",
        due: "2026-01-15T09:00:00Z",
      });

      assert.equal(result.success, true);
      assert.ok(result.reminder);
      assert.equal(result.reminder.due, "2026-01-15T09:00:00Z");
      assert.equal(result.reminder.sent, false);

      // Verify frontmatter was updated
      const content = await readFile(testFile, "utf-8");
      assert.ok(content.includes("reminder:"));
      assert.ok(content.includes("due: 2026-01-15T09:00:00Z"));
      assert.ok(content.includes("sent: false"));
    });

    it("sets a calendar-linked reminder", async () => {
      const testFile = join(
        TEST_VAULT_PATH,
        "Tasks",
        "test-reminder-calendar.md",
      );
      await writeFile(
        testFile,
        `---
created: 2026-01-14T10:00:00Z
---

# Meeting Prep

Prepare for meeting.
`,
      );

      const result = await vaultSetReminder({
        filepath: "Tasks/test-reminder-calendar.md",
        calendar_event: "Meeting with Sarah",
        offset: -3600, // 1 hour before
      });

      assert.equal(result.success, true);
      assert.ok(result.reminder);
      assert.equal(result.reminder.calendar_event, "Meeting with Sarah");
      assert.equal(result.reminder.offset, -3600);
      assert.equal(result.reminder.sent, false);

      const content = await readFile(testFile, "utf-8");
      assert.ok(content.includes('calendar_event: "Meeting with Sarah"'));
      assert.ok(content.includes("offset: -3600"));
    });

    it("marks a reminder as sent", async () => {
      const testFile = join(
        TEST_VAULT_PATH,
        "Tasks",
        "test-reminder-mark-sent.md",
      );
      await writeFile(
        testFile,
        `---
created: 2026-01-14T10:00:00Z
reminder:
  due: 2026-01-15T09:00:00Z
  sent: false
---

# Test Note
`,
      );

      const result = await vaultSetReminder({
        filepath: "Tasks/test-reminder-mark-sent.md",
        mark_sent: true,
      });

      assert.equal(result.success, true);
      assert.ok(result.reminder);
      assert.equal(result.reminder.sent, true);
      assert.ok(result.reminder.sent_at);
      assert.equal(result.reminder.due, "2026-01-15T09:00:00Z");

      const content = await readFile(testFile, "utf-8");
      assert.ok(content.includes("sent: true"));
      assert.ok(content.includes("sent_at:"));
    });

    it("creates frontmatter for file without one", async () => {
      const testFile = join(TEST_VAULT_PATH, "Tasks", "test-no-frontmatter.md");
      await writeFile(testFile, "# Just a Note\n\nNo frontmatter here.");

      const result = await vaultSetReminder({
        filepath: "Tasks/test-no-frontmatter.md",
        due: "2026-01-20T10:00:00Z",
      });

      assert.equal(result.success, true);

      const content = await readFile(testFile, "utf-8");
      assert.ok(content.startsWith("---\n"));
      assert.ok(content.includes("reminder:"));
      assert.ok(content.includes("# Just a Note"));
    });

    it("returns error for missing due and calendar_event", async () => {
      const result = await vaultSetReminder({
        filepath: "Tasks/test-reminder.md",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Either 'due' or 'calendar_event'"));
    });

    it("returns error for invalid due date format", async () => {
      const result = await vaultSetReminder({
        filepath: "Tasks/test-reminder.md",
        due: "next tuesday",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Invalid 'due' date format"));
    });

    it("returns error for non-existent file", async () => {
      const result = await vaultSetReminder({
        filepath: "Tasks/non-existent.md",
        due: "2026-01-15T09:00:00Z",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("File not found"));
    });

    it("returns error for directory traversal attempt", async () => {
      const result = await vaultSetReminder({
        filepath: "../../../etc/passwd",
        due: "2026-01-15T09:00:00Z",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("directory traversal"));
    });
  });

  describe("parseExistingReminder", () => {
    it("parses reminder with due date", () => {
      const content = `---
reminder:
  due: 2026-01-15T09:00:00Z
  sent: false
---

# Test`;

      const result = parseExistingReminder(content);
      assert.ok(result);
      assert.equal(result.due, "2026-01-15T09:00:00Z");
      assert.equal(result.sent, false);
    });

    it("parses calendar-linked reminder", () => {
      const content = `---
reminder:
  calendar_event: "Meeting with Sarah"
  offset: -3600
  sent: false
---

# Test`;

      const result = parseExistingReminder(content);
      assert.ok(result);
      assert.equal(result.calendar_event, "Meeting with Sarah");
      assert.equal(result.offset, -3600);
    });

    it("returns null for content without reminder", () => {
      const content = `---
created: 2026-01-14T10:00:00Z
---

# Test`;

      const result = parseExistingReminder(content);
      assert.equal(result, null);
    });
  });

  describe("updateReminderInContent", () => {
    it("adds reminder to existing frontmatter", () => {
      const content = `---
created: 2026-01-14T10:00:00Z
tags:
  - test
---

# Test`;

      const result = updateReminderInContent(content, {
        due: "2026-01-15T09:00:00Z",
        sent: false,
      });

      assert.ok(result.includes("reminder:"));
      assert.ok(result.includes("due: 2026-01-15T09:00:00Z"));
      assert.ok(result.includes("created: 2026-01-14T10:00:00Z"));
    });

    it("replaces existing reminder", () => {
      const content = `---
reminder:
  due: 2026-01-10T09:00:00Z
  sent: false
---

# Test`;

      const result = updateReminderInContent(content, {
        due: "2026-01-20T09:00:00Z",
        sent: false,
      });

      // Should only have one reminder block
      const matches = result.match(/reminder:/g);
      assert.equal(matches?.length, 1);

      assert.ok(result.includes("2026-01-20T09:00:00Z"));
      assert.ok(!result.includes("2026-01-10T09:00:00Z"));
    });
  });
});
