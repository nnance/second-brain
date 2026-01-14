import assert from "node:assert";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  parseReminderFromContent,
  vaultListReminders,
} from "./vault-list-reminders.js";

const TEST_VAULT_PATH = process.env.VAULT_PATH || "/tmp/test-vault";

describe("vault-list-reminders-tool", () => {
  before(async () => {
    await mkdir(join(TEST_VAULT_PATH, "Tasks"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Ideas"), { recursive: true });
    await mkdir(join(TEST_VAULT_PATH, "Archive"), { recursive: true });

    // Create test files with reminders
    await writeFile(
      join(TEST_VAULT_PATH, "Tasks", "reminder-due-soon.md"),
      `---
created: 2026-01-14T10:00:00Z
reminder:
  due: 2026-01-15T09:00:00Z
  sent: false
---

# Follow up with Sarah

Remember to call Sarah.
`,
    );

    await writeFile(
      join(TEST_VAULT_PATH, "Tasks", "reminder-due-later.md"),
      `---
created: 2026-01-14T10:00:00Z
reminder:
  due: 2026-01-20T09:00:00Z
  sent: false
---

# Quarterly Review

Prepare quarterly review.
`,
    );

    await writeFile(
      join(TEST_VAULT_PATH, "Tasks", "reminder-already-sent.md"),
      `---
created: 2026-01-14T10:00:00Z
reminder:
  due: 2026-01-10T09:00:00Z
  sent: true
  sent_at: 2026-01-10T09:00:00Z
---

# Old Task

Already completed.
`,
    );

    await writeFile(
      join(TEST_VAULT_PATH, "Ideas", "reminder-calendar-linked.md"),
      `---
created: 2026-01-14T10:00:00Z
reminder:
  calendar_event: "Meeting with Client"
  offset: -3600
  sent: false
---

# Meeting Prep

Prepare presentation.
`,
    );

    await writeFile(
      join(TEST_VAULT_PATH, "Tasks", "no-reminder.md"),
      `---
created: 2026-01-14T10:00:00Z
tags:
  - test
---

# Regular Note

No reminder here.
`,
    );

    // Archive folder should be excluded
    await writeFile(
      join(TEST_VAULT_PATH, "Archive", "archived-reminder.md"),
      `---
reminder:
  due: 2026-01-15T09:00:00Z
  sent: false
---

# Archived Task

Should not appear in results.
`,
    );
  });

  after(async () => {
    // Clean up test files
    const testFiles = [
      "Tasks/reminder-due-soon.md",
      "Tasks/reminder-due-later.md",
      "Tasks/reminder-already-sent.md",
      "Ideas/reminder-calendar-linked.md",
      "Tasks/no-reminder.md",
      "Archive/archived-reminder.md",
    ];
    for (const file of testFiles) {
      try {
        await rm(join(TEST_VAULT_PATH, file), { force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("vaultListReminders", () => {
    it("lists all unsent reminders", async () => {
      const result = await vaultListReminders();

      assert.equal(result.success, true);
      assert.ok(result.reminders);
      // Should have at least 3 unsent reminders (due-soon, due-later, calendar-linked)
      // May have more from other tests running in parallel
      assert.ok(
        result.reminders.length >= 3,
        `Expected at least 3 reminders, got ${result.reminders.length}`,
      );

      // Verify our known test reminders are present
      const dueSoon = result.reminders.find((r) =>
        r.filepath.includes("reminder-due-soon"),
      );
      assert.ok(dueSoon, "Should include due-soon reminder");

      const dueLater = result.reminders.find((r) =>
        r.filepath.includes("reminder-due-later"),
      );
      assert.ok(dueLater, "Should include due-later reminder");

      const calendarLinked = result.reminders.find((r) =>
        r.filepath.includes("reminder-calendar-linked"),
      );
      assert.ok(calendarLinked, "Should include calendar-linked reminder");

      // Should not include the already-sent reminder
      const sentReminder = result.reminders.find((r) =>
        r.filepath.includes("reminder-already-sent"),
      );
      assert.equal(sentReminder, undefined);

      // Should not include the archived reminder
      const archivedReminder = result.reminders.find((r) =>
        r.filepath.includes("archived-reminder"),
      );
      assert.equal(archivedReminder, undefined);
    });

    it("filters by due_before", async () => {
      const result = await vaultListReminders({
        due_before: "2026-01-16T00:00:00Z",
      });

      assert.equal(result.success, true);
      assert.ok(result.reminders);
      // Should have at least 2: due-soon (due Jan 15) and calendar-linked (no due date, included)
      assert.ok(
        result.reminders.length >= 2,
        `Expected at least 2 reminders, got ${result.reminders.length}`,
      );

      const dueSoon = result.reminders.find((r) =>
        r.filepath.includes("reminder-due-soon"),
      );
      assert.ok(dueSoon, "Should include reminder due soon");

      const calendarLinked = result.reminders.find((r) =>
        r.filepath.includes("reminder-calendar-linked"),
      );
      assert.ok(calendarLinked, "Should include calendar-linked reminder");
    });

    it("sorts by due date (soonest first)", async () => {
      const result = await vaultListReminders();

      assert.equal(result.success, true);
      assert.ok(result.reminders);
      assert.ok(result.reminders.length >= 2);

      // Due-soon (Jan 15) should come before due-later (Jan 20)
      const dueSoonIndex = result.reminders.findIndex((r) =>
        r.filepath.includes("reminder-due-soon"),
      );
      const dueLaterIndex = result.reminders.findIndex((r) =>
        r.filepath.includes("reminder-due-later"),
      );

      assert.ok(
        dueSoonIndex < dueLaterIndex,
        "Due soon should be before due later",
      );
    });

    it("respects limit parameter", async () => {
      const result = await vaultListReminders({ limit: 1 });

      assert.equal(result.success, true);
      assert.ok(result.reminders);
      assert.equal(result.reminders.length, 1);
    });

    it("excludes Archive folder", async () => {
      const result = await vaultListReminders();

      assert.equal(result.success, true);
      assert.ok(result.reminders);

      const archivedReminder = result.reminders.find((r) =>
        r.filepath.includes("Archive"),
      );
      assert.equal(archivedReminder, undefined);
    });

    it("returns error for invalid due_before format", async () => {
      const result = await vaultListReminders({
        due_before: "not a date",
      });

      assert.equal(result.success, false);
      assert.ok(result.error?.includes("Invalid 'due_before' date format"));
    });

    it("includes title in reminder info", async () => {
      const result = await vaultListReminders();

      assert.equal(result.success, true);
      assert.ok(result.reminders);

      const dueSoon = result.reminders.find((r) =>
        r.filepath.includes("reminder-due-soon"),
      );
      assert.ok(dueSoon);
      assert.equal(dueSoon.title, "Follow up with Sarah");
    });
  });

  describe("parseReminderFromContent", () => {
    it("parses due-based reminder", () => {
      const content = `---
reminder:
  due: 2026-01-15T09:00:00Z
  sent: false
---

# Test`;

      const result = parseReminderFromContent(content);
      assert.ok(result);
      assert.equal(result.due, "2026-01-15T09:00:00Z");
      assert.equal(result.sent, false);
    });

    it("parses calendar-linked reminder", () => {
      const content = `---
reminder:
  calendar_event: "Meeting"
  offset: -3600
  sent: false
---

# Test`;

      const result = parseReminderFromContent(content);
      assert.ok(result);
      assert.equal(result.calendar_event, "Meeting");
      assert.equal(result.offset, -3600);
    });

    it("returns null for content without reminder", () => {
      const content = `---
created: 2026-01-14T10:00:00Z
---

# Test`;

      const result = parseReminderFromContent(content);
      assert.equal(result, null);
    });

    it("returns null for content without frontmatter", () => {
      const content = "# Test\n\nNo frontmatter";

      const result = parseReminderFromContent(content);
      assert.equal(result, null);
    });
  });
});
